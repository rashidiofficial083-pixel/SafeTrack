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
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  secretCode: string;
  trackedByUids: string[];
  trackingUids: string[];
  location?: UserLocation;
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
