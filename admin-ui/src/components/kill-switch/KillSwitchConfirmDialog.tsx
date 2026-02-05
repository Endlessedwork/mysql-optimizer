'use client';

import { useState } from 'react';
import RiskWarning from '@/components/ui/RiskWarning';

interface KillSwitchConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  action: 'enable' | 'disable';
  scope: 'global' | 'connection';
  reason: string;
  setReason: (reason: string) => void;
  isToggling: boolean;
  error: string | null;
}

const KillSwitchConfirmDialog: React.FC<KillSwitchConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  action,
  scope,
  reason,
  setReason,
  isToggling,
  error
}) => {
  if (!isOpen) return null;

  const actionText = action === 'enable' ? 'Enable' : 'Disable';
  const scopeText = scope === 'global' ? 'global kill switch' : 'connection kill switch';
  const warningText = action === 'enable' 
    ? `This will block all index executions for ${scopeText}`
    : `This will allow index executions to resume for ${scopeText}`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-bold mb-4">Confirm Kill Switch {actionText}</h3>
        
        <RiskWarning level="high" message={warningText} />
        
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reason for {actionText} (required)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="Please provide a reason for toggling the kill switch..."
          />
        </div>

        {error && (
          <div className="mt-4 text-red-600 text-sm">
            {error}
          </div>
        )}

        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={isToggling}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isToggling}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            {actionText} Kill Switch
          </button>
        </div>
      </div>
    </div>
  );
};

export default KillSwitchConfirmDialog;