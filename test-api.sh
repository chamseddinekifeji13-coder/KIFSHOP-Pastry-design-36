#!/bin/bash

# KIFSHOP API Test Script
# Tests all endpoints to verify deployment

API_URL="${1:-http://localhost:3000}"
CRON_SECRET="${2:-sk_prod_test_secret}"

echo "🧪 Testing KIFSHOP Cash Register API"
echo "URL: $API_URL"
echo "---"

# Test 1: Health Check
echo "1️⃣  Health Check..."
RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/api/health")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Health Check: OK"
  echo "   Response: $BODY"
else
  echo "❌ Health Check: FAILED (HTTP $HTTP_CODE)"
fi

echo ""

# Test 2: POS80 Config GET (no config yet expected)
echo "2️⃣  POS80 Config Check..."
RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/api/pos80/config?tenantId=test")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "401" ]; then
  echo "✅ POS80 Config endpoint: OK (HTTP $HTTP_CODE)"
else
  echo "❌ POS80 Config endpoint: FAILED (HTTP $HTTP_CODE)"
fi

echo ""

# Test 3: POS80 Sync Status GET
echo "3️⃣  POS80 Sync Status Check..."
RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/api/pos80/sync/status?tenantId=test")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "401" ]; then
  echo "✅ POS80 Sync Status endpoint: OK (HTTP $HTTP_CODE)"
else
  echo "❌ POS80 Sync Status endpoint: FAILED (HTTP $HTTP_CODE)"
fi

echo ""

# Test 4: POS80 Logs GET
echo "4️⃣  POS80 Logs Check..."
RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/api/pos80/sync/logs?tenantId=test")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "401" ]; then
  echo "✅ POS80 Logs endpoint: OK (HTTP $HTTP_CODE)"
else
  echo "❌ POS80 Logs endpoint: FAILED (HTTP $HTTP_CODE)"
fi

echo ""
echo "---"
echo "✅ API Test Complete!"
echo ""
echo "Note: 401 responses are expected if no authentication is set up."
echo "This is normal for a fresh deployment."
