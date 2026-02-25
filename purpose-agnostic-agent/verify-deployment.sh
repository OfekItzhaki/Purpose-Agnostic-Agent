#!/bin/bash

# Deployment Verification Script
# This script verifies that the Purpose-Agnostic Agent is deployed correctly

set -e

echo "=========================================="
echo "Purpose-Agnostic Agent Deployment Verification"
echo "=========================================="
echo ""

# Configuration
API_URL="${API_URL:-http://localhost:3000}"
TIMEOUT=5

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
check_passed() {
    echo -e "${GREEN}✓ PASSED${NC}: $1"
}

check_failed() {
    echo -e "${RED}✗ FAILED${NC}: $1"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
}

check_warning() {
    echo -e "${YELLOW}⚠ WARNING${NC}: $1"
}

# Initialize counters
FAILED_CHECKS=0

echo "Testing API endpoint: $API_URL"
echo ""

# 1. Basic Health Check
echo "1. Testing basic health endpoint..."
if curl -s -f -m $TIMEOUT "$API_URL/health" > /dev/null 2>&1; then
    RESPONSE=$(curl -s -m $TIMEOUT "$API_URL/health")
    if echo "$RESPONSE" | grep -q '"status":"ok"'; then
        check_passed "Basic health check"
    else
        check_failed "Health check returned unexpected response"
    fi
else
    check_failed "Health endpoint not accessible"
fi
echo ""

# 2. Readiness Check
echo "2. Testing readiness endpoint..."
if curl -s -f -m $TIMEOUT "$API_URL/health/ready" > /dev/null 2>&1; then
    RESPONSE=$(curl -s -m $TIMEOUT "$API_URL/health/ready")
    if echo "$RESPONSE" | grep -q '"status":"ok"'; then
        check_passed "Readiness check - all dependencies healthy"
    else
        check_warning "Readiness check returned warnings (some dependencies may be unavailable)"
    fi
else
    check_failed "Readiness endpoint not accessible or dependencies unhealthy"
fi
echo ""

# 3. API Documentation
echo "3. Testing API documentation..."
if curl -s -f -m $TIMEOUT "$API_URL/api/docs" > /dev/null 2>&1; then
    check_passed "API documentation accessible at $API_URL/api/docs"
else
    check_failed "API documentation not accessible"
fi
echo ""

# 4. CORS Headers
echo "4. Testing CORS configuration..."
CORS_RESPONSE=$(curl -s -I -m $TIMEOUT "$API_URL/health" 2>/dev/null || echo "")
if echo "$CORS_RESPONSE" | grep -qi "access-control-allow-credentials"; then
    check_passed "CORS headers present"
else
    check_warning "CORS headers not found (may be expected if not configured)"
fi
echo ""

# 5. Security Headers
echo "5. Testing security headers..."
HEADERS=$(curl -s -I -m $TIMEOUT "$API_URL/health" 2>/dev/null || echo "")

if echo "$HEADERS" | grep -qi "x-frame-options"; then
    check_passed "X-Frame-Options header present"
else
    check_failed "X-Frame-Options header missing"
fi

if echo "$HEADERS" | grep -qi "x-content-type-options"; then
    check_passed "X-Content-Type-Options header present"
else
    check_failed "X-Content-Type-Options header missing"
fi

if echo "$HEADERS" | grep -qi "content-security-policy"; then
    check_passed "Content-Security-Policy header present"
else
    check_failed "Content-Security-Policy header missing"
fi
echo ""

# 6. Rate Limiting
echo "6. Testing rate limiting..."
if echo "$HEADERS" | grep -qi "x-ratelimit"; then
    check_passed "Rate limiting headers present"
else
    check_warning "Rate limiting headers not found (may not be visible on health endpoint)"
fi
echo ""

# 7. API Endpoints
echo "7. Testing API endpoints..."

# Test GET /api/agents (should work without auth for listing)
if curl -s -f -m $TIMEOUT "$API_URL/api/agents" > /dev/null 2>&1; then
    check_passed "GET /api/agents endpoint accessible"
else
    check_warning "GET /api/agents endpoint not accessible (may require authentication)"
fi

# Test POST /api/chat (should require auth)
CHAT_RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null -m $TIMEOUT \
    -X POST "$API_URL/api/chat" \
    -H "Content-Type: application/json" \
    -d '{"agent_id":"test","question":"test"}' 2>/dev/null || echo "000")

if [ "$CHAT_RESPONSE" = "401" ] || [ "$CHAT_RESPONSE" = "403" ]; then
    check_passed "POST /api/chat requires authentication (returned $CHAT_RESPONSE)"
elif [ "$CHAT_RESPONSE" = "400" ]; then
    check_passed "POST /api/chat endpoint accessible (returned 400 - validation error)"
else
    check_warning "POST /api/chat returned unexpected status: $CHAT_RESPONSE"
fi
echo ""

# 8. Docker Containers (if running locally)
if command -v docker &> /dev/null; then
    echo "8. Checking Docker containers..."
    
    if docker ps | grep -q "purpose-agnostic-agent-api"; then
        check_passed "API container running"
    else
        check_warning "API container not found (may not be running via Docker)"
    fi
    
    if docker ps | grep -q "purpose-agnostic-agent-postgres"; then
        check_passed "PostgreSQL container running"
    else
        check_warning "PostgreSQL container not found"
    fi
    
    if docker ps | grep -q "purpose-agnostic-agent-redis"; then
        check_passed "Redis container running"
    else
        check_warning "Redis container not found"
    fi
    echo ""
fi

# Summary
echo "=========================================="
echo "Verification Summary"
echo "=========================================="

if [ $FAILED_CHECKS -eq 0 ]; then
    echo -e "${GREEN}✓ All critical checks passed!${NC}"
    echo ""
    echo "Your Purpose-Agnostic Agent deployment is healthy."
    echo ""
    echo "Next steps:"
    echo "  - Access API documentation: $API_URL/api/docs"
    echo "  - Test chat endpoint with authentication"
    echo "  - Monitor logs for any errors"
    exit 0
else
    echo -e "${RED}✗ $FAILED_CHECKS check(s) failed${NC}"
    echo ""
    echo "Please review the failed checks above and:"
    echo "  1. Check application logs: docker-compose logs -f api"
    echo "  2. Verify environment configuration"
    echo "  3. Ensure all dependencies are running"
    echo "  4. Review DEPLOYMENT_GUIDE.md for troubleshooting"
    exit 1
fi
