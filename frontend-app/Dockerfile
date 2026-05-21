# ───────────────────────────────────────────────────────
# Lokatani Frontend — Multi-Stage Production Dockerfile
#
# Stage 1: Build the React SPA with Vite
# Stage 2: Serve compiled static files via Nginx
#
# Build: docker build -t lokatani-frontend .
# ───────────────────────────────────────────────────────

# ═══ Stage 1: Build ═══
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files for dependency layer caching
COPY package.json package-lock.json* ./

# Install ALL dependencies (devDependencies needed for build)
RUN npm ci

# Copy source code
COPY . .

# Build the production bundle
# VITE_API_BASE is empty because Nginx will reverse-proxy /api to the backend
RUN npm run build

# ═══ Stage 2: Production Nginx Server ═══
FROM nginx:1.27-alpine AS production

# Remove default Nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom Nginx config (SPA routing + reverse proxy)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

# Nginx runs in foreground by default in the official image
CMD ["nginx", "-g", "daemon off;"]
