import { FastifyInstance } from 'fastify';

const fjwt = require('fastify-jwt');

export function setupAuth(app: FastifyInstance): void {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET environment variable is required and must be at least 32 characters');
  }

  app.register(fjwt, {
    secret,
    sign: {
      algorithm: 'HS256',
      expiresIn: '8h'
    },
    verify: {
      algorithms: ['HS256']
    }
  });
}
