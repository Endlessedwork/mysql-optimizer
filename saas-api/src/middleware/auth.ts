import { FastifyRequest, FastifyReply } from 'fastify';
import { getTenantIdFromRequest } from '../utils/tenant-utils';

async function validateApiSecret(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const apiSecret = request.headers['x-api-secret'] as string | undefined;
  if (!apiSecret) {
    await reply.status(401).send({ success: false, error: 'API secret is required' });
    return;
  }
  if (apiSecret !== process.env.API_SECRET) {
    await reply.status(401).send({ success: false, error: 'Invalid API secret' });
    return;
  }
}

async function validateTenant(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const tenantId = getTenantIdFromRequest(request);
  if (!tenantId) {
    await reply.status(400).send({ success: false, error: 'Tenant ID is required' });
    return;
  }
  if (tenantId !== process.env.TENANT_ID) {
    await reply.status(403).send({ success: false, error: 'Unauthorized tenant' });
    return;
  }
}

/** Fastify preHandler: ตรวจสอบ x-api-secret และ tenant (x-tenant-id / query / body) */
export async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  await validateApiSecret(request, reply);
  if (reply.sent) return;
  await validateTenant(request, reply);
}
