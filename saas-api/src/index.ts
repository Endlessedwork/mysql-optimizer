import fastify from 'fastify';
import 'dotenv/config';
import { connectDB } from './database';
import registerRoutes from './routes';
import { setupAuth } from './auth';
import { setupRBAC } from './rbac';
import { runMigrations, seedDefaultTenant, seedSampleData } from './migrations';

// Create Fastify instance
const app = fastify({
  logger: true
});

async function main() {
  try {
    // Connect to database
    await connectDB();
    
    // Run migrations (create missing tables)
    const migrationResult = await runMigrations();
    if (!migrationResult.success) {
      console.error('Migration failed:', migrationResult.message);
      // Continue anyway - tables might already exist
    }
    
    // Seed default tenant if none exists
    await seedDefaultTenant();
    
    // Seed sample data if enabled
    await seedSampleData();
    
    // Setup authentication
    setupAuth(app);
    
    // Setup RBAC
    setupRBAC(app);
    
    // Health check (no auth) – GET/HEAD for Docker healthcheck
    app.get('/health', async (_req, reply) => reply.code(200).send({ ok: true }));
    app.head('/health', async (_req, reply) => reply.code(200).send());
    
    // Register routes
    await registerRoutes(app);
    
    // Start server
    const port = process.env.PORT || 3050;
    const host = process.env.HOST || 'localhost';
    
    await app.listen({ port: parseInt(port as string), host });
    console.log(`Server running at http://${host}:${port}`);
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

main();