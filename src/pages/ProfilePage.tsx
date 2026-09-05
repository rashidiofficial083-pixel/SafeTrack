import { useEffect, useState } from 'react';
import {
  Sun,
  Moon,
  LogOut,
  Key,
  Copy,
  Check,
  QrCode,
  MapPinned,
  ChevronDown,
  Eye,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { BottomNav } from '@/components/BottomNav';
import { IncomingRequests } from '@/components/IncomingRequests';
import { TrackedByList } from '@/components/TrackedByList';
import { TrackSomeoneSheet } from '@/components/TrackSomeoneSheet';
import { QRCodeModal } from '@/components/QRCodeModal';
import { SentRequests } from '@/components/SentRequests';
import { subscribeToUserProfile } from '@/lib/firestore';
import type { UserProfile } from '@/types';

export function ProfilePage() {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    setProfileLoading(true);
    const unsub = subscribeToUserProfile(user.uid, (p) => {
      setProfile(p);
      setProfileLoading(false);
    });
    return unsub;
  }, [user]);

  const secretCode = profile?.secretCode ?? '';
  const trackedByUids = profile?.trackedByUids ?? [];

  const handleCopy = async () => {
    if (!secretCode) return;
    await navigator.clipboard.writeText(secretCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const subscriptionLabel = (() => {
    const status = profile?.subscriptionStatus ?? 'trial';
    return status.charAt(0).toUpperCase() + status.slice(1);
  })();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f1115] pb-20">
      <div className="px-5 pt-6 max-w-sm mx-auto">
        {/* Theme toggle — top right */}
        <div className="flex justify-end mb-4">
          <button
            onClick={toggleTheme}
            className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Header: avatar, name, email, subscription badge */}
        <div className="flex flex-col items-center gap-2 mb-6">
          <Avatar
            photoURL={user?.photoURL ?? null}
            initials={user?.displayName
              ? user.displayName.charAt(0).toUpperCase()
              : '?'}
            size="lg"
          />
          <p className="text-[15px] font-bold text-gray-900 dark:text-gray-100 mt-1">
            {user?.displayName ?? 'User'}
          </p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            {user?.email ?? ''}
          </p>
          <span className="px-3 py-0.5 rounded-full text-[11px] font-medium bg-accent text-black">
            {subscriptionLabel}
          </span>
        </div>

        {/* Your code card */}
        <Card className="p-4 flex items-center gap-3 mb-6">
          <div className="flex-1 min-w-0">
            <span className="text-[13px] text-gray-500 dark:text-gray-400">
              Your code
            </span>
            {profileLoading ? (
              <div className="h-5 w-24 rounded animate-pulse bg-gray-200 dark:bg-gray-700 mt-1" />
            ) : (
              <p className="text-sm font-bold font-mono tracking-wider text-gray-900 dark:text-gray-100 mt-0.5">
                {secretCode}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => setQrOpen(true)}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Show QR code"
            >
              <QrCode className="w-5 h-5" />
            </button>
            <button
              onClick={handleCopy}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Copy code"
            >
              {copied ? (
                <Check className="w-5 h-5 text-success" />
              ) : (
                <Copy className="w-5 h-5" />
              )}
            </button>
          </div>
        </Card>

        {/* Pending requests (incoming) */}
        <IncomingRequests />

        {/* Sent requests */}
        {user && <SentRequests currentUid={user.uid} />}

        {/* Who is tracking you (collapsible) */}
        <TrackedByList trackedByUids={trackedByUids} />

        {/* Track someone button */}
        <Button
          variant="outlined"
          fullWidth
          onClick={() => setSheetOpen(true)}
          className="mb-6"
        >
          <MapPinned className="w-5 h-5 text-accent" />
          Track someone
        </Button>

        {/* Log out button */}
        <button
          onClick={() => signOut()}
          className="w-full h-11 flex items-center justify-center gap-2 rounded-lg border border-red-500/50 text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Log out
        </button>
      </div>

      <BottomNav active="profile" />

      <TrackSomeoneSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        currentSecretCode={secretCode}
      />

      <QRCodeModal
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        code={secretCode}
      />
    </div>
  );
}
