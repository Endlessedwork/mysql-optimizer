# ========== Build Stage ==========
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev)
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# ========== Production Stage ==========
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S agent -u 1001

# Change ownership of app directory
RUN chown -R agent:nodejs /app
USER agent

# Environment variables (defaults)
ENV NODE_ENV=production
ENV AGENT_MODE=both

# Healthcheck (logs to stdout/stderr)
HEALTHCHECK --interval=60s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "console.log('Agent health check OK')" || exit 1

# Command to run the application
CMD ["npm", "start"]