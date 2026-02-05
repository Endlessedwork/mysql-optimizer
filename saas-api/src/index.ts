import fastify from 'fastify';
import 'dotenv/config';
import { connectDB } from './database';
import registerRoutes from './routes';
import { setupAuth } from './auth';
import { setupRBAC } from './rbac';

// Create Fastify instance
const app = fastify({
  logger: true
});

async function main() {
  try {
    // Connect to database
    await connectDB();
    
    // Setup authentication
    setupAuth(app);
    
    // Setup RBAC
    setupRBAC(app);
    
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