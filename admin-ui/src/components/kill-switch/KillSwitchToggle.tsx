'use client';

import { useState } from 'react';

interface KillSwitchToggleProps {
  isActive: boolean;
  connectionId?: string;
  onToggle: () => void;
}

const KillSwitchToggle: React.FC<KillSwitchToggleProps> = ({ 
  isActive, 
  connectionId,
  onToggle 
}) => {
  const toggleLabel = isActive ? 'Disable' : 'Enable';
  const toggleColor = isActive ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600';
  const toggleText = isActive ? 'Active' : 'Inactive';

  return (
    <div className="flex items-center">
      <button
        onClick={onToggle}
        className={`${toggleColor} text-white px-4 py-2 rounded-md transition-colors duration-200`}
      >
        {toggleLabel} Kill Switch
      </button>
      <span className="ml-3 text-sm font-medium">
        {toggleText}
      </span>
    </div>
  );
};

export default KillSwitchToggle;