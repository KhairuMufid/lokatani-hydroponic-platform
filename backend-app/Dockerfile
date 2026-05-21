# ───────────────────────────────────────────────────────
# Lokatani Backend — Production Dockerfile
#
# Lightweight Node.js image with production dependencies only.
# Runs all 3 protocol servers (HTTP, WS, MQTT) concurrently
# via a simple shell entrypoint.
#
# Build: docker build -t lokatani-backend .
# ───────────────────────────────────────────────────────

# ═══ Stage 1: Install Dependencies ═══
FROM node:22-alpine AS deps

WORKDIR /app

# Copy only package files first — leverage Docker layer cache
COPY package.json package-lock.json* ./

# Install production dependencies only (no devDependencies)
RUN npm ci --omit=dev

# ═══ Stage 2: Production Runtime ═══
FROM node:22-alpine AS runtime

WORKDIR /app

# Security: run as non-root user
RUN addgroup -S lokatani && adduser -S lokatani -G lokatani

# Copy production node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY . .

# Create the uploads directory (will be overridden by Docker volume mount)
RUN mkdir -p uploads/images && chown -R lokatani:lokatani uploads

# Expose HTTP API + WebSocket ports
EXPOSE 3000 8080

# Switch to non-root user
USER lokatani

# Health check against the HTTP server
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start all 3 protocol servers concurrently
# Using shell form to run parallel background processes
CMD ["sh", "-c", "node src/server-http.js & node src/server-ws.js & node src/server-mqtt.js & wait"]
