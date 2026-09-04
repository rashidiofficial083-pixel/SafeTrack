import { useEffect, useState } from 'react';
import {
  LogOut,
  Key,
  Users,
  MapPinned,
  Sun,
  Moon,
  Copy,
  Check,
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
import { subscribeToUserProfile } from '@/lib/firestore';
import { getInitials } from '@/lib/utils';
import type { UserProfile } from '@/types';

function CodeCard({
  code,
  loading,
}: {
  code: string;
  loading: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="p-4 flex flex-col gap-3">
      <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
        <Key className="w-5 h-5 text-accent" strokeWidth={2} />
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-[13px] text-gray-500 dark:text-gray-400">
          Your code
        </span>
        {loading ? (
          <div className="h-5 w-24 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100 font-mono">
              {code}
            </span>
            <button
              onClick={handleCopy}
              className="text-gray-400 hover:text-accent transition-colors flex-shrink-0"
              aria-label="Copy code"
            >
              {copied ? (
                <Check className="w-4 h-4 text-success" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Key;
  label: string;
  value: string;
}) {
  return (
    <Card className="p-4 flex flex-col gap-3">
      <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
        <Icon className="w-5 h-5 text-accent" strokeWidth={2} />
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-[13px] text-gray-500 dark:text-gray-400">
          {label}
        </span>
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {value}
        </span>
      </div>
    </Card>
  );
}

export function HomePage() {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    setProfileLoading(true);
    const unsub = subscribeToUserProfile(user.uid, (p) => {
      setProfile(p);
      setProfileLoading(false);
    });
    return unsub;
  }, [user]);

  const trackedByCount = profile?.trackedByUids.length ?? 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f1115] pb-20">
      <div className="px-5 pt-6 max-w-sm mx-auto">
        {/* Top row: user info */}
        <div className="flex items-center gap-3 mb-6">
          <Avatar
            photoURL={user?.photoURL ?? null}
            initials={getInitials(user?.displayName ?? null)}
            size="md"
          />
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-medium text-gray-900 dark:text-gray-100 truncate">
              {user?.displayName ?? 'User'}
            </p>
            <p className="text-[13px] text-gray-500 dark:text-gray-400 truncate">
              {user?.email ?? ''}
            </p>
          </div>
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
          <button
            onClick={() => signOut()}
            className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Log out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <CodeCard
            code={profile?.secretCode ?? ''}
            loading={profileLoading}
          />
          <StatCard
            icon={Users}
            label="Tracked by"
            value={`${trackedByCount} ${trackedByCount === 1 ? 'account' : 'accounts'}`}
          />
        </div>

        {/* Incoming pairing requests */}
        <IncomingRequests />

        {/* Tracked-by transparency list */}
        <TrackedByList trackedByUids={profile?.trackedByUids ?? []} />

        {/* Track someone button */}
        <Button
          variant="outlined"
          fullWidth
          onClick={() => setSheetOpen(true)}
        >
          <MapPinned className="w-5 h-5 text-accent" />
          Track someone
        </Button>
      </div>

      <BottomNav active="home" />

      <TrackSomeoneSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        currentSecretCode={profile?.secretCode ?? ''}
      />
    </div>
  );
}
