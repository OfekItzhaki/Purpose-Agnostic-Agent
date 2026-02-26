# Security Setup Guide
**Purpose-Agnostic Agent Backend**

This guide walks you through securing your Purpose-Agnostic Agent deployment.

---

## Table of Contents
1. [Authentication Setup](#1-authentication-setup)
2. [CORS Configuration](#2-cors-configuration)
3. [Secrets Management](#3-secrets-management)
4. [API Key Generation](#4-api-key-generation)
5. [Production Checklist](#5-production-checklist)

---

## 1. Authentication Setup

### 1.1 JWT Authentication

The system supports JWT (JSON Web Token) authentication for user-facing endpoints.

**Generate a secure JWT secret:**
```bash
openssl rand -base64 32
```

**Add to .env:**
```env
JWT_SECRET=your_generated_secret_here
JWT_EXPIRES_IN=24h
```

### 1.2 Protecting Endpoints

**Option A: Protect all endpoints by default (Recommended)**

Update `app.module.ts`:
```typescript
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

providers: [
  {
    provide: APP_GUARD,
    useClass: JwtAuthGuard,
  },
]
```

Then mark public endpoints with `@Public()` decorator:
```typescript
import { Public } from '../auth/decorators/public.decorator';

@Public()
@Get('health')
getHealth() {
  // ...
}
```

**Option B: Protect specific endpoints**

Add guards to controllers:
```typescript
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('api/personas')
export class PersonaController {
  // All routes protected
}
```

### 1.3 Role-Based Access Control

Protect admin endpoints:
```typescript
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Post('personas')
createPersona() {
  // Only admins can create personas
}
```

---

## 2. CORS Configuration

### 2.1 Development Setup

For local development with frontend on localhost:3000:
```env
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
```

### 2.2 Production Setup

**Single domain:**
```env
CORS_ORIGIN=https://yourdomain.com
```

**Multiple domains:**
```env
CORS_ORIGIN=https://yourdomain.com,https://app.yourdomain.com,https://admin.yourdomain.com
```

### 2.3 Wildcard Subdomains

For wildcard subdomain support, modify `main.ts`:
```typescript
app.enableCors({
  origin: (origin, callback) => {
    const allowedDomains = ['yourdomain.com'];
    if (!origin || allowedDomains.some(domain => origin.endsWith(domain))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
});
```

---

## 3. Secrets Management

### 3.1 Development (Local)

Use `.env` file (never commit to git):
```bash
cp .env.example .env
# Edit .env with your secrets
```

Verify `.gitignore` includes:
```
.env
.env.local
.env.*.local
```

### 3.2 Production (Recommended)

**Option A: AWS Secrets Manager**
```bash
# Store secret
aws secretsmanager create-secret \
  --name purpose-agnostic-agent/prod \
  --secret-string '{"JWT_SECRET":"...","OPENAI_API_KEY":"..."}'

# Retrieve in application
import { SecretsManager } from 'aws-sdk';
const secrets = await secretsManager.getSecretValue({ SecretId: 'purpose-agnostic-agent/prod' }).promise();
```

**Option B: Azure Key Vault**
```bash
# Store secret
az keyvault secret set \
  --vault-name your-vault \
  --name JWT-SECRET \
  --value "your-secret"

# Retrieve in application
import { SecretClient } from '@azure/keyvault-secrets';
const secret = await client.getSecret('JWT-SECRET');
```

**Option C: HashiCorp Vault**
```bash
# Store secret
vault kv put secret/purpose-agnostic-agent \
  JWT_SECRET="your-secret" \
  OPENAI_API_KEY="your-key"

# Retrieve in application
import * as vault from 'node-vault';
const secrets = await vault.read('secret/data/purpose-agnostic-agent');
```

**Option D: Docker Secrets (Docker Swarm)**
```yaml
# docker-compose.yml
services:
  api:
    secrets:
      - jwt_secret
      - openai_api_key

secrets:
  jwt_secret:
    external: true
  openai_api_key:
    external: true
```

### 3.3 Environment-Specific Secrets

Use different secrets per environment:
```
JWT_SECRET_DEV=dev-secret-here
JWT_SECRET_STAGING=staging-secret-here
JWT_SECRET_PROD=prod-secret-here
```

---

## 4. API Key Generation

### 4.1 Generate API Keys

**For MCP clients and service-to-service auth:**
```bash
# Generate a secure API key
openssl rand -hex 32

# Output: pak_a1b2c3d4e5f6...
```

**Add to .env:**
```env
API_KEYS=pak_a1b2c3d4e5f6...,pak_another_key_here
```

### 4.2 Using API Keys

**In HTTP requests:**
```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "X-API-Key: pak_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

**In MCP client configuration:**
```json
{
  "mcpServers": {
    "purpose-agnostic-agent": {
      "url": "http://localhost:3000/api/mcp",
      "headers": {
        "X-API-Key": "pak_your_api_key_here"
      }
    }
  }
}
```

### 4.3 API Key Rotation

**Best practices:**
1. Rotate keys every 90 days
2. Use different keys per client/service
3. Revoke compromised keys immediately
4. Log API key usage for auditing

**Rotation process:**
```bash
# 1. Generate new key
NEW_KEY=$(openssl rand -hex 32)

# 2. Add to API_KEYS (keep old key temporarily)
API_KEYS=pak_old_key,pak_new_key

# 3. Update clients to use new key
# 4. Remove old key after grace period
API_KEYS=pak_new_key
```

---

## 5. Production Checklist

### 5.1 Before Deployment

- [ ] Change JWT_SECRET from default
- [ ] Generate unique API keys
- [ ] Configure CORS whitelist (no wildcards)
- [ ] Set up secrets management (vault)
- [ ] Enable HTTPS only
- [ ] Set NODE_ENV=production
- [ ] Configure rate limiting per user
- [ ] Set up database backups
- [ ] Configure log aggregation
- [ ] Set up monitoring/alerting

### 5.2 Security Headers

Verify security headers are set:
```bash
curl -I https://your-api.com/health

# Should include:
# Content-Security-Policy: ...
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# Strict-Transport-Security: max-age=31536000
```

### 5.3 SSL/TLS Configuration

**Use Let's Encrypt for free SSL:**
```bash
# Install certbot
sudo apt-get install certbot

# Generate certificate
sudo certbot certonly --standalone -d your-api.com

# Configure nginx
server {
  listen 443 ssl;
  ssl_certificate /etc/letsencrypt/live/your-api.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/your-api.com/privkey.pem;
  
  # Strong SSL configuration
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers HIGH:!aNULL:!MD5;
  ssl_prefer_server_ciphers on;
}
```

### 5.4 Firewall Rules

**Allow only necessary ports:**
```bash
# UFW (Ubuntu)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable

# AWS Security Group
# Inbound: 443 (HTTPS) from 0.0.0.0/0
# Inbound: 22 (SSH) from your IP only
# Outbound: All traffic
```

### 5.5 Database Security

**PostgreSQL hardening:**
```sql
-- Create dedicated user with limited permissions
CREATE USER purpose_agnostic_agent WITH PASSWORD 'strong-password';
GRANT CONNECT ON DATABASE purpose_agnostic_agent TO purpose_agnostic_agent;
GRANT USAGE ON SCHEMA public TO purpose_agnostic_agent;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO purpose_agnostic_agent;

-- Disable remote root access
-- Edit postgresql.conf:
listen_addresses = 'localhost'

-- Require SSL connections
ssl = on
ssl_cert_file = '/path/to/server.crt'
ssl_key_file = '/path/to/server.key'
```

### 5.6 Rate Limiting

**Per-user rate limiting:**
```typescript
// Update app.module.ts
ThrottlerModule.forRoot([
  {
    ttl: 60000,
    limit: 100,
    // Use user ID for per-user limits
    getTracker: (req) => req.user?.id || req.ip,
  },
]),
```

### 5.7 Monitoring

**Set up alerts for:**
- Failed authentication attempts (> 10/min)
- Rate limit violations
- 5xx errors (> 1% of requests)
- High response times (> 2s)
- Database connection failures
- LLM provider failures

---

## 6. Security Incident Response

### 6.1 Compromised API Key

```bash
# 1. Immediately revoke the key
# Remove from API_KEYS in .env

# 2. Check logs for unauthorized usage
grep "pak_compromised_key" /var/log/app.log

# 3. Generate new key
openssl rand -hex 32

# 4. Notify affected clients
# 5. Review access logs for suspicious activity
```

### 6.2 Suspected Breach

1. **Isolate:** Take affected systems offline
2. **Assess:** Review logs, identify scope
3. **Contain:** Revoke all credentials
4. **Eradicate:** Patch vulnerabilities
5. **Recover:** Restore from clean backups
6. **Review:** Post-mortem analysis

---

## 7. Compliance

### 7.1 GDPR Compliance

- [ ] Implement data deletion endpoint
- [ ] Add data export functionality
- [ ] Document data retention policy
- [ ] Obtain user consent for data processing
- [ ] Implement audit logging
- [ ] Designate Data Protection Officer

### 7.2 SOC 2 Compliance

- [ ] Implement access controls
- [ ] Enable audit logging
- [ ] Set up monitoring/alerting
- [ ] Document security policies
- [ ] Conduct regular security audits
- [ ] Implement incident response plan

---

## 8. Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NestJS Security Best Practices](https://docs.nestjs.com/security/authentication)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/security.html)

---

**Last Updated:** 2026-02-24  
**Next Review:** After authentication implementation
