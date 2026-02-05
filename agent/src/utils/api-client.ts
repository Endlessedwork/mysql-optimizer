import { Config } from '../config';

/**
 * Returns authentication headers for SaaS API calls.
 * All agent-to-API communication must include these headers.
 */
export function authHeaders(): Record<string, string> {
  const config = new Config();
  return {
    'Content-Type': 'application/json',
    'X-API-SECRET': config.apiKey,
    'X-Tenant-Id': process.env.TENANT_ID || '',
  };
}
