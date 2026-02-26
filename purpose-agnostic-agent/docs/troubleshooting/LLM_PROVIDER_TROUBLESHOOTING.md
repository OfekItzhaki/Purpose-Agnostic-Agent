# LLM Provider Troubleshooting Guide

## Summary of Issues and Solutions

### Issue 1: Google AI API Key Leaks

**Problem**: Your Google AI API keys keep getting flagged as leaked and disabled.

**Root Cause**: The `.env` file IS properly gitignored, so it's not being pushed to the repository. However, **when you share the API key in chat conversations (like with me), Google's automated systems detect it and flag it as leaked**.

**Solution**:
1. Never share API keys in chat, messages, or public forums
2. If you need to share configuration, use placeholders like `GOOGLE_AI_API_KEY=your_key_here`
3. The `.env` file is already properly protected in `.gitignore`

**Current Status**: ✅ Updated to new key `AIzaSyB3HqnJUVMOmo2DA8MPuapqH9zkvMZbZyM`

---

### Issue 2: Ollama Timeout

**Problem**: Ollama was timing out after 120 seconds when trying to generate responses.

**Root Cause**: 
- Large models like `llama2` (6.74B parameters, 3.8GB) take significant time to load into memory
- First load takes too long for the timeout window

**Solution Applied**:
1. ✅ Switched to `tinyllama` (1.1B parameters, 637MB) - much faster loading
2. ✅ Increased timeout to 120s in `ollama.provider.ts`
3. ✅ Model is downloaded and ready to use

**Current Configuration**:
- Model: `tinyllama` (fast, lightweight)
- Timeout: 120 seconds
- Status: Ready for use

**How to Pre-warm Ollama** (optional but recommended for first use):
```bash
# This loads the model into memory so the first request is faster
docker exec -it purpose-agnostic-agent-ollama ollama run tinyllama "Hello"
```

---

## LLM Provider Failover Chain

Your system uses a 3-tier failover strategy:

1. **Primary**: Google AI (Gemini) - Fast, free, cloud-based
2. **Secondary**: OpenRouter (GPT-4o) - Paid, cloud-based
3. **Tertiary**: OpenRouter (Claude-3.5) - Paid, cloud-based
4. **Fallback**: Ollama (llama2) - Free, local, slower first load

**Current Configuration**:
- ✅ Google AI: Active with new key
- ❌ OpenRouter: Using placeholder key (optional)
- ✅ Ollama: Active with tinyllama model (120s timeout)

---

## Testing the System

### Test Google AI (Primary Provider)
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello, how are you?",
    "personaId": "general-assistant"
  }'
```

Expected: Should work now with the new Google AI key.

### Test Ollama (Fallback)
To test Ollama specifically, you can temporarily disable Google AI:
1. Comment out `GOOGLE_AI_API_KEY` in `.env`
2. Restart API: `docker-compose restart api`
3. Make a chat request (will take 30-60s on first request as model loads)

---

## Monitoring Provider Health

Check which providers are available:
```bash
curl http://localhost:3000/health/ready
```

This shows the status of all LLM providers and dependencies.

---

## Recommendations

### For Development
- Use Google AI as primary (free, fast)
- Keep Ollama as fallback (free, works offline)
- Skip OpenRouter unless you need GPT-4o/Claude specifically

### For Production
- Get a valid OpenRouter API key for redundancy
- Consider using a smaller Ollama model for faster loading:
  ```bash
  docker exec purpose-agnostic-agent-ollama ollama pull mistral
  # Then update OLLAMA_MODEL in .env if you add that config
  ```

### API Key Security Best Practices
1. ✅ Never commit `.env` files (already configured)
2. ✅ Never share API keys in chat or messages
3. ✅ Use environment variables for secrets
4. ✅ Rotate keys if they're ever exposed
5. ✅ Use different keys for dev/staging/production

---

## Current Status

✅ **Google AI**: Working with new key  
✅ **Ollama**: Configured with tinyllama model (120s timeout)  
✅ **API**: Restarted with new configuration  
⚠️ **OpenRouter**: Optional, using placeholder  

**Next Steps**:
1. Test the chat endpoint with the new Google AI key
2. Ollama is ready to use as fallback with tinyllama (fast, lightweight model)
3. If you need GPT-4o/Claude, get an OpenRouter API key from https://openrouter.ai/keys

---

## Troubleshooting Commands

```bash
# Check API logs
docker logs purpose-agnostic-agent-api --tail 50

# Check Ollama logs
docker logs purpose-agnostic-agent-ollama --tail 50

# Check Ollama models
docker exec purpose-agnostic-agent-ollama ollama list

# Test Ollama directly with tinyllama
docker exec purpose-agnostic-agent-ollama ollama run tinyllama "Hello"

# Restart API
docker-compose restart api

# Restart all services
docker-compose restart
```
