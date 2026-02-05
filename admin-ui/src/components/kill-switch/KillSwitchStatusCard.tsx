'use client';

import { useState } from 'react';

interface KillSwitchStatusCardProps {
  isActive: boolean;
  reason: string;
  activatedBy: string;
  activatedAt: string;
}

const KillSwitchStatusCard: React.FC<KillSwitchStatusCardProps> = ({ 
  isActive, 
  reason, 
  activatedBy, 
  activatedAt 
}) => {
  const statusColor = isActive ? 'border-red-500 bg-red-50' : 'border-green-500 bg-green-50';
  const statusText = isActive ? 'Active' : 'Inactive';
  const statusIcon = isActive ? (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  );

  return (
    <div className={`border-l-4 p-4 rounded-md ${statusColor}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {statusIcon}
        </div>
        <div className="ml-3">
          <p className="text-sm font-medium">
            Status: <span className={isActive ? 'text-red-800' : 'text-green-800'}>{statusText}</span>
          </p>
          <p className="text-sm mt-1">
            <span className="font-medium">Reason:</span> {reason}
          </p>
          <p className="text-sm mt-1">
            <span className="font-medium">Activated by:</span> {activatedBy}
          </p>
          <p className="text-sm mt-1">
            <span className="font-medium">Activated at:</span> {new Date(activatedAt).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default KillSwitchStatusCard;