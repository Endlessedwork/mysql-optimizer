import { FastifyRequest, FastifyReply } from 'fastify';
import { timingSafeEqual } from 'crypto';
import { getTenantIdFromRequest } from '../utils/tenant-utils';

function safeCompare(a: string, b: string): boolean {
  if (!a || !b) return false;
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) {
      // Compare against itself to maintain constant time
      timingSafeEqual(bufA, bufA);
      return false;
    }
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

async function validateApiSecret(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const apiSecret = request.headers['x-api-secret'] as string | undefined;
  if (!apiSecret) {
    await reply.status(401).send({ success: false, error: 'API secret is required' });
    return;
  }
  const expectedSecret = process.env.API_SECRET;
  if (!expectedSecret) {
    await reply.status(500).send({ success: false, error: 'Server misconfiguration' });
    return;
  }
  if (!safeCompare(apiSecret, expectedSecret)) {
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
  const expectedTenantId = process.env.TENANT_ID;
  if (!expectedTenantId) {
    await reply.status(500).send({ success: false, error: 'Server misconfiguration' });
    return;
  }
  if (tenantId !== expectedTenantId) {
    await reply.status(403).send({ success: false, error: 'Unauthorized tenant' });
    return;
  }
}

/** Fastify preHandler: validate x-api-secret and tenant */
export async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  await validateApiSecret(request, reply);
  if (reply.sent) return;
  await validateTenant(request, reply);
}
