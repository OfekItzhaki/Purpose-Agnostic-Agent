# Deployment Guide
**Purpose-Agnostic Agent Backend**  
**Version:** 0.0.1  
**Last Updated:** 2026-02-24

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Deployment Options](#deployment-options)
3. [Docker Deployment](#docker-deployment)
4. [Kubernetes Deployment](#kubernetes-deployment)
5. [Cloud Platform Deployment](#cloud-platform-deployment)
6. [Environment Configuration](#environment-configuration)
7. [Database Setup](#database-setup)
8. [SSL/TLS Configuration](#ssltls-configuration)
9. [Monitoring Setup](#monitoring-setup)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required
- Docker 20.10+ and Docker Compose 2.0+
- PostgreSQL 15+ with pgvector extension
- Redis 6.0+
- Node.js 18+ (for local development)
- SSL certificate (Let's Encrypt recommended)

### Recommended
- Nginx or Apache as reverse proxy
- Managed database service (AWS RDS, Azure Database, etc.)
- Managed Redis service (AWS ElastiCache, Azure Cache, etc.)
- Container orchestration (Kubernetes, ECS, etc.)
- Secrets management (AWS Secrets Manager, Azure Key Vault, HashiCorp Vault)

### API Keys Required
- Google AI API key (for Gemini)
- OpenAI API key (for embeddings)
- OpenRouter API key (for GPT-4o and Claude-3.5)

---

## Deployment Options

### Option 1: Docker Compose (Recommended for Small-Medium Scale)
- **Best for:** Single server, development, staging
- **Pros:** Simple setup, all services in one place
- **Cons:** Limited scalability, single point of failure
- **Estimated setup time:** 30 minutes

### Option 2: Kubernetes (Recommended for Production)
- **Best for:** Production, high availability, auto-scaling
- **Pros:** Highly scalable, self-healing, rolling updates
- **Cons:** Complex setup, requires K8s knowledge
- **Estimated setup time:** 2-4 hours

### Option 3: Cloud Platform (AWS/Azure/GCP)
- **Best for:** Managed infrastructure, enterprise
- **Pros:** Fully managed, high availability, auto-scaling
- **Cons:** Higher cost, vendor lock-in
- **Estimated setup time:** 1-2 hours

---

## Docker Deployment

### Step 1: Prepare Environment

```bash
# Clone repository
git clone <repository-url>
cd purpose-agnostic-agent

# Copy environment file
cp .env.example .env

# Generate secrets
JWT_SECRET=$(openssl rand -base64 32)
API_KEY=$(openssl rand -hex 32)

# Edit .env file
nano .env
```

### Step 2: Configure Environment Variables

Edit `.env` with production values:

```env
# Core
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://user:password@postgres:5432/purpose_agnostic_agent

# Redis
REDIS_URL=redis://redis:6379

# Authentication
JWT_SECRET=<generated-secret>
JWT_EXPIRES_IN=24h
API_KEYS=<generated-key>

# CORS
CORS_ORIGIN=https://yourdomain.com

# LLM Providers
GOOGLE_AI_API_KEY=<your-key>
OPENAI_API_KEY=<your-key>
OPENROUTER_API_KEY=<your-key>

# Observability (optional)
SEQ_URL=http://seq:5341
PROMETHEUS_ENABLED=true
```

### Step 3: Build and Deploy

```bash
# Build Docker image
docker-compose build

# Start services
docker-compose up -d

# Check logs
docker-compose logs -f api

# Verify health
curl http://localhost:3000/health
```

### Step 4: Initialize Database

```bash
# Run database initialization
docker-compose exec postgres psql -U postgres -d purpose_agnostic_agent -f /docker-entrypoint-initdb.d/init-db.sql

# Verify tables created
docker-compose exec postgres psql -U postgres -d purpose_agnostic_agent -c "\dt"
```

### Step 5: Configure Reverse Proxy

Create `/etc/nginx/sites-available/purpose-agnostic-agent`:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req zone=api_limit burst=20 nodelay;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

Enable and restart Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/purpose-agnostic-agent /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## Kubernetes Deployment

### Step 1: Create Namespace

```bash
kubectl create namespace purpose-agnostic-agent
```

### Step 2: Create Secrets

```bash
# Create secret for environment variables
kubectl create secret generic app-secrets \
  --from-literal=JWT_SECRET=$(openssl rand -base64 32) \
  --from-literal=API_KEYS=$(openssl rand -hex 32) \
  --from-literal=GOOGLE_AI_API_KEY=<your-key> \
  --from-literal=OPENAI_API_KEY=<your-key> \
  --from-literal=OPENROUTER_API_KEY=<your-key> \
  --from-literal=DATABASE_URL=<your-db-url> \
  --from-literal=REDIS_URL=<your-redis-url> \
  -n purpose-agnostic-agent
```

### Step 3: Create ConfigMap

```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: purpose-agnostic-agent
data:
  NODE_ENV: "production"
  PORT: "3000"
  CORS_ORIGIN: "https://yourdomain.com"
  LOG_LEVEL: "info"
  PROMETHEUS_ENABLED: "true"
```

Apply:
```bash
kubectl apply -f configmap.yaml
```

### Step 4: Create Deployment

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: purpose-agnostic-agent
  namespace: purpose-agnostic-agent
spec:
  replicas: 3
  selector:
    matchLabels:
      app: purpose-agnostic-agent
  template:
    metadata:
      labels:
        app: purpose-agnostic-agent
    spec:
      containers:
      - name: api
        image: your-registry/purpose-agnostic-agent:latest
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: app-config
        - secretRef:
            name: app-secrets
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
```

Apply:
```bash
kubectl apply -f deployment.yaml
```

### Step 5: Create Service

```yaml
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: purpose-agnostic-agent
  namespace: purpose-agnostic-agent
spec:
  selector:
    app: purpose-agnostic-agent
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```

Apply:
```bash
kubectl apply -f service.yaml
```

### Step 6: Create Ingress (Optional)

```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: purpose-agnostic-agent
  namespace: purpose-agnostic-agent
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/rate-limit: "10"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - api.yourdomain.com
    secretName: api-tls
  rules:
  - host: api.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: purpose-agnostic-agent
            port:
              number: 80
```

Apply:
```bash
kubectl apply -f ingress.yaml
```

### Step 7: Configure Horizontal Pod Autoscaler

```yaml
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: purpose-agnostic-agent
  namespace: purpose-agnostic-agent
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: purpose-agnostic-agent
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

Apply:
```bash
kubectl apply -f hpa.yaml
```

---

## Cloud Platform Deployment

### AWS Deployment (ECS + Fargate)

#### Step 1: Create ECR Repository

```bash
aws ecr create-repository --repository-name purpose-agnostic-agent

# Build and push image
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
docker build -t purpose-agnostic-agent .
docker tag purpose-agnostic-agent:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/purpose-agnostic-agent:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/purpose-agnostic-agent:latest
```

#### Step 2: Create RDS PostgreSQL Instance

```bash
aws rds create-db-instance \
  --db-instance-identifier purpose-agnostic-agent-db \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 15.3 \
  --master-username admin \
  --master-user-password <strong-password> \
  --allocated-storage 20 \
  --vpc-security-group-ids <security-group-id> \
  --db-subnet-group-name <subnet-group-name>
```

#### Step 3: Create ElastiCache Redis

```bash
aws elasticache create-cache-cluster \
  --cache-cluster-id purpose-agnostic-agent-redis \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --num-cache-nodes 1 \
  --security-group-ids <security-group-id> \
  --cache-subnet-group-name <subnet-group-name>
```

#### Step 4: Create Secrets in Secrets Manager

```bash
aws secretsmanager create-secret \
  --name purpose-agnostic-agent/prod \
  --secret-string '{
    "JWT_SECRET":"<generated-secret>",
    "API_KEYS":"<generated-key>",
    "GOOGLE_AI_API_KEY":"<your-key>",
    "OPENAI_API_KEY":"<your-key>",
    "OPENROUTER_API_KEY":"<your-key>"
  }'
```

#### Step 5: Create ECS Task Definition

```json
{
  "family": "purpose-agnostic-agent",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "api",
      "image": "<account-id>.dkr.ecr.us-east-1.amazonaws.com/purpose-agnostic-agent:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "NODE_ENV", "value": "production"},
        {"name": "PORT", "value": "3000"},
        {"name": "SECRETS_PROVIDER", "value": "aws"},
        {"name": "AWS_SECRET_NAME", "value": "purpose-agnostic-agent/prod"}
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:region:account-id:secret:purpose-agnostic-agent/prod:DATABASE_URL::"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/purpose-agnostic-agent",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "api"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3
      }
    }
  ]
}
```

#### Step 6: Create ECS Service

```bash
aws ecs create-service \
  --cluster purpose-agnostic-agent-cluster \
  --service-name purpose-agnostic-agent \
  --task-definition purpose-agnostic-agent \
  --desired-count 3 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:...,containerName=api,containerPort=3000"
```

---

## Environment Configuration

### Production Environment Variables

```env
# Core
NODE_ENV=production
PORT=3000

# CORS
CORS_ORIGIN=https://yourdomain.com,https://app.yourdomain.com

# Authentication
JWT_SECRET=<generated-with-openssl>
JWT_EXPIRES_IN=24h
API_KEYS=<comma-separated-keys>

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db
DATABASE_SSL=true
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# Redis
REDIS_URL=redis://host:6379
REDIS_PASSWORD=<password>
REDIS_TLS=true

# LLM Providers
GOOGLE_AI_API_KEY=<your-key>
OPENAI_API_KEY=<your-key>
OPENROUTER_API_KEY=<your-key>
OLLAMA_URL=http://ollama:11434

# Secrets Management
SECRETS_PROVIDER=aws  # or azure, vault, env
AWS_SECRET_NAME=purpose-agnostic-agent/prod
AWS_REGION=us-east-1

# Observability
SEQ_URL=https://seq.yourdomain.com
PROMETHEUS_ENABLED=true
LOG_LEVEL=info

# Usage Tracking
USAGE_TRACKING_ENABLED=true
DAILY_REQUEST_LIMIT=1500
RPM_LIMIT=15

# Storage
STORAGE_TYPE=database
PERSONA_CONFIG_PATH=./config/personas.json

# Session Management
SESSION_EXPIRATION_HOURS=24
SESSION_CLEANUP_CRON=0 * * * *  # Every hour
```

---

## Database Setup

### PostgreSQL with pgvector

#### Option 1: Managed Service (Recommended)

**AWS RDS:**
```bash
# Create parameter group with pgvector
aws rds create-db-parameter-group \
  --db-parameter-group-name pgvector-params \
  --db-parameter-group-family postgres15 \
  --description "PostgreSQL with pgvector"

# Create instance
aws rds create-db-instance \
  --db-instance-identifier purpose-agnostic-agent-db \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 15.3 \
  --master-username admin \
  --master-user-password <password> \
  --allocated-storage 100 \
  --storage-type gp3 \
  --backup-retention-period 7 \
  --preferred-backup-window "03:00-04:00" \
  --db-parameter-group-name pgvector-params
```

**Azure Database for PostgreSQL:**
```bash
az postgres flexible-server create \
  --resource-group purpose-agnostic-agent-rg \
  --name purpose-agnostic-agent-db \
  --location eastus \
  --admin-user admin \
  --admin-password <password> \
  --sku-name Standard_D2s_v3 \
  --tier GeneralPurpose \
  --storage-size 128 \
  --version 15
```

#### Option 2: Self-Hosted

```bash
# Install PostgreSQL 15
sudo apt update
sudo apt install postgresql-15 postgresql-contrib-15

# Install pgvector
cd /tmp
git clone https://github.com/pgvector/pgvector.git
cd pgvector
make
sudo make install

# Enable extension
sudo -u postgres psql -c "CREATE EXTENSION vector;"
```

#### Initialize Database

```bash
# Connect to database
psql -h <host> -U <user> -d purpose_agnostic_agent

# Run initialization script
\i scripts/init-db.sql

# Verify tables
\dt

# Verify pgvector extension
SELECT * FROM pg_extension WHERE extname = 'vector';
```

---

## SSL/TLS Configuration

### Let's Encrypt with Certbot

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d api.yourdomain.com

# Auto-renewal (already configured by certbot)
sudo certbot renew --dry-run
```

### Manual Certificate

```bash
# Generate private key
openssl genrsa -out private.key 2048

# Generate CSR
openssl req -new -key private.key -out certificate.csr

# After receiving certificate from CA, configure Nginx
sudo cp certificate.crt /etc/ssl/certs/
sudo cp private.key /etc/ssl/private/
sudo chmod 600 /etc/ssl/private/private.key
```

---

## Monitoring Setup

### Prometheus + Grafana

```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./config/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    ports:
      - "9090:9090"
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'

  grafana:
    image: grafana/grafana:latest
    volumes:
      - grafana-data:/var/lib/grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=<password>

volumes:
  prometheus-data:
  grafana-data:
```

Start monitoring:
```bash
docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d
```

### Seq for Logs

```bash
docker run -d \
  --name seq \
  -e ACCEPT_EULA=Y \
  -v seq-data:/data \
  -p 5341:80 \
  datalust/seq:latest
```

---

## Troubleshooting

### Common Issues

#### 1. Database Connection Failed

```bash
# Check database is running
docker-compose ps postgres

# Check connection
psql -h localhost -U postgres -d purpose_agnostic_agent

# Check logs
docker-compose logs postgres
```

#### 2. Redis Connection Failed

```bash
# Check Redis is running
docker-compose ps redis

# Test connection
redis-cli -h localhost ping

# Check logs
docker-compose logs redis
```

#### 3. API Not Responding

```bash
# Check API logs
docker-compose logs api

# Check health endpoint
curl http://localhost:3000/health

# Check if port is listening
netstat -tulpn | grep 3000
```

#### 4. LLM Provider Failures

```bash
# Check API keys are set
docker-compose exec api env | grep API_KEY

# Test provider directly
curl -X POST http://localhost:3000/api/chat \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"agent_id":"test","question":"Hello"}'

# Check failover logs
docker-compose logs api | grep failover
```

#### 5. High Memory Usage

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

### Debug Mode

Enable debug logging:

```env
LOG_LEVEL=debug
```

Restart services:
```bash
docker-compose restart api
docker-compose logs -f api
```

---

## Rollback Procedure

### Docker Deployment

```bash
# Stop current version
docker-compose down

# Restore previous image
docker tag purpose-agnostic-agent:previous purpose-agnostic-agent:latest

# Start services
docker-compose up -d

# Verify
curl http://localhost:3000/health
```

### Kubernetes Deployment

```bash
# Rollback to previous revision
kubectl rollout undo deployment/purpose-agnostic-agent -n purpose-agnostic-agent

# Check rollout status
kubectl rollout status deployment/purpose-agnostic-agent -n purpose-agnostic-agent

# Verify
kubectl get pods -n purpose-agnostic-agent
```

---

## Post-Deployment Checklist

- [ ] Health checks passing
- [ ] API endpoints responding
- [ ] Authentication working
- [ ] Database connected
- [ ] Redis connected
- [ ] LLM providers accessible
- [ ] Logs being collected
- [ ] Metrics being recorded
- [ ] Alerts configured
- [ ] SSL certificate valid
- [ ] CORS configured correctly
- [ ] Rate limiting working
- [ ] Backups configured

---

## Support

For deployment issues:
- Review logs: `docker-compose logs -f`
- Check health: `curl http://localhost:3000/health/ready`
- Review documentation: `README.md`, `SECURITY_AUDIT.md`
- Contact: [your-support-email]

---

**Deployment Status:** Ready for Production 🚀  
**Last Updated:** 2026-02-24
