"use client";

import Button from '@/components/ui/Button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import RiskWarning from '@/components/ui/RiskWarning';
import { Connection } from '@/lib/types';
import { useUpdateConnectionStatus } from '@/hooks/useConnections';
import { useState } from 'react';

interface ConnectionActionsProps {
  connection: Connection;
}

export const ConnectionActions = ({ connection }: ConnectionActionsProps) => {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [action, setAction] = useState<'enable' | 'disable' | null>(null);
  const updateStatusMutation = useUpdateConnectionStatus();

  const handleConfirm = () => {
    if (action) {
      updateStatusMutation.mutate({
        id: connection.id,
        status: action === 'disable' ? 'disabled' : 'active'
      });
      setIsConfirmOpen(false);
      setAction(null);
    }
  };

  const handleAction = (actionType: 'enable' | 'disable') => {
    setAction(actionType);
    setIsConfirmOpen(true);
  };

  return (
    <div className="flex space-x-2">
      {connection.status === 'active' ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleAction('disable')}
          disabled={updateStatusMutation.isLoading}
        >
          Disable
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleAction('enable')}
          disabled={updateStatusMutation.isLoading}
        >
          Enable
        </Button>
      )}
      
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirm}
        title={action === 'disable' ? 'Disable Connection' : 'Enable Connection'}
        confirmText={action === 'disable' ? 'Disable' : 'Enable'}
        cancelText="Cancel"
        isLoading={updateStatusMutation.isLoading}
      >
        <RiskWarning level="high" message={
          action === 'disable' 
            ? 'การปิดใช้งาน connection จะหยุดการ optimize สำหรับ connection นี้ คุณแน่ใจหรือไม่?'
            : 'การเปิดใช้งาน connection จะเริ่มต้นการ optimize สำหรับ connection นี้ คุณแน่ใจหรือไม่?'
        } />
      </ConfirmDialog>
    </div>
  );
};