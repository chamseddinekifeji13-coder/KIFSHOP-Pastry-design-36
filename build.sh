#!/bin/bash

# Build script for Vercel deployment
# This ensures Next.js builds correctly with all dependencies

echo "🔨 Building KIFSHOP Cash Register..."

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

# Run Next.js build
echo "🏗️ Running Next.js build..."
npm run build

if [ $? -eq 0 ]; then
  echo "✅ Build completed successfully!"
  exit 0
else
  echo "❌ Build failed!"
  exit 1
fi
