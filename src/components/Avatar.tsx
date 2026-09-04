import { cn } from '@/lib/utils';

interface AvatarProps {
  photoURL: string | null;
  initials: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Avatar({ photoURL, initials, size = 'md' }: AvatarProps) {
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-20 h-20 text-2xl',
  };

  if (photoURL) {
    return (
      <img
        src={photoURL}
        alt={initials}
        referrerPolicy="no-referrer"
        className={cn(
          'rounded-full object-cover flex-shrink-0',
          sizes[size]
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        'rounded-full bg-accent text-black font-medium flex items-center justify-center flex-shrink-0',
        sizes[size]
      )}
    >
      {initials}
    </div>
  );
}
