"use client";

import { RecommendationDetail } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { RiskWarning } from '@/components/ui/RiskWarning';
import { useState } from 'react';
import { useRejectRecommendation } from '@/hooks/useRecommendations';
import { executeSingleFix } from '@/lib/api-client';
import { Play, Loader2, CheckCircle2, AlertCircle, Zap } from 'lucide-react';

interface RecommendationActionsProps {
  recommendation: RecommendationDetail;
}

export const RecommendationActions = ({ recommendation }: RecommendationActionsProps) => {
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [showApplyAllConfirm, setShowApplyAllConfirm] = useState(false);
  const [applyingAll, setApplyingAll] = useState(false);
  const [applyAllProgress, setApplyAllProgress] = useState({ current: 0, total: 0, success: 0, failed: 0 });
  const [applyAllComplete, setApplyAllComplete] = useState(false);

  const rejectMutation = useRejectRecommendation();

  const rawRecs = recommendation.rawRecommendations || [];
  const totalIssues = rawRecs.length;

  // Execute all fixes one by one
  const handleApplyAll = async () => {
    if (applyingAll) return;

    setApplyingAll(true);
    setApplyAllProgress({ current: 0, total: totalIssues, success: 0, failed: 0 });
    setApplyAllComplete(false);

    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < rawRecs.length; i++) {
      const rec = rawRecs[i];
      const fixOption = rec.fix_options?.[0];

      if (!fixOption?.implementation) {
        failedCount++;
        setApplyAllProgress(prev => ({ ...prev, current: i + 1, failed: failedCount }));
        continue;
      }

      try {
        const result = await executeSingleFix({
          recommendationPackId: recommendation.id,
          recommendationIndex: i,
          fixIndex: 0,
          sql: fixOption.implementation
        });

        if (result.ok) {
          successCount++;
        } else {
          failedCount++;
        }
      } catch (error) {
        failedCount++;
      }

      setApplyAllProgress({
        current: i + 1,
        total: totalIssues,
        success: successCount,
        failed: failedCount
      });

      // Small delay between executions to avoid overwhelming the server
      if (i < rawRecs.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    setApplyingAll(false);
    setApplyAllComplete(true);
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

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Actions</h3>
      </div>
      <div className="p-6 space-y-6">
        {/* Apply All Section */}
        <div className="bg-gradient-to-r from-teal-50 to-emerald-50 rounded-xl p-5 border border-teal-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-lg font-semibold text-teal-900 flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Apply All Fixes
              </h4>
              <p className="text-sm text-teal-700 mt-1">
                Execute all {totalIssues} recommendations at once
              </p>
            </div>
            <Button
              variant="primary"
              size="lg"
              onClick={() => setShowApplyAllConfirm(true)}
              disabled={applyingAll || totalIssues === 0}
              icon={applyingAll ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {applyingAll ? 'Applying...' : `Apply All (${totalIssues})`}
            </Button>
          </div>

          {/* Progress Bar */}
          {(applyingAll || applyAllComplete) && (
            <div className="space-y-3">
              <div className="w-full bg-teal-100 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300 ease-out bg-gradient-to-r from-teal-500 to-emerald-500"
                  style={{ width: `${applyAllProgress.total > 0 ? (applyAllProgress.current / applyAllProgress.total) * 100 : 0}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-teal-700">
                  {applyingAll ? (
                    <>Processing {applyAllProgress.current} of {applyAllProgress.total}...</>
                  ) : (
                    <>Completed {applyAllProgress.current} of {applyAllProgress.total}</>
                  )}
                </span>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="w-4 h-4" />
                    {applyAllProgress.success} success
                  </span>
                  {applyAllProgress.failed > 0 && (
                    <span className="flex items-center gap-1 text-red-600">
                      <AlertCircle className="w-4 h-4" />
                      {applyAllProgress.failed} failed
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Reject Action */}
        <div className="flex flex-wrap gap-3">
          <Button
            variant="danger"
            onClick={() => setShowRejectConfirm(true)}
            disabled={recommendation.status === 'rejected' || rejectMutation.isPending}
          >
            Reject
          </Button>
        </div>

        {/* Reject Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showRejectConfirm}
          onClose={() => setShowRejectConfirm(false)}
          onConfirm={handleReject}
          title="Reject Recommendation"
          confirmText="Reject"
          variant="danger"
          isLoading={rejectMutation.isPending}
        >
          <p>Are you sure you want to reject this recommendation?</p>
        </ConfirmDialog>

        {/* Apply All Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showApplyAllConfirm}
          onClose={() => !applyingAll && setShowApplyAllConfirm(false)}
          onConfirm={() => {
            handleApplyAll();
          }}
          title="Apply All Fixes"
          confirmText={applyingAll ? 'Applying...' : `Apply All ${totalIssues} Fixes`}
          isLoading={applyingAll}
        >
          <RiskWarning
            level="high"
            message={`This will execute ${totalIssues} DDL statements on your database. Each fix will be applied sequentially.`}
          />
          <div className="mt-4 space-y-3">
            <p className="text-slate-700">
              Are you sure you want to apply all {totalIssues} fixes?
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              <strong>Tip:</strong> You can also apply fixes individually by expanding each recommendation and clicking &quot;Apply This Fix&quot;.
            </div>
          </div>
        </ConfirmDialog>
      </div>
    </div>
  );
};