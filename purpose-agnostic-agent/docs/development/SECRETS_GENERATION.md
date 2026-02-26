# Secrets Generation Guide

This guide helps you generate secure secrets for production deployment.

## Quick Start

### Using OpenSSL (Linux/Mac)

```bash
# Generate JWT Secret (Base64, 32 bytes)
openssl rand -base64 32

# Generate API Keys (Hex, 32 bytes)
openssl rand -hex 32
openssl rand -hex 32
```

### Using PowerShell (Windows)

```powershell
# Generate JWT Secret (Base64)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))

# Generate API Keys (Alphanumeric, 64 characters)
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})
```

### Using Node.js

```javascript
// Generate JWT Secret
const crypto = require('crypto');
console.log(crypto.randomBytes(32).toString('base64'));

// Generate API Keys
console.log(crypto.randomBytes(32).toString('hex'));
console.log(crypto.randomBytes(32).toString('hex'));
```

## Required Secrets

### 1. JWT_SECRET
- **Purpose**: Signs and verifies JWT tokens for authentication
- **Format**: Base64 string, minimum 32 bytes
- **Example**: `KJaszlStB7uvCqgc8skZ5tVsK/G2hg9NP45fcG4yn9Y=`
- **Security**: NEVER reuse across environments, NEVER commit to git

### 2. ADMIN_API_KEY
- **Purpose**: Authenticates admin-level API requests
- **Format**: Hex string, minimum 32 bytes (64 characters)
- **Example**: `eC08GHcX6QNqPvRoMI9LOwru32ZagDJyBdlYsTWFUES7pbA4im1V5zxtknhfjK`
- **Security**: Store securely, rotate regularly

### 3. USER_API_KEY
- **Purpose**: Authenticates user-level API requests
- **Format**: Hex string, minimum 32 bytes (64 characters)
- **Example**: `HpYixG1u08AkEF2JDNt49aUfPd7QB3csrehROnzCbg5ZVW6MvywoTLjSKlImqX`
- **Security**: Store securely, rotate regularly

## Production Setup Checklist

- [ ] Generate unique JWT_SECRET for production
- [ ] Generate unique ADMIN_API_KEY for production
- [ ] Generate unique USER_API_KEY for production
- [ ] Store secrets in secure secrets manager (AWS Secrets Manager, Azure Key Vault, HashiCorp Vault)
- [ ] Configure CORS_ORIGINS with actual frontend domains
- [ ] Set NODE_ENV=production
- [ ] Verify secrets are NOT in version control
- [ ] Document secret rotation schedule (recommended: every 90 days)
- [ ] Set up monitoring for failed authentication attempts

## Secrets Management Best Practices

### DO:
✅ Use a secrets manager (AWS, Azure, Vault)
✅ Generate unique secrets for each environment
✅ Rotate secrets regularly (every 90 days)
✅ Use strong, cryptographically random values
✅ Restrict access to secrets (principle of least privilege)
✅ Monitor and audit secret access
✅ Have a secret rotation plan

### DON'T:
❌ Commit secrets to version control
❌ Share secrets via email or chat
❌ Reuse secrets across environments
❌ Use weak or predictable secrets
❌ Store secrets in plain text files
❌ Log secrets in application logs
❌ Hardcode secrets in source code

## Using Secrets Manager

### AWS Secrets Manager

```bash
# Store JWT secret
aws secretsmanager create-secret \
  --name purpose-agnostic-agent/jwt-secret \
  --secret-string "YOUR_JWT_SECRET"

# Store API keys
aws secretsmanager create-secret \
  --name purpose-agnostic-agent/admin-api-key \
  --secret-string "YOUR_ADMIN_API_KEY"
```

### Azure Key Vault

```bash
# Store JWT secret
az keyvault secret set \
  --vault-name your-vault-name \
  --name jwt-secret \
  --value "YOUR_JWT_SECRET"

# Store API keys
az keyvault secret set \
  --vault-name your-vault-name \
  --name admin-api-key \
  --value "YOUR_ADMIN_API_KEY"
```

### HashiCorp Vault

```bash
# Store JWT secret
vault kv put secret/purpose-agnostic-agent/jwt-secret value="YOUR_JWT_SECRET"

# Store API keys
vault kv put secret/purpose-agnostic-agent/admin-api-key value="YOUR_ADMIN_API_KEY"
```

## Secret Rotation

### When to Rotate:
- Every 90 days (scheduled rotation)
- When an employee with access leaves
- After a security incident
- When secrets may have been exposed

### Rotation Process:
1. Generate new secrets
2. Update secrets in secrets manager
3. Deploy new version with updated secrets
4. Verify application works with new secrets
5. Revoke old secrets after grace period
6. Document rotation in audit log

## Emergency Response

If secrets are compromised:

1. **Immediate Actions**:
   - Generate new secrets immediately
   - Update secrets in production
   - Revoke compromised secrets
   - Force logout all users (invalidate JWT tokens)

2. **Investigation**:
   - Review access logs
   - Identify scope of exposure
   - Document incident

3. **Prevention**:
   - Review security practices
   - Update access controls
   - Implement additional monitoring

## Verification

After setting up secrets, verify:

```bash
# Test JWT authentication
curl -X POST http://localhost:3000/api/chat \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"agent_id":"default","question":"test"}'

# Test API key authentication
curl -X POST http://localhost:3000/api/mcp \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"method":"tools/list"}'
```

## Support

For questions or issues:
- Review SECURITY_AUDIT.md
- Review docs/SECURITY_SETUP.md
- Check application logs
- Contact security team

---

**Last Updated**: 2026-02-25
**Version**: 1.0.0
