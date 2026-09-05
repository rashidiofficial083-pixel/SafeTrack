import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  setDoc,
  updateDoc,
  addDoc,
  onSnapshot,
  writeBatch,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type {
  AppUser,
  UserProfile,
  PublicUser,
  PairingRequest,
  UserLocation,
  LocationHistoryEntry,
} from '@/types';
import { toEpochSeconds } from '@/types';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const PRIVATE_DOC = 'data';

function generateCodeSegment(length: number): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return result;
}

function generateCode(): string {
  return `${generateCodeSegment(4)}-${generateCodeSegment(4)}`;
}

async function isCodeAvailable(code: string): Promise<boolean> {
  const lookupRef = doc(db, 'codeLookup', code);
  const snap = await getDoc(lookupRef);
  return !snap.exists();
}

export async function generateUniqueCode(maxRetries = 5): Promise<string> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const code = generateCode();
    if (await isCodeAvailable(code)) return code;
  }
  throw new Error('Could not generate a unique code after 5 attempts');
}

function privateDocRef(uid: string) {
  return doc(db, 'users', uid, 'private', PRIVATE_DOC);
}

function parseLocation(raw: any): UserLocation | undefined {
  if (!raw) return undefined;
  return {
    lat: raw.lat,
    lng: raw.lng,
    accuracy: raw.accuracy,
    heading: raw.heading ?? null,
    speed: raw.speed ?? null,
    updatedAt: toEpochSeconds(raw.updatedAt),
    isLastKnown: raw.isLastKnown ?? false,
    batteryLevel: raw.batteryLevel ?? null,
  };
}

function mergeUser(uid: string, pub: PublicUser, priv: any): UserProfile {
  return {
    uid,
    displayName: pub.displayName,
    photoURL: pub.photoURL,
    email: priv?.email ?? '',
    secretCode: priv?.secretCode ?? '',
    trackedByUids: priv?.trackedByUids ?? [],
    trackingUids: priv?.trackingUids ?? [],
    subscriptionStatus: priv?.subscriptionStatus ?? 'trial',
    location: parseLocation(priv?.location),
    createdAt: toEpochSeconds(priv?.createdAt),
  };
}

export async function ensureUserDoc(user: AppUser): Promise<UserProfile> {
  const pubRef = doc(db, 'users', user.uid);
  const privRef = privateDocRef(user.uid);
  const existingPub = await getDoc(pubRef);
  const existingPriv = await getDoc(privRef);

  if (existingPub.exists() && existingPriv.exists()) {
    return mergeUser(user.uid, existingPub.data() as PublicUser, existingPriv.data());
  }

  const secretCode = await generateUniqueCode();
  const batch = writeBatch(db);

  batch.set(pubRef, {
    displayName: user.displayName ?? '',
    photoURL: user.photoURL ?? '',
  });

  batch.set(privRef, {
    email: user.email ?? '',
    secretCode,
    trackedByUids: [],
    trackingUids: [],
    subscriptionStatus: 'trial',
    createdAt: serverTimestamp(),
  });

  batch.set(doc(db, 'codeLookup', secretCode), {
    uid: user.uid,
  });

  await batch.commit();

  const [pubSnap, privSnap] = await Promise.all([getDoc(pubRef), getDoc(privRef)]);
  return mergeUser(user.uid, pubSnap.data() as PublicUser, privSnap.data());
}

export function subscribeToUserProfile(
  uid: string,
  callback: (profile: UserProfile | null) => void
): Unsubscribe {
  const pubRef = doc(db, 'users', uid);
  const privRef = privateDocRef(uid);

  let pubData: PublicUser | null = null;
  let privData: any = null;

  const emit = () => {
    if (pubData && privData) {
      callback(mergeUser(uid, pubData, privData));
    } else if (pubData) {
      callback(null);
    }
  };

  const unsubPub = onSnapshot(pubRef, (snap) => {
    if (snap.exists()) {
      pubData = { uid, ...snap.data() } as PublicUser;
    } else {
      pubData = null;
    }
    emit();
  });

  const unsubPriv = onSnapshot(privRef, (snap) => {
    if (snap.exists()) {
      privData = snap.data();
    } else {
      privData = null;
    }
    emit();
  });

  return () => {
    unsubPub();
    unsubPriv();
  };
}

