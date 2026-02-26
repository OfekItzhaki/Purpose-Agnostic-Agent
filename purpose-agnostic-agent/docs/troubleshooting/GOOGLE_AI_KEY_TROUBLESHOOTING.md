# Google AI API Key Troubleshooting Guide

## Current Issue
Your Google AI API key `AIzaSyC6X86RiVmYcZqdnPQnvzaHQ-GNE1wpDrS4` is returning:
```
API key not valid. Please pass a valid API key.
Error code: API_KEY_INVALID
```

## Verification Steps

### 1. Enable the Generative Language API
Google AI Studio keys require the Generative Language API to be enabled:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create one if needed)
3. Go to **APIs & Services** > **Library**
4. Search for "Generative Language API"
5. Click on it and press **Enable**
6. Wait 1-2 minutes for the API to be fully enabled

### 2. Check API Key Restrictions
Your API key might have restrictions that are blocking requests:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **Credentials**
3. Find your API key `AIzaSyC6X86RiVmYcZqdnPQnvzaHQ-GNE1wpDrS4`
4. Click on it to edit
5. Check the following sections:

**Application restrictions:**
- Should be set to **None** (or allow your server's IP)
- If set to "HTTP referrers" or "IP addresses", this will block Docker container requests

**API restrictions:**
- Should be set to **Don't restrict key** OR
- Explicitly allow "Generative Language API"

### 3. Create a Fresh API Key (Recommended)
If the above doesn't work, create a new unrestricted key:

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click **Create API Key**
3. Select **Create API key in new project** (or use existing project)
4. Copy the new key
5. Update `.env` file with the new key:
   ```bash
   GOOGLE_AI_API_KEY=your_new_key_here
   ```
6. Restart Docker containers:
   ```bash
   docker-compose down
   docker-compose up -d
   ```

### 4. Test the New Key
After creating a new key, test it immediately:

```powershell
$body = '{"contents":[{"parts":[{"text":"Hello"}]}]}'
Invoke-RestMethod -Uri "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=YOUR_NEW_KEY_HERE" -Method Post -ContentType "application/json" -Body $body
```

If successful, you should see a response like:
```json
{
  "candidates": [
    {
      "content": {
        "parts": [
          {
            "text": "Hello! How can I help you today?"
          }
        ]
      }
    }
  ]
}
```

## Common Issues

### Issue: "API key not valid"
**Cause:** Generative Language API not enabled or key has restrictions
**Solution:** Follow steps 1-3 above

### Issue: "API key expired"
**Cause:** Old or revoked key
**Solution:** Create a new key (step 3)

### Issue: "Quota exceeded"
**Cause:** Free tier limits reached
**Solution:** Wait for quota reset or upgrade to paid tier

## Alternative: Use OpenRouter Instead
If Google AI continues to have issues, you can use OpenRouter as your primary LLM provider:

1. Get a free API key from [OpenRouter](https://openrouter.ai/keys)
2. Update `.env`:
   ```bash
   OPENROUTER_API_KEY=your_openrouter_key_here
   ```
3. The system will automatically use OpenRouter's GPT-4o or Claude-3.5 as fallback

## Current System Status
✅ Embeddings working (Ollama with nomic-embed-text)
✅ Database healthy (PostgreSQL with pgvector)
✅ Cache healthy (Redis)
✅ Ollama healthy (local LLM available)
❌ Gemini API key invalid (needs fixing)
⚠️ OpenRouter not configured (optional fallback)
⚠️ OpenAI not configured (optional fallback)

## Next Steps
1. Try enabling the Generative Language API (step 1)
2. If that doesn't work, create a fresh unrestricted key (step 3)
3. Test the new key with the PowerShell command (step 4)
4. Restart Docker containers with the new key
5. Test the chat endpoint to verify it works

## Need Help?
If you continue to have issues:
1. Share a screenshot of your API key restrictions page
2. Share the exact error message from the test command
3. Verify the key was created in the last 24 hours
