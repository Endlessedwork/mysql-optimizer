'use client';

import React, { useState, useEffect } from 'react';
import { getKillSwitchStatus } from '@/lib/api-client';
import { AlertTriangle } from 'lucide-react';

interface KillSwitchBannerProps {
  className?: string;
}

const KillSwitchBanner: React.FC<KillSwitchBannerProps> = ({ className = '' }) => {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await getKillSwitchStatus();
        if (!res.ok || !res.data) return;
        setActive(Boolean(res.data.global));
      } catch {
        setActive(false);
      }
    };
    fetchStatus();
  }, []);

  if (!active) return null;

  return (
    <div className={`bg-red-600 ${className}`}>
      <div className="px-6 py-3 flex items-center gap-3">
        <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
          <AlertTriangle className="w-4 h-4 text-white" />
        </div>
        <span className="text-sm font-medium text-white">
          Global Kill Switch is active — All automatic executions are paused
        </span>
      </div>
    </div>
  );
};

export default KillSwitchBanner;
