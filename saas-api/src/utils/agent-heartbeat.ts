/**
 * In-memory agent heartbeat tracker.
 * Updated whenever Agent polls for work (scan-runs, executions/scheduled).
 * Used by GET /api/agent/status to determine Online/Offline.
 */

let lastPollAt: Date | null = null;

export function recordAgentPoll(): void {
  lastPollAt = new Date();
}

export function getLastAgentPollTime(): Date | null {
  return lastPollAt;
}
