import { FastifyRequest } from 'fastify';

export const getTenantIdFromRequest = (req: FastifyRequest): string | null => {
  const headers = req.headers as Record<string, string | undefined>;
  const tenantId = headers['x-tenant-id'];
  if (tenantId) return tenantId;

  const query = req.query as Record<string, string | undefined>;
  if (query?.tenant_id) return query.tenant_id;

  const body = req.body as Record<string, unknown> | undefined;
  if (body && typeof body.tenant_id === 'string') return body.tenant_id;

  return null;
};
