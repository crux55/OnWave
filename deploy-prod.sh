#!/bin/bash

# Production Deployment Script for OnWave

set -e

echo "🚀 Starting OnWave Production Deployment..."

# Load production environment
if [ ! -f .env.production ]; then
    echo "❌ .env.production file not found!"
    echo "Please create .env.production with your production settings."
    exit 1
fi

# Source the environment file
source .env.production

# Build production images
FRONTEND_SHA=$(git rev-parse --short HEAD)
echo "📦 Building production images..."
docker build -f Dockerfile.production \
  --build-arg NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL} \
  --build-arg NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL} \
  -t onwave-frontend:latest \
  -t onwave-frontend:${FRONTEND_SHA} .

# Build backend
cd /home/andru/Code/Go/project_r
BACKEND_SHA=$(git rev-parse --short HEAD)
echo "📦 Building backend..."
docker build -t onwave-backend:latest -t onwave-backend:${BACKEND_SHA} .
cd /home/andru/Code/React/OnWave

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.prod.yml --env-file .env.production down

# Clean up old volumes (uncomment to reset data)
# echo "🧹 Cleaning up old data..."
# docker-compose -f docker-compose.prod.yml --env-file .env.production down -v
# docker volume prune -f

# Start production services
echo "🎯 Starting production services..."
export COMPOSE_HTTP_TIMEOUT=300
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d --force-recreate

# Wait for the app to actually respond before declaring victory
echo "⏳ Waiting for the app to come up..."
HEALTHY=0
for i in $(seq 1 20); do
  if curl -sf -o /dev/null "http://localhost/"; then
    HEALTHY=1
    break
  fi
  sleep 3
done

echo "📊 Service Status:"
docker-compose -f docker-compose.prod.yml --env-file .env.production ps

if [ "$HEALTHY" -ne 1 ]; then
  echo "❌ Deployment FAILED: app did not respond at http://localhost/ after 60s"
  echo "📋 Recent logs:"
  docker-compose -f docker-compose.prod.yml --env-file .env.production logs --tail=100
  exit 1
fi

echo "📋 Recent logs:"
docker-compose -f docker-compose.prod.yml --env-file .env.production logs --tail=50

echo "✅ Production deployment complete!"
echo "🌐 App:  https://onwave.andruquinn.com"
echo "🔧 API:  https://onwave.andruquinn.com/api"
echo "🔔 WS:   wss://onwave.andruquinn.com/ws"
echo ""
echo "🔖 Built images tagged :latest and :${FRONTEND_SHA} / :${BACKEND_SHA} for rollback."
echo "   To roll back: docker tag onwave-frontend:<old-sha> onwave-frontend:latest"
echo "                 docker tag onwave-backend:<old-sha> onwave-backend:latest"
echo "                 docker-compose -f docker-compose.prod.yml --env-file .env.production up -d --force-recreate"
echo ""
echo "To view logs: docker-compose -f docker-compose.prod.yml logs -f"
echo "To stop: docker-compose -f docker-compose.prod.yml down"
