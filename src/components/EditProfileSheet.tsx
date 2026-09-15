import { useState } from 'react';
import { Camera, User, Loader2, Check, AlertCircle } from 'lucide-react';
import { BottomSheet } from '@/components/BottomSheet';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { updateUserDisplayName, updateUserPhotoURL } from '@/lib/firestore';
import { pickAndUploadProfilePhoto } from '@/lib/profilePhoto';
import { getInitials } from '@/lib/utils';

interface EditProfileSheetProps {
  open: boolean;
  onClose: () => void;
  uid: string;
  displayName: string | null;
  photoURL: string | null;
  onUpdated: () => void;
}

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
  const [error, setError] = useState<string | null>(null);

  const handlePhoto = async () => {
    setError(null);
    setUploading(true);
    try {
      const url = await pickAndUploadProfilePhoto();
      if (url) {
        setPhotoUrl(url);
      }
    } catch {
      setError('Failed to upload photo. Please try again.');
    } finally {
      setUploading(false);
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

        {error && (
          <div className="flex items-center gap-2 text-[12px] text-red-500">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            {error}
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
