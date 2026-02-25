# Contributing to Purpose-Agnostic Agent

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Development Setup

1. Fork and clone the repository
2. Install dependencies: `npm install`
3. Copy environment file: `cp .env.example .env`
4. Add your API keys to `.env`
5. Start Docker services: `npm run docker:up`
6. Run tests: `npm test`

## Development Workflow

### Before Committing

Run the precommit checks:

```bash
npm run precommit
```

This runs:
- Format check (Prettier)
- Lint check (ESLint)
- Type check (TypeScript)
- All tests (Jest)

### Code Style

- Use Prettier for formatting (config in `.prettierrc`)
- Follow ESLint rules (config in `eslint.config.mjs`)
- Write TypeScript with strict mode enabled
- Add JSDoc comments for public APIs

### Testing

- Write unit tests for all new features
- Use property-based tests (fast-check) for complex logic
- Maintain 80%+ code coverage
- Run tests before committing: `npm test`

### Commit Messages

Follow conventional commits format:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `test`: Test changes
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `chore`: Build/tooling changes

Examples:
```
feat(chat): add streaming response support
fix(rag): resolve vector search timeout issue
docs(readme): update installation instructions
test(persona): add property-based tests
```

Keep descriptions under 50 characters.

## Architecture Guidelines

### RAG-Only Principle

This system is **strictly RAG-only**. All contributions must maintain this principle:

- Answers MUST be based only on indexed documents
- Never use LLM general knowledge
- The core system prompt is immutable
- Personas can only customize style/tone

### Module Structure

Follow NestJS best practices:

```
src/
├── module-name/
│   ├── module-name.module.ts
│   ├── module-name.service.ts
│   ├── module-name.controller.ts
│   ├── dto/
│   ├── entities/
│   ├── interfaces/
│   └── repositories/
```

### Dependency Injection

- Use constructor injection
- Inject interfaces, not concrete classes
- Use `@Injectable()` decorator
- Avoid circular dependencies (use `forwardRef()` if necessary)

### Error Handling

- Use custom exceptions from `@nestjs/common`
- Log errors with context
- Return meaningful error messages
- Never expose sensitive information in errors

### Observability

- Log all important operations
- Use structured logging (JSON format)
- Add metrics for performance-critical operations
- Include request context in logs

## Testing Guidelines

### Unit Tests

- Test business logic in isolation
- Mock external dependencies
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)

Example:
```typescript
describe('ChatService', () => {
  describe('processMessage', () => {
    it('should return answer with citations when context is found', async () => {
      // Arrange
      const mockRagService = { search: jest.fn() };
      const service = new ChatService(mockRagService);
      
      // Act
      const result = await service.processMessage('test question');
      
      // Assert
      expect(result.answer).toBeDefined();
      expect(result.citations).toHaveLength(3);
    });
  });
});
```

### Property-Based Tests

Use fast-check for testing properties:

```typescript
import * as fc from 'fast-check';

it('should handle any valid persona configuration', () => {
  fc.assert(
    fc.property(
      fc.record({
        id: fc.string(),
        temperature: fc.float({ min: 0, max: 2 }),
        maxTokens: fc.integer({ min: 1, max: 4000 })
      }),
      (persona) => {
        const result = validatePersona(persona);
        expect(result.isValid).toBe(true);
      }
    )
  );
});
```

## Pull Request Process

1. Create a feature branch: `git checkout -b feat/my-feature`
2. Make your changes
3. Run precommit checks: `npm run precommit`
4. Commit with conventional commit message
5. Push to your fork
6. Open a pull request

### PR Requirements

- All tests must pass
- Code coverage must not decrease
- No TypeScript errors
- Documentation updated (if needed)
- Changelog updated (for significant changes)

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Property-based tests added (if applicable)
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests pass locally
```

## Documentation

- Update README.md for user-facing changes
- Add JSDoc comments for public APIs
- Update architecture docs for structural changes
- Include examples for new features

## Questions?

- Open an issue for bugs or feature requests
- Start a discussion for questions or ideas
- Check existing issues before creating new ones

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
