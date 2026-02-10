import { Agent } from './agent';
import { ExecutionPoller } from './execution-poller';
import { ScanPoller } from './scan-poller';

type Mode = 'scan' | 'execute' | 'both' | 'poll';

async function main() {
  const mode = (process.env.AGENT_MODE || 'poll') as Mode;

  console.log(`MySQL Production Optimizer Agent starting in mode: ${mode}`);

  // Handle graceful shutdown
  const pollers: { stop: () => Promise<void> }[] = [];

  process.on('SIGINT', async () => {
    console.log('Received SIGINT, shutting down...');
    for (const poller of pollers) {
      await poller.stop();
    }
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, shutting down...');
    for (const poller of pollers) {
      await poller.stop();
    }
    process.exit(0);
  });

  if (mode === 'scan') {
    // Run a single scan using env config (legacy mode)
    const agent = new Agent();
    await agent.run();
  } else if (mode === 'execute') {
    // Only run execution poller
    const poller = new ExecutionPoller();
    pollers.push(poller);
    await poller.start();
  } else if (mode === 'both') {
    // Legacy mode: single scan + execution poller
    const agent = new Agent();
    await agent.run();

    const poller = new ExecutionPoller();
    pollers.push(poller);
    await poller.start();
  } else if (mode === 'poll') {
    // NEW: Poll mode - poll for pending scans from UI + execution poller
    console.log('Starting in poll mode - will pick up scans requested from UI');

    // Start scan poller (polls API for pending scan runs)
    const scanPoller = new ScanPoller();
    pollers.push(scanPoller);

    // Start execution poller (polls API for pending executions)
    const executionPoller = new ExecutionPoller();
    pollers.push(executionPoller);

    // Run both in parallel
    await Promise.all([
      scanPoller.start(),
      executionPoller.start(),
    ]);
  }
}

main().catch((error) => {
  console.error('Agent fatal error:', error);
  process.exit(1);
});
