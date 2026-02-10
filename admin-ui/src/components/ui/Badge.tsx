import React from 'react';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  dot?: boolean;
  pulse?: boolean;
  className?: string;
}

const variantClasses: Record<BadgeVariant, { bg: string; dot: string }> = {
  default: {
    bg: 'bg-slate-100 text-slate-600',
    dot: 'bg-slate-400',
  },
  success: {
    bg: 'bg-emerald-50 text-emerald-700',
    dot: 'bg-emerald-500',
  },
  warning: {
    bg: 'bg-amber-50 text-amber-700',
    dot: 'bg-amber-500',
  },
  error: {
    bg: 'bg-red-50 text-red-700',
    dot: 'bg-red-500',
  },
  info: {
    bg: 'bg-sky-50 text-sky-700',
    dot: 'bg-sky-500',
  },
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  children,
  dot = true,
  pulse = false,
  className = '',
}) => {
  const styles = variantClasses[variant];

  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        px-2.5 py-1
        rounded-full
        text-xs font-medium
        ${styles.bg}
        ${className}
      `}
    >
      {dot && (
        <span
          className={`
            w-1.5 h-1.5 rounded-full
            ${styles.dot}
            ${pulse ? 'animate-pulse' : ''}
          `}
        />
      )}
      {children}
    </span>
  );
};

export default Badge;
