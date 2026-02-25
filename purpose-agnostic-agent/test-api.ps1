# API Testing Script (PowerShell)
# Quick manual testing for the Purpose-Agnostic Agent API

$API_URL = "http://localhost:3000"
$ADMIN_API_KEY = "your-admin-api-key-here"

Write-Host "🧪 Purpose-Agnostic Agent API Test Suite" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Health Check
Write-Host "1️⃣  Testing Health Check..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$API_URL/health" -Method GET -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "✓ Health check passed" -ForegroundColor Green
    }
} catch {
    Write-Host "✗ Health check failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 2: Ready Check
Write-Host "2️⃣  Testing Ready Check..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$API_URL/health/ready" -Method GET -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "✓ Ready check passed" -ForegroundColor Green
    }
} catch {
    Write-Host "✗ Ready check failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 3: List Personas
Write-Host "3️⃣  Testing List Personas..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$API_URL/api/personas" -Method GET
    if ($response -and $response.Count -gt 0) {
        Write-Host "✓ List personas passed" -ForegroundColor Green
        Write-Host "   Found personas: $($response.Count)" -ForegroundColor Gray
    }
} catch {
    Write-Host "✗ List personas failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 4: Chat Request
Write-Host "4️⃣  Testing Chat Request..." -ForegroundColor Yellow
try {
    $body = @{
        agent_id = "general-assistant"
        question = "What is NestJS?"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$API_URL/api/chat" -Method POST -Body $body -ContentType "application/json"
    
    if ($response.answer) {
        Write-Host "✓ Chat request passed" -ForegroundColor Green
        if ($response.answer -match "knowledge base") {
            Write-Host "   ℹ RAG-only response (no knowledge indexed)" -ForegroundColor Cyan
        }
    }
} catch {
    Write-Host "✗ Chat request failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 5: API Documentation
Write-Host "5️⃣  Testing API Documentation..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$API_URL/api/docs" -Method GET -UseBasicParsing
    if ($response.StatusCode -eq 200 -or $response.StatusCode -eq 301) {
        Write-Host "✓ API docs accessible" -ForegroundColor Green
    }
} catch {
    Write-Host "✗ API docs not accessible: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Summary
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "🏁 Test suite completed!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next Steps:" -ForegroundColor Yellow
Write-Host "   1. Add PDF documents to knowledge/ directory"
Write-Host "   2. Wait for automatic ingestion (or restart API)"
Write-Host "   3. Test chat with knowledge-based questions"
Write-Host ""
Write-Host "🔗 Useful URLs:" -ForegroundColor Yellow
Write-Host "   API: $API_URL"
Write-Host "   Docs: $API_URL/api/docs"
Write-Host "   Health: $API_URL/health"
