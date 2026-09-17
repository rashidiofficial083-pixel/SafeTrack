import { useState, useEffect, useRef } from 'react';
import { Loader2, Pencil, X, Check } from 'lucide-react';
import { BottomSheet } from '@/components/BottomSheet';
import { Avatar } from '@/components/Avatar';
import { setContactOverride, clearContactOverride } from '@/lib/firestore';
import { getInitials } from '@/lib/utils';

interface NicknameSheetProps {
  open: boolean;
  onClose: () => void;
  viewerUid: string;
  subjectUid: string;
  subjectDisplayName: string | null;
  subjectPhotoURL: string | null;
  currentNickname: string;
}

export function NicknameSheet({
  open,
  onClose,
  viewerUid,
  subjectUid,
  subjectDisplayName,
  subjectPhotoURL,
  currentNickname,
}: NicknameSheetProps) {
  const [value, setValue] = useState(currentNickname);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setValue(currentNickname);
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open, currentNickname]);

  const handleSave = async () => {
    const trimmed = value.trim();
    if (trimmed.length > 40) {
      setError('Nickname must be 40 characters or less.');
      return;
    }
    setSaving(true);
    try {
      if (trimmed) {
        await setContactOverride(viewerUid, subjectUid, { nickname: trimmed });
      } else {
        await clearContactOverride(viewerUid, subjectUid);
      }
      onClose();
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setSaving(true);
    try {
      await clearContactOverride(viewerUid, subjectUid);
      onClose();
    } catch {
      setError('Failed to remove. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Set nickname">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
        className="flex flex-col gap-4"
      >
        <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-[#0f1115]">
          <Avatar
            photoURL={subjectPhotoURL}
            initials={getInitials(subjectDisplayName)}
            size="md"
          />
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-gray-900 dark:text-gray-100 truncate">
              {subjectDisplayName ?? 'Unknown'}
            </p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
              Only visible to you
            </p>
          </div>
        </div>

        <div className="relative">
          <Pencil className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Enter a nickname…"
            value={value}
            maxLength={40}
            enterKeyHint="done"
            onChange={(e) => { setValue(e.target.value); setError(null); }}
            className="w-full h-11 pl-9 pr-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1d23] text-[14px] text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
          />
          {value && (
            <button
              type="button"
              onClick={() => setValue('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {error && (
          <p className="text-[12px] text-red-500 -mt-2">{error}</p>
        )}

        <div className="flex gap-2 pb-[env(safe-area-inset-bottom)]">
          {currentNickname && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={saving}
              className="h-11 px-4 rounded-xl border border-gray-300 dark:border-gray-700 text-[13px] font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              Remove
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl bg-accent text-black text-[14px] font-semibold hover:bg-accent-muted disabled:opacity-60 transition-colors"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Check className="w-4 h-4" />
                Save
              </>
            )}
          </button>
        </div>
      </form>
    </BottomSheet>
  );
}
