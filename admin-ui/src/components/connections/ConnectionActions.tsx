'use client';

import ConfirmDialog from '@/components/ui/ConfirmDialog';
import RiskWarning from '@/components/ui/RiskWarning';
import { Connection } from '@/lib/types';
import {
  useUpdateConnectionStatus,
  useDeleteConnection,
  useRequestConnectionScan,
} from '@/hooks/useConnections';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Pencil,
  Trash2,
  Play,
  Power,
  PowerOff,
  Loader2,
  CheckCircle,
  XCircle,
  ArrowRight,
  Database,
} from 'lucide-react';

interface ConnectionActionsProps {
  connection: Connection;
  onStatusChange?: () => void;
  onEdit?: (connection: Connection) => void;
}

export const ConnectionActions = ({
  connection,
  onStatusChange,
  onEdit,
}: ConnectionActionsProps) => {
  const router = useRouter();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [action, setAction] = useState<'enable' | 'disable' | 'delete' | null>(null);
  const [scanResult, setScanResult] = useState<{
    show: boolean;
    success: boolean;
    message: string;
  }>({ show: false, success: false, message: '' });
  const updateStatusMutation = useUpdateConnectionStatus();
  const deleteMutation = useDeleteConnection();
  const scanMutation = useRequestConnectionScan();

  const handleConfirm = () => {
    if (action === 'delete') {
      deleteMutation.mutate(connection.id, {
        onSuccess: () => {
          setIsConfirmOpen(false);
          setAction(null);
          onStatusChange?.();
        },
      });
      return;
    }
    if (action === 'enable' || action === 'disable') {
      updateStatusMutation.mutate(
        {
          id: connection.id,
          status: action === 'disable' ? 'disabled' : 'active',
        },
        {
          onSuccess: () => {
            onStatusChange?.();
          },
        }
      );
      setIsConfirmOpen(false);
      setAction(null);
    }
  };

  const handleAction = (actionType: 'enable' | 'disable' | 'delete') => {
    setAction(actionType);
    setIsConfirmOpen(true);
  };

  const handleScan = () => {
    scanMutation.mutate(connection.id, {
      onSuccess: () => {
        setScanResult({
          show: true,
          success: true,
          message: `Scan queued for "${connection.name}". The agent will pick it up and analyze your database. You can monitor progress in Scans page.`,
        });
        onStatusChange?.();
      },
      onError: (err) => {
        setScanResult({
          show: true,
          success: false,
          message: err instanceof Error ? err.message : 'Failed to request scan',
        });
      },
    });
  };

  const handleCloseScanResult = () => {
    setScanResult({ show: false, success: false, message: '' });
  };

  const handleGoToScans = () => {
    setScanResult({ show: false, success: false, message: '' });
    router.push('/admin/scans');
  };

  const isPending =
    updateStatusMutation.isPending ||
    deleteMutation.isPending ||
    scanMutation.isPending;

  // Icon button base style
  const iconBtnClass =
    'w-8 h-8 flex items-center justify-center rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <div className="flex items-center gap-1">
      {/* Edit */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onEdit?.(connection);
        }}
        disabled={isPending}
        className={`${iconBtnClass} text-slate-500 hover:text-teal-600 hover:bg-teal-50`}
        title="Edit"
      >
        <Pencil className="w-4 h-4" />
      </button>

      {/* View Schema */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          router.push(`/admin/connections/${connection.id}/schema`);
        }}
        className={`${iconBtnClass} text-slate-500 hover:text-violet-600 hover:bg-violet-50`}
        title="View Schema"
      >
        <Database className="w-4 h-4" />
      </button>

      {/* Run Scan */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleScan();
        }}
        disabled={isPending}
        className={`${iconBtnClass} text-slate-500 hover:text-teal-600 hover:bg-teal-50`}
        title="Run Scan"
      >
        {scanMutation.isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Play className="w-4 h-4" />
        )}
      </button>

      {/* Enable/Disable */}
      {connection.status === 'active' ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleAction('disable');
          }}
          disabled={isPending}
          className={`${iconBtnClass} text-slate-500 hover:text-amber-600 hover:bg-amber-50`}
          title="Disable"
        >
          <PowerOff className="w-4 h-4" />
        </button>
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleAction('enable');
          }}
          disabled={isPending}
          className={`${iconBtnClass} text-slate-500 hover:text-emerald-600 hover:bg-emerald-50`}
          title="Enable"
        >
          <Power className="w-4 h-4" />
        </button>
      )}

      {/* Delete */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleAction('delete');
        }}
        disabled={isPending}
        className={`${iconBtnClass} text-slate-400 hover:text-red-600 hover:bg-red-50`}
        title="Delete"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      {/* Scan Result Dialog */}
      {scanResult.show && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="absolute inset-0 bg-black/50"
            onClick={handleCloseScanResult}
          />
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex flex-col items-center text-center">
              {scanResult.success ? (
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                  <CheckCircle className="w-8 h-8 text-emerald-600" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                  <XCircle className="w-8 h-8 text-red-600" />
                </div>
              )}
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {scanResult.success ? 'Scan Requested' : 'Scan Failed'}
              </h3>
              <p className="text-sm text-slate-600 mb-6">
                {scanResult.message}
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={handleCloseScanResult}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Close
                </button>
                {scanResult.success && (
                  <button
                    onClick={handleGoToScans}
                    className="flex-1 px-4 py-2.5 rounded-lg bg-teal-600 text-sm font-medium text-white hover:bg-teal-700 transition-colors flex items-center justify-center gap-2"
                  >
                    View Scan Progress
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => {
          setIsConfirmOpen(false);
          setAction(null);
        }}
        onConfirm={handleConfirm}
        title={
          action === 'delete'
            ? 'Delete Connection'
            : action === 'disable'
            ? 'Disable Connection'
            : 'Enable Connection'
        }
        description=""
        confirmText={
          action === 'delete' ? 'Delete' : action === 'disable' ? 'Disable' : 'Enable'
        }
        isLoading={
          action === 'delete' ? deleteMutation.isPending : updateStatusMutation.isPending
        }
      >
        <RiskWarning
          level={action === 'delete' ? 'high' : 'medium'}
          message={
            action === 'delete'
              ? `Deleting "${connection.name}" will permanently remove this connection. Are you sure?`
              : action === 'disable'
              ? 'Disabling this connection will stop all optimization operations for it.'
              : 'Enabling this connection will start optimization operations for it.'
          }
        />
      </ConfirmDialog>
    </div>
  );
};
