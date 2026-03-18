#!/bin/bash
# Clean Next.js cache and rebuild
rm -rf .next
npm run build
npm run dev
