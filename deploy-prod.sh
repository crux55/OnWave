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
echo "📦 Building production images..."
docker build -f Dockerfile.production \
  --build-arg NEXT_PUBLIC_API_BASE_URL=${API_BASE_URL} \
  -t onwave-frontend:latest .

# Build backend if needed (uncomment if you want to rebuild)
cd /home/andru/Code/Go/project_r
echo "📦 Building backend with environment variables..."
docker build \
  --build-arg DATABASE_URL=root:${MYSQL_ROOT_PASSWORD}@tcp(mysql:3306)/radio?parseTime=true \
  --build-arg REDIS_PASSWORD=${REDIS_PASSWORD} \
  --build-arg JWT_SECRET=${JWT_SECRET} \
  -t onwave-backend:latest .
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
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 10

# Check service status
echo "📊 Service Status:"
docker-compose -f docker-compose.prod.yml --env-file .env.production ps

# Show logs for troubleshooting
echo "📋 Recent logs:"
docker-compose -f docker-compose.prod.yml --env-file .env.production logs --tail=50

echo "✅ Production deployment complete!"
echo "🌐 Frontend: http://192.168.1.110"
echo "🔧 API: http://192.168.1.110:8080"
echo ""
echo "To view logs: docker-compose -f docker-compose.prod.yml logs -f"
echo "To stop: docker-compose -f docker-compose.prod.yml down"
