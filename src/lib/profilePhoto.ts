import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

const CLOUD_NAME = 'lq7o71nu';
const UPLOAD_PRESET = 'safetrack_profile';
const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
const UPLOAD_TIMEOUT_MS = 15_000;

interface CloudinaryResponse {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
}

export type UploadStage = 'preparing' | 'uploading' | 'done' | 'idle';

export interface UploadResult {
  url: string;
}

export class CloudinaryUploadError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number | null,
    public readonly responseBody: string | null,
    public readonly stage: UploadStage
  ) {
    super(message);
    this.name = 'CloudinaryUploadError';
  }
}

export async function pickAndUploadProfilePhoto(
  onStage?: (stage: UploadStage) => void
): Promise<string | null> {
  onStage?.('preparing');
  let photoDataUrl: string | null = null;

  try {
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
  } catch (e) {
    onStage?.('idle');
    throw new CloudinaryUploadError(
      `Failed to capture/pick photo: ${e instanceof Error ? e.message : String(e)}`,
      null,
      null,
      'preparing'
    );
  }

  onStage?.('uploading');

  const formData = new FormData();
  formData.append('file', photoDataUrl);
  formData.append('upload_preset', UPLOAD_PRESET);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(UPLOAD_URL, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timeoutId);
    onStage?.('idle');
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new CloudinaryUploadError(
        `Upload timed out after ${UPLOAD_TIMEOUT_MS / 1000}s — no response from Cloudinary.`,
        null,
        null,
        'uploading'
      );
    }
    throw new CloudinaryUploadError(
      `Network error during upload: ${e instanceof Error ? e.message : String(e)}`,
      null,
      null,
      'uploading'
    );
  }
  clearTimeout(timeoutId);

  if (!response.ok) {
    let bodyText: string | null = null;
    try {
      bodyText = await response.text();
    } catch {
      bodyText = '(could not read response body)';
    }
    onStage?.('idle');
    throw new CloudinaryUploadError(
      `Cloudinary returned HTTP ${response.status} ${response.statusText}`,
      response.status,
      bodyText,
      'uploading'
    );
  }

  let data: CloudinaryResponse;
  try {
    data = (await response.json()) as CloudinaryResponse;
  } catch (e) {
    onStage?.('idle');
    throw new CloudinaryUploadError(
      `Could not parse Cloudinary response as JSON: ${e instanceof Error ? e.message : String(e)}`,
      response.status,
      null,
      'uploading'
    );
  }

  if (!data.secure_url) {
    onStage?.('idle');
    throw new CloudinaryUploadError(
      'Cloudinary response did not contain secure_url field.',
      response.status,
      JSON.stringify(data).slice(0, 500),
      'uploading'
    );
  }

  onStage?.('done');
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
    setTimeout(() => {
      if (input.parentNode) document.body.removeChild(input);
    }, 5000);
  });
}
