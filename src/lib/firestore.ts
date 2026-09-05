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
  PairingRequest,
  UserLocation,
  LocationHistoryEntry,
} from '@/types';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

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

export async function ensureUserDoc(user: AppUser): Promise<UserProfile> {
  const ref = doc(db, 'users', user.uid);
  const existing = await getDoc(ref);

  if (existing.exists()) {
    return { uid: user.uid, ...existing.data() } as UserProfile;
  }

  const secretCode = await generateUniqueCode();
  const batch = writeBatch(db);

  batch.set(ref, {
    displayName: user.displayName ?? '',
    email: user.email ?? '',
    photoURL: user.photoURL ?? '',
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

  const created = await getDoc(ref);
  return { uid: user.uid, ...created.data() } as UserProfile;
}

export function subscribeToUserProfile(
  uid: string,
  callback: (profile: UserProfile | null) => void
): Unsubscribe {
  const ref = doc(db, 'users', uid);
  return onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      callback({ uid, ...snap.data() } as UserProfile);
    } else {
      callback(null);
    }
  });
}

export async function lookupUserByCode(
  code: string
): Promise<UserProfile | null> {
  const lookupRef = doc(db, 'codeLookup', code);
  const lookupSnap = await getDoc(lookupRef);
  if (!lookupSnap.exists()) return null;

  const uid = lookupSnap.data().uid as string;
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return null;

  return { uid, ...userSnap.data() } as UserProfile;
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
      createdAt: d.data().createdAt?.seconds ?? 0,
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
      createdAt: d.data().createdAt?.seconds ?? 0,
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

  batch.update(doc(db, 'users', currentUid), {
    trackedByUids: arrayUnion(fromUid),
  });

  batch.update(doc(db, 'users', fromUid), {
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

  batch.update(doc(db, 'users', currentUid), {
    trackingUids: arrayRemove(targetUid),
  });

  batch.update(doc(db, 'users', targetUid), {
    trackedByUids: arrayRemove(currentUid),
  });

  await batch.commit();
}

export async function fetchUserProfiles(uids: string[]): Promise<UserProfile[]> {
  if (uids.length === 0) return [];
  const profiles: UserProfile[] = [];
  for (const uid of uids) {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) {
      profiles.push({ uid, ...snap.data() } as UserProfile);
    }
  }
  return profiles;
}

export async function updateLocation(
  uid: string,
  location: UserLocation
): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
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
    recordedAt: d.data().recordedAt?.seconds ?? 0,
    expireAt: d.data().expireAt?.seconds ?? 0,
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
    const unsub = onSnapshot(doc(db, 'users', uid), (snap) => {
      if (snap.exists()) {
        profilesMap.set(uid, { uid, ...snap.data() } as UserProfile);
      } else {
        profilesMap.delete(uid);
      }
      callback(
        uids
          .map((u) => profilesMap.get(u))
          .filter((p): p is UserProfile => p !== undefined)
      );
    });
    unsubscribers.push(unsub);
  });

  return () => unsubscribers.forEach((u) => u());
}

export function subscribeToUser(
  uid: string,
  callback: (profile: UserProfile | null) => void
): Unsubscribe {
  const ref = doc(db, 'users', uid);
  return onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      callback({ uid, ...snap.data() } as UserProfile);
    } else {
      callback(null);
    }
  });
}
