'use client';

import { useState } from 'react';
import type { FixOption, RecommendationStep, StepStatus } from '@/lib/types';
import { CodeBlock } from '@/components/ui/CodeBlock';
import { Button } from '@/components/ui/Button';
import {
  CheckCircle2,
  Circle,
  Play,
  Loader2,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Clock,
  ArrowRight,
  SkipForward
} from 'lucide-react';

interface StepRoadmapProps {
  fixOption: FixOption;
  onExecuteStep?: (step: RecommendationStep) => Promise<void>;
  disabled?: boolean;
}

// Step status icon component
const StepStatusIcon = ({ status }: { status: StepStatus }) => {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    case 'in_progress':
      return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
    case 'ready':
      return <Play className="w-5 h-5 text-teal-500" />;
    case 'failed':
      return <AlertTriangle className="w-5 h-5 text-red-500" />;
    case 'skipped':
      return <SkipForward className="w-5 h-5 text-slate-400" />;
    default:
      return <Circle className="w-5 h-5 text-slate-300" />;
  }
};

// Step status badge
const StepStatusBadge = ({ status }: { status: StepStatus }) => {
  const config: Record<StepStatus, { bg: string; text: string; label: string }> = {
    pending: { bg: 'bg-slate-100', text: 'text-slate-600', label: 'รอดำเนินการ' },
    ready: { bg: 'bg-teal-100', text: 'text-teal-700', label: 'พร้อมทำ' },
    in_progress: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'กำลังทำ' },
    completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'เสร็จสิ้น' },
    skipped: { bg: 'bg-slate-100', text: 'text-slate-500', label: 'ข้ามไป' },
    failed: { bg: 'bg-red-100', text: 'text-red-700', label: 'ล้มเหลว' }
  };
  const c = config[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
};

// Single step row component
const StepRow = ({
  step,
  isLast,
  onExecute,
  disabled,
  executing
}: {
  step: RecommendationStep;
  isLast: boolean;
  onExecute?: () => void;
  disabled?: boolean;
  executing?: boolean;
}) => {
  const [expanded, setExpanded] = useState(step.status === 'ready');
  const canExecute = step.status === 'ready' && !disabled && !executing;

  return (
    <div className="relative">
      {/* Connector line */}
      {!isLast && (
        <div className="absolute left-[18px] top-10 bottom-0 w-0.5 bg-slate-200" />
      )}

      <div className="flex gap-3">
        {/* Status icon */}
        <div className="flex-shrink-0 pt-1 z-10 bg-white">
          <StepStatusIcon status={step.status} />
        </div>

        {/* Content */}
        <div className="flex-1 pb-6">
          {/* Header */}
          <div
            className={`flex items-center gap-2 cursor-pointer ${
              step.status === 'pending' ? 'opacity-50' : ''
            }`}
            onClick={() => setExpanded(!expanded)}
          >
            <button className="p-0.5">
              {expanded ? (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-400" />
              )}
            </button>

            <span className="text-xs font-mono text-slate-400">
              Step {step.step_number}
            </span>

            <h4 className="font-medium text-slate-900">{step.label}</h4>

            <StepStatusBadge status={step.status} />

            {step.estimated_time_sec && (
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Clock className="w-3 h-3" />
                ~{step.estimated_time_sec}s
              </span>
            )}
          </div>

          {/* Expanded content */}
          {expanded && (
            <div className="mt-3 ml-7 space-y-3">
              <p className="text-sm text-slate-600">{step.description}</p>

              {step.warning && (
                <div className="flex items-start gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{step.warning}</span>
                </div>
              )}

              {step.sql && (
                <CodeBlock
                  code={step.sql}
                  language="sql"
                  title="SQL"
                  variant={step.step_type === 'execute_fix' ? 'success' : 'default'}
                  collapsedHeight={80}
                />
              )}

              {/* Evidence if available */}
              {step.evidence && (
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                  <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Evidence Collected
                  </h5>
                  <div className="text-xs font-mono text-slate-600 overflow-auto max-h-32">
                    <pre>{JSON.stringify(step.evidence.data, null, 2)}</pre>
                  </div>
                  <div className="text-xs text-slate-400 mt-2">
                    Collected at: {new Date(step.evidence.collected_at).toLocaleString('th-TH')}
                  </div>
                </div>
              )}

              {/* Execute button for ready steps */}
              {canExecute && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onExecute?.();
                  }}
                  icon={executing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  disabled={executing}
                >
                  {executing ? 'Executing...' : `Execute Step ${step.step_number}`}
                </Button>
              )}

              {/* Timestamps */}
              {(step.started_at || step.completed_at) && (
                <div className="text-xs text-slate-400 space-y-1">
                  {step.started_at && (
                    <div>Started: {new Date(step.started_at).toLocaleString('th-TH')}</div>
                  )}
                  {step.completed_at && (
                    <div>Completed: {new Date(step.completed_at).toLocaleString('th-TH')}</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const StepRoadmap = ({ fixOption, onExecuteStep, disabled }: StepRoadmapProps) => {
  const [executingStepId, setExecutingStepId] = useState<string | null>(null);

  if (!fixOption.is_multistep || !fixOption.steps) {
    return null;
  }

  const completedSteps = fixOption.steps.filter(s => s.status === 'completed').length;
  const totalSteps = fixOption.total_steps || fixOption.steps.length;
  const progressPercent = Math.round((completedSteps / totalSteps) * 100);

  const handleExecuteStep = async (step: RecommendationStep) => {
    if (!onExecuteStep) return;

    setExecutingStepId(step.id);
    try {
      await onExecuteStep(step);
    } finally {
      setExecutingStepId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Roadmap Header */}
      <div className="bg-gradient-to-r from-teal-50 to-blue-50 rounded-lg p-4 border border-teal-100">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h4 className="font-semibold text-teal-900 flex items-center gap-2">
              <ArrowRight className="w-4 h-4" />
              Multi-Step Fix Roadmap
            </h4>
            {fixOption.roadmap && (
              <p className="text-sm text-teal-700 mt-1">
                {fixOption.roadmap.summary}
              </p>
            )}
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-teal-700">
              {completedSteps}/{totalSteps}
            </div>
            <div className="text-xs text-teal-600">steps completed</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="h-2 bg-teal-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-teal-600 mt-1">
            <span>{progressPercent}% complete</span>
            {fixOption.roadmap?.steps_preview && (
              <span className="hidden md:block">
                {fixOption.roadmap.steps_preview.join(' → ')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Steps List */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        {fixOption.steps.map((step, index) => (
          <StepRow
            key={step.id}
            step={step}
            isLast={index === fixOption.steps!.length - 1}
            onExecute={() => handleExecuteStep(step)}
            disabled={disabled}
            executing={executingStepId === step.id}
          />
        ))}
      </div>
    </div>
  );
};
