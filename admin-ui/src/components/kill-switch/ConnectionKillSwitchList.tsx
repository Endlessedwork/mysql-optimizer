'use client';

import { useState } from 'react';
import { KillSwitchStatus } from '@/lib/types';
import KillSwitchToggle from './KillSwitchToggle';
import KillSwitchConfirmDialog from './KillSwitchConfirmDialog';

interface ConnectionKillSwitchListProps {
  connections: { id: string; name: string }[];
  connectionStatuses: KillSwitchStatus['connections'];
}

const ConnectionKillSwitchList: React.FC<ConnectionKillSwitchListProps> = ({ 
  connections, 
  connectionStatuses 
}) => {
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [isToggling, setIsToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = async (connectionId: string) => {
    if (!reason.trim()) {
      setError('Please provide a reason for toggling the kill switch');
      return;
    }

    setIsToggling(true);
    try {
      // In a real implementation, this would call the API to toggle the kill switch
      console.log(`Toggling kill switch for connection ${connectionId} with reason: ${reason}`);
      setIsDialogOpen(false);
      setReason('');
      setSelectedConnection(null);
    } catch (err) {
      setError('Failed to toggle kill switch');
      console.error('Failed to toggle kill switch:', err);
    } finally {
      setIsToggling(false);
    }
  };

  const openDialog = (connectionId: string) => {
    setSelectedConnection(connectionId);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setReason('');
    setError(null);
  };

  const getConnectionName = (connectionId: string) => {
    const connection = connections.find(c => c.id === connectionId);
    return connection ? connection.name : connectionId;
  };

  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold mb-4">Per-Connection Kill Switches</h2>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Connection Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Database
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Kill Switch Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Reason
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {connections.map((connection) => {
              const isActive = connectionStatuses[connection.id] || false;
              return (
                <tr key={connection.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{connection.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{connection.id}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${isActive ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                      {isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {isActive ? 'Kill switch is active' : 'Kill switch is inactive'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <KillSwitchToggle 
                      isActive={isActive} 
                      connectionId={connection.id}
                      onToggle={() => openDialog(connection.id)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <KillSwitchConfirmDialog
        isOpen={isDialogOpen}
        onClose={closeDialog}
        onConfirm={() => selectedConnection && handleToggle(selectedConnection)}
        action={connectionStatuses[selectedConnection || ''] ? 'disable' : 'enable'}
        scope="connection"
        reason={reason}
        setReason={setReason}
        isToggling={isToggling}
        error={error}
      />
    </div>
  );
};

export default ConnectionKillSwitchList;