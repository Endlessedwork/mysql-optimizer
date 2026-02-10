import React from 'react';

interface CardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  children,
  actions,
  className = '',
  noPadding = false,
}) => {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-card ${className}`}>
      {(title || actions) && (
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            {title && (
              <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            )}
            {subtitle && (
              <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-5'}>{children}</div>
    </div>
  );
};

// Stat Card variant for dashboard
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext?: string;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  icon,
  label,
  value,
  subtext,
  trend,
  className = '',
}) => {
  const trendColors = {
    up: 'text-emerald-600',
    down: 'text-red-600',
    neutral: 'text-slate-500',
  };

  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-card p-5 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="stat-icon">{icon}</div>
      </div>
      <div className="mt-4">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="text-2xl font-semibold text-slate-900 mt-1">{value}</p>
        {subtext && (
          <p className={`text-xs mt-1 ${trend ? trendColors[trend] : 'text-slate-500'}`}>
            {subtext}
          </p>
        )}
      </div>
    </div>
  );
};

export default Card;
export { Card, StatCard };
export type { CardProps, StatCardProps };
