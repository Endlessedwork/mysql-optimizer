import { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';

/**
 * CORS plugin configuration
 */
export async function corsPlugin(fastify: FastifyInstance) {
  // Get CORS origin from environment variable
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3050';

  // Parse multiple origins if comma-separated
  const allowedOrigins = corsOrigin.split(',').map((origin) => origin.trim());

  await fastify.register(cors, {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        callback(null, true);
        return;
      }

      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        fastify.log.warn(`CORS blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'), false);
      }
    },
    credentials: true, // Allow cookies
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
    ],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
    maxAge: 86400, // 24 hours - how long browser can cache preflight response
  });

  fastify.log.info(`CORS plugin registered with origins: ${allowedOrigins.join(', ')}`);
}
