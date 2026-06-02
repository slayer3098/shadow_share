# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json pnpm-workspace.yaml ./

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
# Use normal install to avoid lockfile mismatch in CI/container
RUN pnpm install

# Copy source code
COPY . .

# Build the application
RUN pnpm build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Install a static server that supports SPA fallback
RUN npm install -g serve

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 5173

# Serve the SPA with single-page-app fallback
CMD ["serve", "-s", "dist", "-l", "5173"]
