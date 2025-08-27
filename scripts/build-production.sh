#!/bin/bash

# Build script for production deployment
set -e

echo "🚀 Starting production build process..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${YELLOW}⚠️  Node.js version 18+ is recommended (current: $(node -v))${NC}"
fi

echo "📦 Installing backend dependencies..."
npm ci --only=production

echo "📦 Installing frontend dependencies..."
cd frontend
npm ci
cd ..

echo "🔨 Building Angular frontend..."
cd frontend
npm run build
cd ..

echo "🔨 Building NestJS backend..."
npm run build

echo "✅ Production build complete!"
echo ""
echo "📂 Build outputs:"
echo "  - Backend: ./dist/"
echo "  - Frontend: ./public/browser/"
echo ""
echo "🚀 To start the application:"
echo "  NODE_ENV=production npm run start:prod"
echo ""
echo "🐳 To build Docker image:"
echo "  docker build -t nest-crontab-gui ."
echo "  docker run -p 3000:3000 -v \$(pwd)/data:/app/data nest-crontab-gui"