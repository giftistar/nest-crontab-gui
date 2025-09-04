#!/bin/bash

# Build and push Docker image with multi-platform support
VERSION=${1:-0.0.13}
IMAGE_NAME="giftistar/nest-crontab-gui"

echo "Building Docker image: ${IMAGE_NAME}:${VERSION}"
echo "Platforms: linux/amd64, linux/arm64"

# Build and push using Docker Buildx with cloud builder
docker buildx build \
  --builder cloud-giftistar-giftistar-builder \
  --platform linux/amd64,linux/arm64 \
  --tag ${IMAGE_NAME}:${VERSION} \
  --tag ${IMAGE_NAME}:latest \
  --push \
  .


