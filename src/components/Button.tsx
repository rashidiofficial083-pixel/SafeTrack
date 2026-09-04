import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outlined' | 'ghost';
  fullWidth?: boolean;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  fullWidth = false,
  className,
  children,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg h-11 px-5 text-sm font-medium active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none';

  const variants = {
    primary: 'bg-accent text-black hover:bg-accent-muted',
    outlined:
      'border border-gray-300 dark:border-gray-700 bg-transparent text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800',
    ghost:
      'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
  };

  return (
    <button
      className={cn(base, variants[variant], fullWidth && 'w-full', className)}
      {...props}
    >
      {children}
    </button>
  );
}
