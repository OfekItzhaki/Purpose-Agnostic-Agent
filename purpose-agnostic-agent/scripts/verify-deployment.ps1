# Deployment Verification Script (PowerShell)
# This script verifies that the Purpose-Agnostic Agent is deployed correctly

param(
    [string]$ApiUrl = "http://localhost:3000"
)

$ErrorActionPreference = "Continue"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Purpose-Agnostic Agent Deployment Verification" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$FailedChecks = 0

function Check-Passed {
    param([string]$Message)
    Write-Host "✓ PASSED: $Message" -ForegroundColor Green
}

function Check-Failed {
    param([string]$Message)
    Write-Host "✗ FAILED: $Message" -ForegroundColor Red
    $script:FailedChecks++
}

function Check-Warning {
    param([string]$Message)
    Write-Host "⚠ WARNING: $Message" -ForegroundColor Yellow
}

Write-Host "Testing API endpoint: $ApiUrl"
Write-Host ""

# 1. Basic Health Check
Write-Host "1. Testing basic health endpoint..."
try {
    $response = Invoke-RestMethod -Uri "$ApiUrl/health" -Method Get -TimeoutSec 5 -ErrorAction Stop
    if ($response.status -eq "ok") {
        Check-Passed "Basic health check"
    } else {
        Check-Failed "Health check returned unexpected response"
    }
} catch {
    Check-Failed "Health endpoint not accessible: $_"
}
Write-Host ""

# 2. Readiness Check
Write-Host "2. Testing readiness endpoint..."
try {
    $response = Invoke-RestMethod -Uri "$ApiUrl/health/ready" -Method Get -TimeoutSec 5 -ErrorAction Stop
    if ($response.status -eq "ok") {
        Check-Passed "Readiness check - all dependencies healthy"
    } else {
        Check-Warning "Readiness check returned warnings (some dependencies may be unavailable)"
    }
} catch {
    Check-Failed "Readiness endpoint not accessible or dependencies unhealthy"
}
Write-Host ""

# 3. API Documentation
Write-Host "3. Testing API documentation..."
try {
    $response = Invoke-WebRequest -Uri "$ApiUrl/api/docs" -Method Get -TimeoutSec 5 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Check-Passed "API documentation accessible at $ApiUrl/api/docs"
    }
} catch {
    Check-Failed "API documentation not accessible"
}
Write-Host ""

# 4. Security Headers
Write-Host "4. Testing security headers..."
try {
    $response = Invoke-WebRequest -Uri "$ApiUrl/health" -Method Get -TimeoutSec 5 -ErrorAction Stop
    
    if ($response.Headers["X-Frame-Options"]) {
        Check-Passed "X-Frame-Options header present"
    } else {
        Check-Failed "X-Frame-Options header missing"
    }
    
    if ($response.Headers["X-Content-Type-Options"]) {
        Check-Passed "X-Content-Type-Options header present"
    } else {
        Check-Failed "X-Content-Type-Options header missing"
    }
    
    if ($response.Headers["Content-Security-Policy"]) {
        Check-Passed "Content-Security-Policy header present"
    } else {
        Check-Failed "Content-Security-Policy header missing"
    }
} catch {
    Check-Failed "Could not retrieve headers"
}
Write-Host ""

# 5. API Endpoints
Write-Host "5. Testing API endpoints..."

# Test GET /api/agents
try {
    $response = Invoke-RestMethod -Uri "$ApiUrl/api/agents" -Method Get -TimeoutSec 5 -ErrorAction Stop
    Check-Passed "GET /api/agents endpoint accessible"
} catch {
    Check-Warning "GET /api/agents endpoint not accessible (may require authentication)"
}

# Test POST /api/chat (should require auth)
try {
    $body = @{
        agent_id = "test"
        question = "test"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$ApiUrl/api/chat" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 5 -ErrorAction Stop
    Check-Warning "POST /api/chat returned unexpected success (should require authentication)"
}
catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 401 -or $statusCode -eq 403) {
        Check-Passed "POST /api/chat requires authentication (returned $statusCode)"
    }
    elseif ($statusCode -eq 400) {
        Check-Passed "POST /api/chat endpoint accessible (returned 400 - validation error)"
    }
    else {
        Check-Warning "POST /api/chat returned unexpected status: $statusCode"
    }
}
Write-Host ""

# 6. Docker Containers
Write-Host "6. Checking Docker containers..."
try {
    $containers = docker ps --format "{{.Names}}" 2>$null
    
    if ($containers -match "purpose-agnostic-agent-api") {
        Check-Passed "API container running"
    } else {
        Check-Warning "API container not found (may not be running via Docker)"
    }
    
    if ($containers -match "purpose-agnostic-agent-postgres") {
        Check-Passed "PostgreSQL container running"
    } else {
        Check-Warning "PostgreSQL container not found"
    }
    
    if ($containers -match "purpose-agnostic-agent-redis") {
        Check-Passed "Redis container running"
    } else {
        Check-Warning "Redis container not found"
    }
} catch {
    Check-Warning "Docker not available or not running"
}
Write-Host ""

# Summary
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Verification Summary" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

if ($FailedChecks -eq 0) {
    Write-Host "✓ All critical checks passed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Your Purpose-Agnostic Agent deployment is healthy."
    Write-Host ""
    Write-Host "Next steps:"
    Write-Host "  - Access API documentation: $ApiUrl/api/docs"
    Write-Host "  - Test chat endpoint with authentication"
    Write-Host "  - Monitor logs for any errors"
}
else {
    Write-Host "✗ $FailedChecks check(s) failed" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please review the failed checks above and:"
    Write-Host "  1. Check application logs: docker-compose logs -f api"
    Write-Host "  2. Verify environment configuration"
    Write-Host "  3. Ensure all dependencies are running"
    Write-Host "  4. Review DEPLOYMENT_GUIDE.md for troubleshooting"
}
