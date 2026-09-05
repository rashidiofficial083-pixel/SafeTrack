import type { User } from 'firebase/auth';
import type { Timestamp } from 'firebase/firestore';

export interface AppUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export function toAppUser(user: User): AppUser {
  return {
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
  };
}

export function toEpochSeconds(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && value !== null) {
    const ts = value as Partial<Timestamp>;
    if (typeof ts.seconds === 'number') return ts.seconds;
    if (typeof ts.toMillis === 'function') return ts.toMillis() / 1000;
  }
  return 0;
}

export interface UserLocation {
  lat: number;
  lng: number;
  accuracy: number;
  heading: number | null;
  speed: number | null;
  updatedAt: number;
  isLastKnown?: boolean;
  batteryLevel?: number | null;
}

export type SubscriptionStatus = 'trial' | 'premium' | 'free';

export interface PublicUser {
  uid: string;
  displayName: string;
  photoURL: string;
}

export interface PrivateUserData {
  secretCode: string;
  trackedByUids: string[];
  trackingUids: string[];
  subscriptionStatus: SubscriptionStatus;
  location?: UserLocation;
  email: string;
  createdAt: number;
}

export interface UserProfile extends PublicUser, PrivateUserData {}

export type PairingRequestStatus = 'pending' | 'approved' | 'denied';

export interface PairingRequest {
  id: string;
  fromUid: string;
  fromDisplayName: string;
  fromPhotoURL: string;
  toUid: string;
  status: PairingRequestStatus;
  createdAt: number;
}

export interface LocationHistoryEntry {
  id: string;
  lat: number;
  lng: number;
  accuracy: number;
  recordedAt: number;
  expireAt: number;
}
