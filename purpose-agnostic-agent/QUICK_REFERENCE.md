# Quick Reference Guide
**Purpose-Agnostic Agent Backend**

---

## 🚀 Quick Start

```bash
# 1. Setup
cp .env.example .env
# Edit .env with your API keys

# 2. Start services
./setup.sh

# 3. Access
# API: http://localhost:3000
# Docs: http://localhost:3000/api/docs
# Health: http://localhost:3000/health
```

---

## 🐳 Docker Commands

```bash
# Start all services
docker-compose up -d

# Start with observability
docker-compose -f docker-compose.yml -f docker-compose.observability.yml up -d

# Start production mode
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down

# Rebuild
docker-compose build --no-cache

# Check status
docker-compose ps
```

---

## 🔧 Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm run start:dev

# Build
npm run build

# Run tests
npm test
npm run test:watch
npm run test:cov

# Lint
npm run lint

# Format code
npm run format
```

---

## 🔐 Generate Secrets

```bash
# JWT secret
openssl rand -base64 32

# API key
openssl rand -hex 32

# Multiple API keys
for i in {1..5}; do openssl rand -hex 32; done
```

---

## 📊 Health Checks

```bash
# Basic health
curl http://localhost:3000/health

# Readiness check
curl http://localhost:3000/health/ready

# With authentication
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/health/ready
```

---

## 💬 API Examples

### Chat Request
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "general-assistant",
    "question": "What is NestJS?"
  }'
```

### List Agents
```bash
curl http://localhost:3000/api/agents
```

### Create Persona (Admin)
```bash
curl -X POST http://localhost:3000/api/personas \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "custom-agent",
    "name": "Custom Agent",
    "description": "A custom agent",
    "systemPrompt": "You are a helpful assistant",
    "knowledgeCategory": "general",
    "temperature": 0.7,
    "maxTokens": 1000
  }'
```

### MCP Request
```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'
```

---

## 🗄️ Database Commands

```bash
# Connect to database
docker-compose exec postgres psql -U postgres -d universal_brain

# Run migrations
docker-compose exec postgres psql -U postgres -d universal_brain -f /docker-entrypoint-initdb.d/init-db.sql

# Check tables
docker-compose exec postgres psql -U postgres -d universal_brain -c "\dt"

# Check pgvector extension
docker-compose exec postgres psql -U postgres -d universal_brain -c "SELECT * FROM pg_extension WHERE extname = 'vector';"

# Backup database
docker-compose exec postgres pg_dump -U postgres universal_brain > backup.sql

# Restore database
docker-compose exec -T postgres psql -U postgres universal_brain < backup.sql
```

---

## 📦 Redis Commands

```bash
# Connect to Redis
docker-compose exec redis redis-cli

# Check connection
docker-compose exec redis redis-cli ping

# View keys
docker-compose exec redis redis-cli KEYS '*'

# Clear all data
docker-compose exec redis redis-cli FLUSHALL

# Monitor commands
docker-compose exec redis redis-cli MONITOR
```

---

## 📝 Logs

```bash
# View all logs
docker-compose logs

# Follow API logs
docker-compose logs -f api

# Last 100 lines
docker-compose logs --tail=100 api

# Logs since timestamp
docker-compose logs --since 2024-02-24T10:00:00 api

# Save logs to file
docker-compose logs api > api-logs.txt
```

---

## 🔍 Debugging

```bash
# Check environment variables
docker-compose exec api env

# Check running processes
docker-compose exec api ps aux

# Check disk space
docker-compose exec api df -h

# Check memory usage
docker-compose exec api free -m

# Execute command in container
docker-compose exec api npm run start:dev

# Shell into container
docker-compose exec api /bin/bash
```

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- persona.spec.ts

# Run with coverage
npm run test:cov

# Run E2E tests
npm run test:e2e

# Run property-based tests
npm test -- test/examples/persona.pbt.spec.ts

# Run with specific seed (reproducibility)
PBT_SEED=12345 npm test
```

---

## 📊 Monitoring

### Prometheus Queries
```promql
# Request rate
rate(http_requests_total[5m])

# Error rate
rate(http_requests_total{status=~"5.."}[5m])

# Response time (95th percentile)
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# LLM provider failures
rate(llm_provider_failures_total[5m])
```

### Seq Queries
```
# Find errors
@Level = 'Error'

# Find slow requests
@Properties.duration > 5000

# Find specific user
@Properties.user_id = 'abc123'

# Find failover events
@Message like '%failover%'
```

---

## 🚨 Troubleshooting

### Database Connection Failed
```bash
# Check if database is running
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Restart database
docker-compose restart postgres

# Test connection
docker-compose exec postgres psql -U postgres -c "SELECT 1"
```

### Redis Connection Failed
```bash
# Check if Redis is running
docker-compose ps redis

# Check logs
docker-compose logs redis

# Restart Redis
docker-compose restart redis

# Test connection
docker-compose exec redis redis-cli ping
```

### API Not Responding
```bash
# Check if API is running
docker-compose ps api

# Check logs
docker-compose logs api

# Restart API
docker-compose restart api

# Check health
curl http://localhost:3000/health
```

### High Memory Usage
```bash
# Check container stats
docker stats

# Increase memory limit in docker-compose.yml
services:
  api:
    deploy:
      resources:
        limits:
          memory: 2G
```

---

## 🔄 Deployment

### Build and Push
```bash
# Build image
docker build -t purpose-agnostic-agent:latest .

# Tag for registry
docker tag purpose-agnostic-agent:latest registry.example.com/purpose-agnostic-agent:latest

# Push to registry
docker push registry.example.com/purpose-agnostic-agent:latest
```

### Deploy
```bash
# Docker Compose
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Kubernetes
kubectl apply -f k8s/

# Check deployment
kubectl get pods -n purpose-agnostic-agent
kubectl logs -f deployment/purpose-agnostic-agent -n purpose-agnostic-agent
```

### Rollback
```bash
# Docker Compose
docker-compose down
docker tag purpose-agnostic-agent:previous purpose-agnostic-agent:latest
docker-compose up -d

# Kubernetes
kubectl rollout undo deployment/purpose-agnostic-agent -n purpose-agnostic-agent
kubectl rollout status deployment/purpose-agnostic-agent -n purpose-agnostic-agent
```

---

## 📞 Support

### Documentation
- README.md - Project overview
- DEPLOYMENT_GUIDE.md - Deployment instructions
- SECURITY_AUDIT.md - Security assessment
- PRODUCTION_READINESS.md - Pre-deployment checklist
- /api/docs - API documentation

### Common Issues
1. **Database connection failed** → Check DATABASE_URL in .env
2. **Redis connection failed** → Check REDIS_URL in .env
3. **LLM provider failed** → Check API keys in .env
4. **Rate limit exceeded** → Wait or increase limits
5. **Authentication failed** → Check JWT_SECRET and API_KEYS

---

## 🎯 Key URLs

- **API**: http://localhost:3000
- **API Docs**: http://localhost:3000/api/docs
- **Health**: http://localhost:3000/health
- **Readiness**: http://localhost:3000/health/ready
- **Seq**: http://localhost:5341
- **Grafana**: http://localhost:3001
- **Prometheus**: http://localhost:9090

---

**Last Updated:** 2026-02-24  
**Version:** 0.0.1
