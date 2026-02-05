'use client';

import { useState } from 'react';
import { KillSwitchStatus } from '@/lib/types';
import { useToggleKillSwitch } from '@/hooks/useKillSwitch';
import KillSwitchToggle from './KillSwitchToggle';
import KillSwitchConfirmDialog from './KillSwitchConfirmDialog';
import KillSwitchStatusCard from './KillSwitchStatusCard';

interface GlobalKillSwitchProps {
  status: KillSwitchStatus;
}

const GlobalKillSwitch: React.FC<GlobalKillSwitchProps> = ({ status }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [reason, setReason] = useState('');
  const { toggle, loading, error } = useToggleKillSwitch();
  const [isToggling, setIsToggling] = useState(false);

  const handleToggle = async () => {
    if (!reason.trim()) {
      alert('Please provide a reason for toggling the kill switch');
      return;
    }

    setIsToggling(true);
    try {
      await toggle({
        connectionId: 'global',
        enabled: !status.global,
        reason
      });
      setIsDialogOpen(false);
      setReason('');
    } catch (err) {
      console.error('Failed to toggle kill switch:', err);
    } finally {
      setIsToggling(false);
    }
  };

  const openDialog = () => {
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setReason('');
  };

  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold mb-4">Global Kill Switch</h2>
      <KillSwitchStatusCard 
        isActive={status.global} 
        reason={status.global ? 'Global kill switch is active' : 'Global kill switch is inactive'} 
        activatedBy="System" 
        activatedAt={new Date().toISOString()} 
      />
      
      <div className="mt-4">
        <KillSwitchToggle 
          isActive={status.global} 
          onToggle={openDialog} 
        />
      </div>

      <KillSwitchConfirmDialog
        isOpen={isDialogOpen}
        onClose={closeDialog}
        onConfirm={handleToggle}
        action={status.global ? 'disable' : 'enable'}
        scope="global"
        reason={reason}
        setReason={setReason}
        isToggling={isToggling}
        error={error}
      />
    </div>
  );
};

export default GlobalKillSwitch;