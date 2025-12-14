# Stage 1: Dependencies (cached layer)
FROM node:20-alpine AS deps
WORKDIR /app

# Copy only package files first (better cache)
COPY package.json package-lock.json* ./
RUN npm ci --prefer-offline --no-audit --no-fund

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build with reduced telemetry
ENV NUXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 3: Runner (minimal image)
FROM node:20-alpine AS runner
WORKDIR /app

# Install FFmpeg and yt-dlp
RUN apk add --no-cache ffmpeg python3 py3-pip && \
    pip3 install --break-system-packages --no-cache-dir yt-dlp && \
    apk del py3-pip

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nuxtjs

# Copy only the built output (minimal size)
COPY --from=builder --chown=nuxtjs:nodejs /app/.output /app/.output

USER nuxtjs
EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
