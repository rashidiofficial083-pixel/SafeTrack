import { useState } from 'react';
import { Camera, User, Loader2, Check, AlertCircle, Upload } from 'lucide-react';
import { BottomSheet } from '@/components/BottomSheet';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { updateUserDisplayName, updateUserPhotoURL } from '@/lib/firestore';
import { pickAndUploadProfilePhoto, CloudinaryUploadError, type UploadStage } from '@/lib/profilePhoto';
import { getInitials } from '@/lib/utils';

interface EditProfileSheetProps {
  open: boolean;
  onClose: () => void;
  uid: string;
  displayName: string | null;
  photoURL: string | null;
  onUpdated: () => void;
}

const STAGE_LABELS: Record<UploadStage, string> = {
  idle: '',
  preparing: 'Preparing image…',
  uploading: 'Uploading to Cloudinary…',
  done: 'Upload complete',
};

export function EditProfileSheet({
  open,
  onClose,
  uid,
  displayName,
  photoURL,
  onUpdated,
}: EditProfileSheetProps) {
  const [name, setName] = useState(displayName ?? '');
  const [photoUrl, setPhotoUrl] = useState(photoURL);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState<UploadStage>('idle');
  const [error, setError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handlePhoto = async () => {
    setError(null);
    setUploadError(null);
    setUploading(true);
    setUploadStage('idle');
    try {
      const url = await pickAndUploadProfilePhoto((stage) => {
        setUploadStage(stage);
      });
      if (url) {
        setPhotoUrl(url);
      }
    } catch (e) {
      if (e instanceof CloudinaryUploadError) {
        const parts: string[] = [`Upload failed at "${STAGE_LABELS[e.stage] || e.stage}" step.`];
        if (e.message) parts.push(`Error: ${e.message}`);
        if (e.statusCode !== null) parts.push(`HTTP status: ${e.statusCode}`);
        if (e.responseBody) parts.push(`Cloudinary response: ${e.responseBody.slice(0, 400)}`);
        setUploadError(parts.join('\n'));
      } else {
        setUploadError(`Unexpected error: ${e instanceof Error ? e.message : String(e)}`);
      }
    } finally {
      setUploading(false);
      setUploadStage('idle');
    }
  };

  const handleSave = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError('Name must be at least 2 characters.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const changes: Promise<void>[] = [];
      if (trimmed !== (displayName ?? '')) {
        changes.push(updateUserDisplayName(uid, trimmed));
      }
      if (photoUrl !== photoURL) {
        changes.push(updateUserPhotoURL(uid, photoUrl ?? ''));
      }
      await Promise.all(changes);
      onUpdated();
      onClose();
    } catch {
      setError('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Edit profile">
      <div className="flex flex-col gap-4">
        {/* Photo section */}
        <div className="flex flex-col items-center gap-2">
          <div className="relative">
            <Avatar
              photoURL={photoUrl}
              initials={getInitials(name || null)}
              size="lg"
            />
            <button
              onClick={handlePhoto}
              disabled={uploading}
              className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-accent text-black flex items-center justify-center shadow-md hover:bg-accent-muted transition-colors disabled:opacity-60"
              aria-label="Change photo"
            >
              {uploading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Camera className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
          <button
            onClick={handlePhoto}
            disabled={uploading}
            className="text-[12px] text-accent font-medium hover:text-accent-muted transition-colors disabled:opacity-60"
          >
            {uploading ? 'Uploading…' : 'Change photo'}
          </button>

          {/* Live upload status */}
          {uploading && uploadStage !== 'idle' && (
            <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
              <Loader2 className="w-3 h-3 animate-spin" />
              {STAGE_LABELS[uploadStage]}
            </div>
          )}
          {!uploading && uploadStage === 'done' && (
            <div className="flex items-center gap-1.5 text-[11px] text-success">
              <Check className="w-3 h-3" />
              {STAGE_LABELS.done}
            </div>
          )}
        </div>

        {/* Name input */}
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Your name"
            value={name}
            maxLength={50}
            onChange={(e) => { setName(e.target.value); setError(null); }}
            className="w-full h-11 pl-9 pr-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1d23] text-[14px] text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
          />
        </div>

        {/* Generic error (name validation / save failure) */}
        {error && (
          <div className="flex items-center gap-2 text-[12px] text-red-500">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Detailed upload error — full diagnostic info visible on screen */}
        {uploadError && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/5 p-3">
            <div className="flex items-start gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <span className="text-[12px] font-semibold text-red-500">Photo upload failed</span>
            </div>
            <pre className="whitespace-pre-wrap break-words text-[11px] text-red-600 dark:text-red-400 font-mono leading-relaxed max-h-40 overflow-y-auto">
{uploadError}
            </pre>
            <button
              onClick={() => setUploadError(null)}
              className="mt-2 text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              Dismiss
            </button>
          </div>
        )}

        <Button fullWidth disabled={saving} onClick={handleSave}>
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Check className="w-4 h-4" />
              Save changes
            </>
          )}
        </Button>
      </div>
    </BottomSheet>
  );
}
