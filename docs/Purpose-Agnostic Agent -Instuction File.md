# Project A: Universal Brain (LLM + MCP + RAG)

## 1. Core Concept
A purpose-agnostic backend that uses RAG and a configurable System Persona to act as any type of assistant.

## 2. Dynamic Persona Management
- **Persona Config:** A JSON file or DB table defining different agents.
  - `id`: "medical-doc", "legal-advisor", "coding-tutor"
  - `system_prompt`: "You are a [Role]. Your tone is [Tone]..."
  - `knowledge_category`: Matches a folder in the RAG system.
- **Request Flow:** Client sends `{ agent_id, question }` -> Backend loads Persona + retrieves RAG context -> LLM answers.

## 3. Tech Stack
- Framework: NestJS (TypeScript).
- Model Router: LiteLLM or Proxy for (OpenAI, Anthropic, Ollama) with failover.
- Vector DB: pgvector (PostgreSQL) or Qdrant.
- Protocol: MCP Server + REST/WS API.

## 4. RAG Implementation
- **Categorized Ingestion:** Files in `/knowledge/{category}/*.pdf` are indexed with a `category` metadata tag.
- **Search Tool:** `search_knowledge(query, category)` retrieves relevant chunks.

## 5. API Endpoints
- `POST /api/chat`: { agent_id, question, sessionId } -> { answer, citations, modelUsed }
- `GET /api/agents`: Returns list of available personas (e.g., Doctor, Assistant).
