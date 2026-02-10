# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install

# ============================================
# Stage 2: Builder
# ============================================
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p public

# NEXT_PUBLIC_* ถูก bake ตอน build - ใส่ผ่าน build-arg
ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}

RUN npm run build

# ============================================
# Stage 3: Development
# ============================================
FROM node:20-alpine AS development
WORKDIR /app

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001 -G nodejs

COPY --chown=nextjs:nodejs package*.json ./
RUN npm install
COPY --chown=nextjs:nodejs . .
RUN mkdir -p public .next && chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3050
ENV PORT=3050
CMD ["npm", "run", "dev"]

# ============================================
# Stage 4: Production
# ============================================
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache wget

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001 -G nodejs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3050
ENV PORT=3050
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
