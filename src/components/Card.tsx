import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-card border bg-white border-gray-200',
        'dark:bg-[#1a1d23] dark:border-gray-700/50',
        className
      )}
    >
      {children}
    </div>
  );
}
