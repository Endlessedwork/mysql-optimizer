import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth';
import { 
  getRecommendations, 
  getRecommendationById, 
  approveRecommendation, 
  scheduleRecommendation, 
  rejectRecommendation 
} from '../models/recommendations.model';

export default async function recommendationsRoutes(fastify: FastifyInstance) {
  // GET /api/recommendations - List recommendations (with filters)
  fastify.get('/api/recommendations', {
    preHandler: [authenticate],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          connectionId: { type: 'string' },
          status: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  connectionId: { type: 'string' },
                  status: { type: 'string' },
                  createdAt: { type: 'string' },
                  updatedAt: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { connectionId, status } = request.query as any;
      const recommendations = await getRecommendations({ connectionId, status });
      return {
        success: true,
        data: recommendations
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch recommendations'
      });
    }
  });

  // GET /api/recommendations/:id - Get recommendation detail
  fastify.get('/api/recommendations/:id', {
    preHandler: [authenticate],
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                connectionId: { type: 'string' },
                status: { type: 'string' },
                createdAt: { type: 'string' },
                updatedAt: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const recommendation = await getRecommendationById(id);
      
      if (!recommendation) {
        return reply.status(404).send({
          success: false,
          error: 'Recommendation not found'
        });
      }
      
      return {
        success: true,
        data: recommendation
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch recommendation'
      });
    }
  });

  // POST /api/recommendations/:id/approve - Approve recommendation
  fastify.post('/api/recommendations/:id/approve', {
    preHandler: [authenticate],
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                status: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      
      // ตรวจสอบว่า recommendation มีอยู่จริงหรือไม่
      const recommendation = await getRecommendationById(id);
      if (!recommendation) {
        return reply.status(404).send({
          success: false,
          error: 'Recommendation not found'
        });
      }
      
      // ตรวจสอบว่า status สามารถ approve ได้หรือไม่
      if (recommendation.status !== 'pending') {
        return reply.status(400).send({
          success: false,
          error: 'Recommendation is not in pending status'
        });
      }
      
      const result = await approveRecommendation(id);
      
      if (!result) {
        return reply.status(404).send({
          success: false,
          error: 'Failed to approve recommendation'
        });
      }
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to approve recommendation'
      });
    }
  });

  // POST /api/recommendations/:id/schedule - Schedule recommendation
  fastify.post('/api/recommendations/:id/schedule', {
    preHandler: [authenticate],
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          scheduledAt: { type: 'string' },
          reason: { type: 'string' }
        },
        required: ['scheduledAt']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                status: { type: 'string' },
                scheduledAt: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { scheduledAt, reason } = request.body as { scheduledAt: string; reason?: string };
      
      // ตรวจสอบว่า recommendation มีอยู่จริงหรือไม่
      const recommendation = await getRecommendationById(id);
      if (!recommendation) {
        return reply.status(404).send({
          success: false,
          error: 'Recommendation not found'
        });
      }
      
      // ตรวจสอบว่า status สามารถ schedule ได้หรือไม่
      if (recommendation.status !== 'approved') {
        return reply.status(400).send({
          success: false,
          error: 'Recommendation is not in approved status'
        });
      }
      
      const result = await scheduleRecommendation(id, scheduledAt, reason);
      
      if (!result) {
        return reply.status(404).send({
          success: false,
          error: 'Failed to schedule recommendation'
        });
      }
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to schedule recommendation'
      });
    }
  });

  // POST /api/recommendations/:id/reject - Reject recommendation
  fastify.post('/api/recommendations/:id/reject', {
    preHandler: [authenticate],
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          reason: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                status: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { reason } = request.body as { reason?: string };
      
      // ตรวจสอบว่า recommendation มีอยู่จริงหรือไม่
      const recommendation = await getRecommendationById(id);
      if (!recommendation) {
        return reply.status(404).send({
          success: false,
          error: 'Recommendation not found'
        });
      }
      
      // ตรวจสอบว่า status สามารถ reject ได้หรือไม่
      if (!['pending', 'approved'].includes(recommendation.status)) {
        return reply.status(400).send({
          success: false,
          error: 'Recommendation is not in a valid status for rejection'
        });
      }
      
      const result = await rejectRecommendation(id, reason);
      
      if (!result) {
        return reply.status(404).send({
          success: false,
          error: 'Failed to reject recommendation'
        });
      }
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to reject recommendation'
      });
    }
  });
}