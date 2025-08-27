#!/bin/bash

# Build the backend Docker image
echo "Building OnWave backend image..."

# Navigate to the Go project directory and build the image
cd ../../Go/project_r
docker build -t onwave-backend:latest .

echo "Backend image built successfully!"
echo "You can now run 'docker-compose up' to start the services."
