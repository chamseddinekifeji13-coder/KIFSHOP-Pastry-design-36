#!/bin/bash
set -e

echo "========================================="
echo "TEST 1: Clean install"
echo "========================================="
cd /vercel/share/v0-project
rm -rf .next
echo "[OK] Cleaned .next"

echo ""
echo "========================================="
echo "TEST 2: Verify files"
echo "========================================="
if [ -f "proxy.ts" ]; then
  echo "[OK] proxy.ts exists"
  head -1 proxy.ts
else
  echo "[FAIL] proxy.ts NOT FOUND"
  exit 1
fi

if [ -f "middleware.ts" ]; then
  echo "[FAIL] middleware.ts exists at root - will conflict with proxy.ts!"
  exit 1
else
  echo "[OK] No middleware.ts at root"
fi

echo ""
echo "========================================="
echo "TEST 3: Check proxy exports 'proxy' function"
echo "========================================="
if grep -q "export async function proxy" proxy.ts; then
  echo "[OK] proxy.ts exports 'proxy' function"
elif grep -q "export default async function" proxy.ts; then
  echo "[OK] proxy.ts exports default function"
else
  echo "[FAIL] proxy.ts does NOT export a valid proxy function"
  exit 1
fi

echo ""
echo "========================================="
echo "TEST 4: Check no static imports in proxy.ts"
echo "========================================="
STATIC_IMPORTS=$(grep -c "^import " proxy.ts || true)
if [ "$STATIC_IMPORTS" -eq 0 ]; then
  echo "[OK] No static imports - dynamic imports only"
else
  echo "[WARN] Found $STATIC_IMPORTS static import(s) - may cause Turbopack issues"
  grep "^import " proxy.ts
fi

echo ""
echo "========================================="
echo "TEST 5: Check package.json scripts use --webpack"
echo "========================================="
if grep -q '"build": "next build --webpack"' package.json; then
  echo "[OK] build script uses --webpack"
else
  echo "[FAIL] build script missing --webpack"
  grep '"build"' package.json
fi

if grep -q '"dev": "next dev --webpack"' package.json; then
  echo "[OK] dev script uses --webpack"
else
  echo "[FAIL] dev script missing --webpack"
  grep '"dev"' package.json
fi

echo ""
echo "========================================="
echo "TEST 6: Check /download route is public"
echo "========================================="
if grep -q "download" proxy.ts; then
  echo "[OK] /download route referenced in proxy.ts"
else
  echo "[FAIL] /download route NOT found in proxy.ts"
fi

echo ""
echo "========================================="
echo "TEST 7: Build test (next build --webpack)"
echo "========================================="
echo "Starting build..."
npx next build --webpack 2>&1 | tail -20

echo ""
echo "========================================="
echo "ALL TESTS COMPLETE"
echo "========================================="
