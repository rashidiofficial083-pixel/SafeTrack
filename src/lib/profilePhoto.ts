import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';
import { getApps, initializeApp } from 'firebase/app';

const app = getApps().length > 0 ? getApps()[0] : initializeApp({
  apiKey: "AIzaSyBnFWolAfZPz2D0AxpkGFKJXAmphJ__lz4",
  authDomain: "safe-track-4d2e1.firebaseapp.com",
  projectId: "safe-track-4d2e1",
  storageBucket: "safe-track-4d2e1.firebasestorage.app",
  messagingSenderId: "406687971030",
  appId: "1:406687971030:web:b59c6ecb24319595d9fb77"
});

export async function pickAndUploadProfilePhoto(uid: string): Promise<string | null> {
  let photoDataUrl: string | null = null;

  if (Capacitor.isNativePlatform()) {
    const photo = await Camera.getPhoto({
      quality: 80,
      allowEditing: true,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Prompt,
      width: 512,
      height: 512,
    });
    if (!photo.dataUrl) return null;
    photoDataUrl = photo.dataUrl as string;
  } else {
    // Web fallback: use file input
    photoDataUrl = await pickPhotoWeb();
    if (!photoDataUrl) return null;
  }

  const storage = getStorage(app);
  const storageRef = ref(storage, `users/${uid}/profile.jpg`);
  const blob = dataUrlToBlob(photoDataUrl);
  await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
  const downloadUrl = await getDownloadURL(storageRef);
  return downloadUrl;
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, base64] = dataUrl.split(',');
  const mime = meta.match(/data:(.*?);/)?.[1] ?? 'image/jpeg';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

function pickPhotoWeb(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result as string);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    };
    document.body.appendChild(input);
    input.click();
    setTimeout(() => document.body.removeChild(input), 5000);
  });
}