export async function lookupUserByCode(
  code: string
): Promise<PublicUser | null> {
  const lookupRef = doc(db, 'codeLookup', code);
  const lookupSnap = await getDoc(lookupRef);
  if (!lookupSnap.exists()) return null;

  const uid = lookupSnap.data().uid as string;
  const pubSnap = await getDoc(doc(db, 'users', uid));
  if (!pubSnap.exists()) return null;

  return { uid, ...pubSnap.data() } as PublicUser;
}

export async function checkExistingRequest(
  fromUid: string,
  toUid: string
): Promise<PairingRequest | null> {
  const q = query(
    collection(db, 'pairingRequests'),
    where('fromUid', '==', fromUid),
    where('toUid', '==', toUid)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  let latest: PairingRequest | null = null;
  snapshot.docs.forEach((d) => {
    const req: PairingRequest = {
      id: d.id,
      fromUid: d.data().fromUid,
      fromDisplayName: d.data().fromDisplayName,
      fromPhotoURL: d.data().fromPhotoURL ?? '',
      toUid: d.data().toUid,
      status: d.data().status,
      createdAt: toEpochSeconds(d.data().createdAt),
    };
    if (!latest || req.createdAt > latest.createdAt) {
      latest = req;
    }
  });
  return latest;
}

export async function createPairingRequest(
  fromUser: UserProfile,
  toUid: string
): Promise<void> {
  await addDoc(collection(db, 'pairingRequests'), {
    fromUid: fromUser.uid,
    fromDisplayName: fromUser.displayName,
    fromPhotoURL: fromUser.photoURL,
    toUid,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
}

export function subscribeToIncomingRequests(
  uid: string,
  callback: (requests: PairingRequest[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'pairingRequests'),
    where('toUid', '==', uid),
    where('status', '==', 'pending')
  );
  return onSnapshot(q, (snapshot) => {
    const requests = snapshot.docs.map((d) => ({
      id: d.id,
      fromUid: d.data().fromUid,
      fromDisplayName: d.data().fromDisplayName,
      fromPhotoURL: d.data().fromPhotoURL ?? '',
      toUid: d.data().toUid,
      status: d.data().status,
      createdAt: toEpochSeconds(d.data().createdAt),
    })) as PairingRequest[];
    requests.sort((a, b) => b.createdAt - a.createdAt);
    callback(requests);
  });
}

export async function approvePairingRequest(
  requestId: string,
  fromUid: string,
  currentUid: string
): Promise<void> {
  const batch = writeBatch(db);

  batch.update(doc(db, 'pairingRequests', requestId), {
    status: 'approved',
  });

  batch.update(privateDocRef(currentUid), {
    trackedByUids: arrayUnion(fromUid),
  });

  batch.update(privateDocRef(fromUid), {
    trackingUids: arrayUnion(currentUid),
  });

  await batch.commit();
}

export async function denyPairingRequest(
  requestId: string
): Promise<void> {
  await updateDoc(doc(db, 'pairingRequests', requestId), {
    status: 'denied',
  });
}

export async function stopTracking(
  currentUid: string,
  targetUid: string
): Promise<void> {
  const batch = writeBatch(db);

  batch.update(privateDocRef(currentUid), {
    trackingUids: arrayRemove(targetUid),
  });

  batch.update(privateDocRef(targetUid), {
    trackedByUids: arrayRemove(currentUid),
  });

  await batch.commit();
}

export async function fetchPublicUserProfiles(uids: string[]): Promise<PublicUser[]> {
  if (uids.length === 0) return [];
  const profiles: PublicUser[] = [];
  for (const uid of uids) {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) {
      profiles.push({ uid, ...snap.data() } as PublicUser);
    }
  }
  return profiles;
}

export async function fetchUserProfiles(uids: string[]): Promise<UserProfile[]> {
  if (uids.length === 0) return [];
  const profiles: UserProfile[] = [];
  for (const uid of uids) {
    const pubSnap = await getDoc(doc(db, 'users', uid));
    const privSnap = await getDoc(privateDocRef(uid));
    if (pubSnap.exists() && privSnap.exists()) {
      profiles.push(mergeUser(uid, pubSnap.data() as PublicUser, privSnap.data()));
    }
  }
  return profiles;
}

export async function updateLocation(
  uid: string,
  location: UserLocation
): Promise<void> {
  await updateDoc(privateDocRef(uid), {
    location: {
      lat: location.lat,
      lng: location.lng,
      accuracy: location.accuracy,
      heading: location.heading,
      speed: location.speed,
      updatedAt: serverTimestamp(),
      isLastKnown: location.isLastKnown ?? false,
      batteryLevel: location.batteryLevel ?? null,
    },
  });
}

export async function addLocationHistoryEntry(
  uid: string,
  lat: number,
  lng: number,
  accuracy: number
): Promise<void> {
  const now = new Date();
  const expireAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  await addDoc(collection(db, 'users', uid, 'locationHistory'), {
    lat,
    lng,
    accuracy,
    recordedAt: serverTimestamp(),
    expireAt: Timestamp.fromDate(expireAt),
  });
}

export async function fetchLocationHistory(
  uid: string,
  date: Date
): Promise<LocationHistoryEntry[]> {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const q = query(
    collection(db, 'users', uid, 'locationHistory'),
    where('recordedAt', '>=', Timestamp.fromDate(dayStart)),
    where('recordedAt', '<=', Timestamp.fromDate(dayEnd))
  );

  const snapshot = await getDocs(q);
  const entries = snapshot.docs.map((d) => ({
    id: d.id,
    lat: d.data().lat,
    lng: d.data().lng,
    accuracy: d.data().accuracy,
    recordedAt: toEpochSeconds(d.data().recordedAt),
    expireAt: toEpochSeconds(d.data().expireAt),
  })) as LocationHistoryEntry[];

  entries.sort((a, b) => a.recordedAt - b.recordedAt);
  return entries;
}

export function subscribeToTrackedUsers(
  uids: string[],
  callback: (profiles: UserProfile[]) => void
): Unsubscribe {
  if (uids.length === 0) {
    callback([]);
    return () => {};
  }

  const unsubscribers: Unsubscribe[] = [];
  const profilesMap = new Map<string, UserProfile>();

  uids.forEach((uid) => {
    let pubData: PublicUser | null = null;
    let privData: any = null;

    const emit = () => {
      if (pubData && privData) {
        profilesMap.set(uid, mergeUser(uid, pubData, privData));
      } else {
        profilesMap.delete(uid);
      }
      callback(
        uids
          .map((u) => profilesMap.get(u))
          .filter((p): p is UserProfile => p !== undefined)
      );
    };

    const unsubPub = onSnapshot(doc(db, 'users', uid), (snap) => {
      pubData = snap.exists() ? ({ uid, ...snap.data() } as PublicUser) : null;
      emit();
    });

    const unsubPriv = onSnapshot(privateDocRef(uid), (snap) => {
      privData = snap.exists() ? snap.data() : null;
      emit();
    });

    unsubscribers.push(unsubPub, unsubPriv);
  });

  return () => unsubscribers.forEach((u) => u());
}

export function subscribeToUser(
  uid: string,
  callback: (profile: UserProfile | null) => void
): Unsubscribe {
  return subscribeToUserProfile(uid, callback);
}
