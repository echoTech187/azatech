# Stage 1: Dependencies & Build
FROM node:24-alpine AS builder
WORKDIR /app
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"

COPY package.json package-lock.json* ./
RUN npm install

COPY prisma ./prisma
COPY prisma*.config.ts ./
COPY tsconfig.json ./
COPY src ./src

RUN npx prisma generate && npm run build

# Stage 2: Production Runner (Non-root user)
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --chown=node:node --from=builder /app/package.json ./
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/prisma ./prisma
COPY --chown=node:node --from=builder /app/prisma*.config.ts ./
COPY --chown=node:node --from=builder /app/src/generated ./src/generated
COPY --chown=node:node --from=builder /app/dist ./dist

USER node

EXPOSE 4000
CMD ["node", "dist/server.js"]