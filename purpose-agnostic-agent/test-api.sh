#!/bin/bash

# API Testing Script
# Quick manual testing for the Purpose-Agnostic Agent API

API_URL="http://localhost:3000"
ADMIN_API_KEY="your-admin-api-key-here"

echo "🧪 Purpose-Agnostic Agent API Test Suite"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Health Check
echo "1️⃣  Testing Health Check..."
response=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health")
if [ "$response" = "200" ]; then
    echo -e "${GREEN}✓ Health check passed${NC}"
else
    echo -e "${RED}✗ Health check failed (HTTP $response)${NC}"
fi
echo ""

# Test 2: Ready Check
echo "2️⃣  Testing Ready Check..."
response=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health/ready")
if [ "$response" = "200" ]; then
    echo -e "${GREEN}✓ Ready check passed${NC}"
else
    echo -e "${RED}✗ Ready check failed (HTTP $response)${NC}"
fi
echo ""

# Test 3: List Personas
echo "3️⃣  Testing List Personas..."
response=$(curl -s "$API_URL/api/personas")
if echo "$response" | grep -q "general-assistant"; then
    echo -e "${GREEN}✓ List personas passed${NC}"
    echo "   Found personas: $(echo $response | grep -o '"id":"[^"]*"' | wc -l)"
else
    echo -e "${RED}✗ List personas failed${NC}"
fi
echo ""

# Test 4: Chat Request (without knowledge base)
echo "4️⃣  Testing Chat Request..."
response=$(curl -s -X POST "$API_URL/api/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "general-assistant",
    "question": "What is NestJS?"
  }')

if echo "$response" | grep -q "answer"; then
    echo -e "${GREEN}✓ Chat request passed${NC}"
    # Check if it's a RAG-only response (should say no knowledge)
    if echo "$response" | grep -qi "knowledge base"; then
        echo -e "${YELLOW}   ℹ RAG-only response (no knowledge indexed)${NC}"
    fi
else
    echo -e "${RED}✗ Chat request failed${NC}"
    echo "   Response: $response"
fi
echo ""

# Test 5: API Documentation
echo "5️⃣  Testing API Documentation..."
response=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/docs")
if [ "$response" = "200" ] || [ "$response" = "301" ]; then
    echo -e "${GREEN}✓ API docs accessible${NC}"
else
    echo -e "${RED}✗ API docs not accessible (HTTP $response)${NC}"
fi
echo ""

# Summary
echo "=========================================="
echo "🏁 Test suite completed!"
echo ""
echo "📝 Next Steps:"
echo "   1. Add PDF documents to knowledge/ directory"
echo "   2. Wait for automatic ingestion (or restart API)"
echo "   3. Test chat with knowledge-based questions"
echo ""
echo "🔗 Useful URLs:"
echo "   API: $API_URL"
echo "   Docs: $API_URL/api/docs"
echo "   Health: $API_URL/health"
