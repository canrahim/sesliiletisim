# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/portal/package.json ./apps/portal/
COPY packages ./packages

# Install dependencies
RUN pnpm install --no-frozen-lockfile

# Copy source code
COPY apps/portal/src ./apps/portal/src
COPY apps/portal/public ./apps/portal/public
COPY apps/portal/*.html ./apps/portal/
COPY apps/portal/*.ts ./apps/portal/
COPY apps/portal/*.js ./apps/portal/
COPY tsconfig.json ./

# Build arguments for environment variables
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Build
RUN pnpm --filter @asforces/portal build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/apps/portal/dist /usr/share/nginx/html

# Copy custom nginx config
COPY apps/portal/nginx.conf /etc/nginx/conf.d/default.conf

# Switch to non-root user
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

USER nginx

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

