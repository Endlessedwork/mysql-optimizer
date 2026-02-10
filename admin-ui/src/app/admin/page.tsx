'use client';

import { useConnections } from '@/hooks/useConnections';
import { useRecommendations } from '@/hooks/useRecommendations';
import { useExecutions } from '@/hooks/useExecutions';
import { useKillSwitchStatus } from '@/hooks/useKillSwitch';
import { Card, StatCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import Link from 'next/link';
import {
  Database,
  Lightbulb,
  Play,
  ShieldOff,
  Plus,
  ClipboardCheck,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';

export default function AdminDashboard() {
  const { data: connections, isLoading: connectionsLoading } = useConnections();
  const { data: recommendations, isLoading: recommendationsLoading } = useRecommendations();
  const { data: executions, isLoading: executionsLoading } = useExecutions();
  const { globalStatus, loading: killSwitchLoading } = useKillSwitchStatus();

  const isLoading =
    connectionsLoading || recommendationsLoading || executionsLoading || killSwitchLoading;

  // Calculate stats
  const activeConnections = connections?.filter((c) => c.status === 'active').length || 0;
  const totalConnections = connections?.length || 0;

  const pendingRecommendations =
    recommendations?.filter((r) => r.status === 'pending').length || 0;
  const totalRecommendations = recommendations?.length || 0;

  const completedExecutions = executions?.filter((e) => e.status === 'completed').length || 0;
  const failedExecutions = executions?.filter((e) => e.status === 'failed').length || 0;
  const totalExecutions = executions?.length || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" label="Loading dashboard..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          MySQL Production Optimizer Overview
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <Link href="/admin/connections" className="block">
          <StatCard
            icon={<Database className="w-5 h-5" />}
            label="Connections"
            value={totalConnections}
            subtext={`${activeConnections} active`}
            trend="neutral"
            className="hover:shadow-card-hover transition-shadow cursor-pointer"
          />
        </Link>

        <Link href="/admin/recommendations" className="block">
          <StatCard
            icon={<Lightbulb className="w-5 h-5" />}
            label="Recommendations"
            value={totalRecommendations}
            subtext={pendingRecommendations > 0 ? `${pendingRecommendations} pending review` : 'All reviewed'}
            trend={pendingRecommendations > 0 ? 'neutral' : 'up'}
            className="hover:shadow-card-hover transition-shadow cursor-pointer"
          />
        </Link>

        <Link href="/admin/executions" className="block">
          <StatCard
            icon={<Play className="w-5 h-5" />}
            label="Executions"
            value={totalExecutions}
            subtext={
              failedExecutions > 0
                ? `${failedExecutions} failed`
                : `${completedExecutions} completed`
            }
            trend={failedExecutions > 0 ? 'down' : 'up'}
            className="hover:shadow-card-hover transition-shadow cursor-pointer"
          />
        </Link>

        <Link href="/admin/kill-switch" className="block">
          <div
            className={`bg-white rounded-xl border shadow-card p-5 hover:shadow-card-hover transition-shadow cursor-pointer ${
              globalStatus ? 'border-red-200' : 'border-slate-200'
            }`}
          >
            <div className="flex items-start justify-between">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  globalStatus ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                }`}
              >
                <ShieldOff className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-slate-500">Kill Switch</p>
              <p
                className={`text-2xl font-semibold mt-1 ${
                  globalStatus ? 'text-red-600' : 'text-slate-900'
                }`}
              >
                {globalStatus ? 'Active' : 'Inactive'}
              </p>
              <p
                className={`text-xs mt-1 ${
                  globalStatus ? 'text-red-600' : 'text-emerald-600'
                }`}
              >
                {globalStatus ? 'Operations paused' : 'Running normally'}
              </p>
            </div>
          </div>
        </Link>
      </div>

      {/* Quick Actions */}
      <Card title="Quick Actions" subtitle="Common tasks you can perform">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/admin/connections"
            className="group flex items-center p-4 rounded-lg border border-slate-200 hover:border-teal-200 hover:bg-teal-50/50 transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600 group-hover:bg-teal-100 transition-colors">
              <Plus className="w-5 h-5" />
            </div>
            <div className="ml-4 flex-1">
              <p className="font-medium text-slate-900">Add Connection</p>
              <p className="text-sm text-slate-500">Connect a new MySQL database</p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-teal-500 transition-colors" />
          </Link>

          <Link
            href="/admin/recommendations"
            className="group flex items-center p-4 rounded-lg border border-slate-200 hover:border-teal-200 hover:bg-teal-50/50 transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 group-hover:bg-amber-100 transition-colors">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div className="ml-4 flex-1">
              <p className="font-medium text-slate-900">Review Recommendations</p>
              <p className="text-sm text-slate-500">
                {pendingRecommendations > 0
                  ? `${pendingRecommendations} pending approval`
                  : 'No pending items'}
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-teal-500 transition-colors" />
          </Link>

          <Link
            href="/admin/kill-switch"
            className="group flex items-center p-4 rounded-lg border border-slate-200 hover:border-teal-200 hover:bg-teal-50/50 transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center text-red-600 group-hover:bg-red-100 transition-colors">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="ml-4 flex-1">
              <p className="font-medium text-slate-900">Kill Switch Control</p>
              <p className="text-sm text-slate-500">Emergency stop controls</p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-teal-500 transition-colors" />
          </Link>
        </div>
      </Card>

      {/* Recent Activity - Placeholder */}
      {pendingRecommendations > 0 && (
        <Card
          title="Attention Required"
          actions={
            <Link href="/admin/recommendations">
              <Button variant="ghost" size="sm">
                View all
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          }
        >
          <div className="flex items-center gap-4 p-4 bg-amber-50 rounded-lg border border-amber-100">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-900">
                {pendingRecommendations} recommendation{pendingRecommendations > 1 ? 's' : ''} pending
                review
              </p>
              <p className="text-sm text-slate-500">
                Review and approve optimization suggestions
              </p>
            </div>
            <Link href="/admin/recommendations">
              <Button size="sm">Review Now</Button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
