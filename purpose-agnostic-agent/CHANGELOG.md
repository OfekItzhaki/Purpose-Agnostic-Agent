# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial release of Purpose-Agnostic Agent
- RAG-only architecture with strict context-based responses
- Four-tier LLM failover (Gemini Pro → GPT-4o → Claude-3.5 → Ollama)
- Vector-based knowledge retrieval using pgvector
- Dynamic persona management with customizable style/tone
- REST API with session continuity
- Usage tracking for free tier API limits
- Optional RAG self-check validation
- Comprehensive observability (structured logging, metrics, health checks)
- Property-based testing suite with 80+ tests
- Docker-based deployment with docker-compose
- Production deployment guides and tools
- Security features (API key auth, rate limiting, input sanitization)

### Fixed
- Circular dependency in module imports preventing API startup
- TypeORM query optimization in knowledge chunk repository

### Documentation
- Complete README with quick start guide
- RAG-only architecture documentation
- Production deployment checklist
- Security setup guide
- Observability configuration guide
- API documentation with Swagger/OpenAPI
- Contributing guidelines
- Secrets generation guide

## [0.0.1] - 2024-02-25

### Added
- Initial project setup
- Core NestJS application structure
- Basic chat functionality
- RAG system implementation
- Model router with failover
- Persona management
- Authentication and authorization
- Database schema and migrations
- Docker configuration
- Test infrastructure

[Unreleased]: https://github.com/yourusername/purpose-agnostic-agent/compare/v0.0.1...HEAD
[0.0.1]: https://github.com/yourusername/purpose-agnostic-agent/releases/tag/v0.0.1
