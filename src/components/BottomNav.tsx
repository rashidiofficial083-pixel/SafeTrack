import { Home, Map, User } from 'lucide-react';
import { cn } from '@/lib/utils';

type NavItem = 'home' | 'track' | 'profile';

interface BottomNavProps {
  active: NavItem;
}

const items: { key: NavItem; label: string; icon: typeof Home }[] = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'track', label: 'Track', icon: Map },
  { key: 'profile', label: 'Profile', icon: User },
];

export function BottomNav({ active }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 dark:border-gray-700/50 bg-white/95 dark:bg-[#0f1115]/95 backdrop-blur-sm">
      <div className="flex items-stretch justify-around px-2 pt-2 pb-3">
        {items.map(({ key, label, icon: Icon }) => {
          const isActive = active === key;
          return (
            <button
              key={key}
              className="flex flex-col items-center gap-1 px-6 py-1"
            >
              <Icon
                className={cn(
                  'w-5 h-5 transition-colors',
                  isActive
                    ? 'text-accent'
                    : 'text-gray-400 dark:text-gray-500'
                )}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span
                className={cn(
                  'text-[11px] font-medium transition-colors',
                  isActive
                    ? 'text-accent'
                    : 'text-gray-400 dark:text-gray-500'
                )}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
