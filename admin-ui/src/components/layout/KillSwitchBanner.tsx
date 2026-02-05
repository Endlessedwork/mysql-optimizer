"use client";

import React, { useState, useEffect } from 'react';

interface KillSwitchBannerProps {
  className?: string;
}

const KillSwitchBanner: React.FC<KillSwitchBannerProps> = ({ className = '' }) => {
  // Mock data - in real implementation this would fetch from API
  const [killSwitchActive, setKillSwitchActive] = useState(false);
  const [killSwitchReason, setKillSwitchReason] = useState('');
  const [killSwitchTimestamp, setKillSwitchTimestamp] = useState('');

  useEffect(() => {
    // Simulate API call to fetch kill switch status
    const fetchKillSwitchStatus = () => {
      // This would be replaced with actual API call
      setKillSwitchActive(true);
      setKillSwitchReason('System maintenance required');
      setKillSwitchTimestamp('2026-02-02 10:00:00');
    };

    fetchKillSwitchStatus();
  }, []);

  if (!killSwitchActive) {
    return null;
  }

  return (
    <div className={`bg-red-600 text-white p-4 ${className}`}>
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="font-medium">Kill Switch is active</span>
        </div>
        <div className="text-sm">
          <span className="font-medium">Reason:</span> {killSwitchReason} | 
          <span className="font-medium ml-2">Timestamp:</span> {killSwitchTimestamp}
        </div>
      </div>
    </div>
  );
};

export default KillSwitchBanner;