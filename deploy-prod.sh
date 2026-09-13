#!/bin/bash

# Production Deployment Script for OnWave

set -e

echo "Starting OnWave Production Deployment..."

# Load production environment
if [ ! -f .env.production ]; then
    echo "ERROR: .env.production file not found!"
    echo "Please create .env.production with your production settings."
    exit 1
fi

# Source the environment file
source .env.production

# Build production images
FRONTEND_SHA=$(git rev-parse --short HEAD)
echo "Building production images..."
docker build -f Dockerfile.production \
  --build-arg NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL} \
  --build-arg NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL} \
  --build-arg NEXT_PUBLIC_SENTRY_DSN=${NEXT_PUBLIC_SENTRY_DSN} \
  -t onwave-frontend:latest \
  -t onwave-frontend:${FRONTEND_SHA} .

# Build backend
cd /home/andru/Code/Go/project_r
BACKEND_SHA=$(git rev-parse --short HEAD)
echo "Building backend..."
docker build -t onwave-backend:latest -t onwave-backend:${BACKEND_SHA} .
cd /home/andru/Code/React/OnWave

# Stop existing containers
echo "Stopping existing containers..."
docker-compose -f docker-compose.prod.yml --env-file .env.production down

# Clean up old volumes (uncomment to reset data)
# echo "Cleaning up old data..."
# docker-compose -f docker-compose.prod.yml --env-file .env.production down -v
# docker volume prune -f

# Start production services
echo "Starting production services..."
export COMPOSE_HTTP_TIMEOUT=300
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d --force-recreate

# Wait for the app to actually respond before declaring victory. Checks
# both the frontend AND the backend (via /api/health, which pings MySQL) --
# nginx/the frontend answer at "/" regardless of whether the backend is
# actually working, which is exactly what let a crash-looping backend
# deploy print "success" on 2026-08-29 (project_r#15).
echo "Waiting for the app to come up..."
FRONTEND_HEALTHY=0
BACKEND_HEALTHY=0
for i in $(seq 1 20); do
  if [ "$FRONTEND_HEALTHY" -ne 1 ] && curl -sf -o /dev/null "http://localhost/"; then
    FRONTEND_HEALTHY=1
  fi
  if [ "$BACKEND_HEALTHY" -ne 1 ] && curl -sf -o /dev/null "http://localhost/api/health"; then
    BACKEND_HEALTHY=1
  fi
  if [ "$FRONTEND_HEALTHY" -eq 1 ] && [ "$BACKEND_HEALTHY" -eq 1 ]; then
    break
  fi
  sleep 3
done

echo "Service Status:"
docker-compose -f docker-compose.prod.yml --env-file .env.production ps

if [ "$FRONTEND_HEALTHY" -ne 1 ] || [ "$BACKEND_HEALTHY" -ne 1 ]; then
  echo "ERROR: Deployment FAILED after 60s (frontend healthy: $FRONTEND_HEALTHY, backend healthy: $BACKEND_HEALTHY)"
  echo "Recent logs:"
  docker-compose -f docker-compose.prod.yml --env-file .env.production logs --tail=100
  exit 1
fi

echo "Recent logs:"
docker-compose -f docker-compose.prod.yml --env-file .env.production logs --tail=50

# Only the image currently in use is kept — every prior :sha tag from
# earlier deploys is removed so image storage can't grow unbounded.
# Rollback now means checking out the old commit and rebuilding, not
# retagging an old image, which is fine given the fast/scripted build.
echo "Pruning old onwave-frontend/onwave-backend images..."
docker images --format '{{.Repository}}:{{.Tag}}' | grep '^onwave-frontend:' | grep -v -E ":latest\$|:${FRONTEND_SHA}\$" | xargs -r docker rmi
docker images --format '{{.Repository}}:{{.Tag}}' | grep '^onwave-backend:' | grep -v -E ":latest\$|:${BACKEND_SHA}\$" | xargs -r docker rmi
docker image prune -f

echo "Production deployment complete!"
echo "App:  https://onwave.andruquinn.com"
echo "API:  https://onwave.andruquinn.com/api"
echo "WS:   wss://onwave.andruquinn.com/ws"
echo ""
echo "Built images tagged :latest and :${FRONTEND_SHA} / :${BACKEND_SHA} (same image, both tags kept; all older versions pruned)."
echo ""
echo "To view logs: docker-compose -f docker-compose.prod.yml logs -f"
echo "To stop: docker-compose -f docker-compose.prod.yml down"
