import type { User } from 'firebase/auth';

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

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  secretCode: string;
  trackedByUids: string[];
  trackingUids: string[];
  location?: UserLocation;
  subscriptionStatus: SubscriptionStatus;
  createdAt: number;
}

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
