# syntax=docker/dockerfile:1

# ---- build the frontend ----
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- runtime: production dependencies, built frontend, TypeScript server ----
FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY server/src ./server/src
COPY shared ./shared

# local image store lives here; mount a volume so drawings survive redeploys
RUN mkdir -p /app/storage && chown node:node /app/storage
USER node

ENV PORT=5050
EXPOSE 5050
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:5050/api/health || exit 1

CMD ["node", "server/src/index.ts"]
