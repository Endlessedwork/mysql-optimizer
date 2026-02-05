import { FastifyInstance } from 'fastify';

// fastify-jwt has no types; use require
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fjwt = require('fastify-jwt');

export function setupAuth(app: FastifyInstance): void {
  app.register(fjwt, {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production'
  });
}
