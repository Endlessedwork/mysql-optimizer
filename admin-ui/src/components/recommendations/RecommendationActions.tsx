"use client";

import { RecommendationDetail } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { RiskWarning } from '@/components/ui/RiskWarning';
import { useState } from 'react';
import { useApproveRecommendation, useScheduleRecommendation, useRejectRecommendation } from '@/hooks/useRecommendations';

interface RecommendationActionsProps {
  recommendation: RecommendationDetail;
}

export const RecommendationActions = ({ recommendation }: RecommendationActionsProps) => {
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  
  const approveMutation = useApproveRecommendation();
  const scheduleMutation = useScheduleRecommendation();
  const rejectMutation = useRejectRecommendation();

  const handleApprove = () => {
    approveMutation.mutate(recommendation.id, {
      onSuccess: () => {
        setShowApproveConfirm(false);
      },
      onError: (error) => {
        console.error('Failed to approve recommendation:', error);
        // In a real implementation, we would show an error message to the user
      }
    });
  };

  const handleReject = () => {
    rejectMutation.mutate(recommendation.id, {
      onSuccess: () => {
        setShowRejectConfirm(false);
      },
      onError: (error) => {
        console.error('Failed to reject recommendation:', error);
        // In a real implementation, we would show an error message to the user
      }
    });
  };

  const handleSchedule = (scheduledAt: string) => {
    scheduleMutation.mutate({ id: recommendation.id, scheduledAt }, {
      onSuccess: () => {
        setShowScheduleDialog(false);
      },
      onError: (error) => {
        console.error('Failed to schedule recommendation:', error);
        // In a real implementation, we would show an error message to the user
      }
    });
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Actions</h3>
      </div>
      <div className="p-6">
        <div className="flex flex-wrap gap-3">
          <Button 
            variant="primary" 
            onClick={() => setShowApproveConfirm(true)}
            disabled={recommendation.status !== 'pending' || approveMutation.isLoading}
          >
            Approve
          </Button>
          <Button 
            variant="secondary" 
            onClick={() => setShowScheduleDialog(true)}
            disabled={recommendation.status !== 'pending' || scheduleMutation.isLoading}
          >
            Schedule
          </Button>
          <Button 
            variant="danger" 
            onClick={() => setShowRejectConfirm(true)}
            disabled={recommendation.status !== 'pending' || rejectMutation.isLoading}
          >
            Reject
          </Button>
        </div>

        {/* Approve Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showApproveConfirm}
          onClose={() => setShowApproveConfirm(false)}
          onConfirm={handleApprove}
          title="Approve Recommendation"
          confirmText="Approve"
          isLoading={approveMutation.isLoading}
        >
          <RiskWarning 
            title="Risk Warning"
            message="This action will execute the index creation immediately. Please ensure you understand the impact before proceeding."
          />
          <p className="mt-4">Are you sure you want to approve this recommendation?</p>
        </ConfirmDialog>

        {/* Schedule Dialog */}
        <ConfirmDialog
          isOpen={showScheduleDialog}
          onClose={() => setShowScheduleDialog(false)}
          onConfirm={(e) => {
            e.preventDefault();
            const form = e.target as HTMLFormElement;
            const scheduledAt = (form.elements.namedItem('scheduledAt') as HTMLInputElement)?.value;
            if (scheduledAt) {
              handleSchedule(scheduledAt);
            }
          }}
          title="Schedule Recommendation"
          confirmText="Schedule"
          isLoading={scheduleMutation.isLoading}
        >
          <p className="mb-4">Select a date and time to schedule this recommendation:</p>
          <form>
            <input 
              type="datetime-local" 
              name="scheduledAt"
              className="border rounded-md p-2 w-full"
              required
            />
          </form>
        </ConfirmDialog>

        {/* Reject Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showRejectConfirm}
          onClose={() => setShowRejectConfirm(false)}
          onConfirm={handleReject}
          title="Reject Recommendation"
          confirmText="Reject"
          variant="danger"
          isLoading={rejectMutation.isLoading}
        >
          <p>Are you sure you want to reject this recommendation?</p>
        </ConfirmDialog>
      </div>
    </div>
  );
};