#!/bin/bash

# Navigate to the correct project directory
cd /vercel/share/v0-project

# Clean build cache
rm -rf .next .turbopack dist

# Reinstall dependencies if needed
npm install --legacy-peer-deps 2>/dev/null || true

# Start the dev server
npm run dev
