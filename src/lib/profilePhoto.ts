import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

const CLOUD_NAME = 'lq7o71nu';
const UPLOAD_PRESET = 'safetrack_profile';
const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

interface CloudinaryResponse {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
}

export async function pickAndUploadProfilePhoto(): Promise<string | null> {
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
    photoDataUrl = await pickPhotoWeb();
    if (!photoDataUrl) return null;
  }

  const formData = new FormData();
  formData.append('file', photoDataUrl);
  formData.append('upload_preset', UPLOAD_PRESET);

  const response = await fetch(UPLOAD_URL, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Cloudinary upload failed: ${response.status}`);
  }

  const data = (await response.json()) as CloudinaryResponse;
  return data.secure_url;
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
