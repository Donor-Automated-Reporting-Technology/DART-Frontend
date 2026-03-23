# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy project files and build
COPY . .
ARG API_BASE_URL
ENV API_BASE_URL=$API_BASE_URL
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy built application from builder stage
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/package*.json ./

# Set environment variables
ENV HOST=0.0.0.0
ENV PORT=3000
ENV NODE_ENV=production

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", ".output/server/index.mjs"]
