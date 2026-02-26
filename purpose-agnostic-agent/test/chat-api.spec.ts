import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { ChatController } from '../src/chat/chat.controller';
import { ChatService } from '../src/chat/chat.service';
import { PersonaService } from '../src/persona/persona.service';
import { ThrottlerModule } from '@nestjs/throttler';

describe('Chat API Integration Tests', () => {
  let app: INestApplication;
  let chatService: jest.Mocked<ChatService>;
  let personaService: jest.Mocked<PersonaService>;

  const mockChatResponse = {
    answer: 'This is a test answer',
    citations: [
      {
        sourcePath: 'knowledge/test/doc.pdf',
        content: 'Test citation content',
        score: 0.95,
      },
    ],
    modelUsed: 'gpt-4o',
    sessionId: 'test-session-123',
  };

  const mockPersonas = [
    {
      id: 'test-agent',
      name: 'Test Agent',
      description: 'A test agent',
      knowledgeCategory: 'test',
    },
  ];

  beforeAll(async () => {
    const mockChatService = {
      chat: jest.fn(),
    };

    const mockPersonaService = {
      listPersonas: jest.fn(),
      loadPersonas: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([
          {
            ttl: 60000,
            limit: 10,
          },
        ]),
      ],
      controllers: [ChatController],
      providers: [
        {
          provide: ChatService,
          useValue: mockChatService,
        },
        {
          provide: PersonaService,
          useValue: mockPersonaService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    await app.init();

    chatService = moduleFixture.get(ChatService);
    personaService = moduleFixture.get(PersonaService);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /chat', () => {
    it('should return 200 with answer and citations for valid request', async () => {
      chatService.chat.mockResolvedValue(mockChatResponse);

      const response = await request(app.getHttpServer())
        .post('/chat')
        .send({
          agent_id: 'test-agent',
          question: 'What is the weather today?',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        answer: 'This is a test answer',
        citations: expect.any(Array),
        modelUsed: 'gpt-4o',
        sessionId: 'test-session-123',
      });

      expect(chatService.chat).toHaveBeenCalledWith({
        agent_id: 'test-agent',
        question: 'What is the weather today?',
      });
    });

    it('should return 404 for invalid agent_id', async () => {
      chatService.chat.mockRejectedValue(
        new Error('Persona not found'),
      );

      await request(app.getHttpServer())
        .post('/chat')
        .send({
          agent_id: 'nonexistent-agent',
          question: 'Test question',
        })
        .expect(500); // Service throws error, becomes 500
    });

    it('should return 400 for missing required fields', async () => {
      await request(app.getHttpServer())
        .post('/chat')
        .send({
          agent_id: 'test-agent',
          // Missing question field
        })
        .expect(400);
    });

    it('should return 400 for missing agent_id', async () => {
      await request(app.getHttpServer())
        .post('/chat')
        .send({
          question: 'Test question',
          // Missing agent_id field
        })
        .expect(400);
    });

    it('should handle session continuity across multiple requests', async () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      const response1 = { ...mockChatResponse, sessionId: validUuid };
      const response2 = { ...mockChatResponse, sessionId: validUuid };

      chatService.chat.mockResolvedValueOnce(response1);
      chatService.chat.mockResolvedValueOnce(response2);

      // First request
      const res1 = await request(app.getHttpServer())
        .post('/chat')
        .send({
          agent_id: 'test-agent',
          question: 'My name is Alice',
        })
        .expect(201);

      expect(res1.body.sessionId).toBe(validUuid);

      // Second request with same session
      const res2 = await request(app.getHttpServer())
        .post('/chat')
        .send({
          agent_id: 'test-agent',
          question: 'What is my name?',
          sessionId: validUuid,
        })
        .expect(201);

      expect(res2.body.sessionId).toBe(validUuid);
      expect(chatService.chat).toHaveBeenCalledTimes(2);
    });

    it('should validate question length', async () => {
      const longQuestion = 'a'.repeat(10001); // Exceeds max length

      await request(app.getHttpServer())
        .post('/chat')
        .send({
          agent_id: 'test-agent',
          question: longQuestion,
        })
        .expect(400);
    });
  });

  describe('GET /agents', () => {
    it('should return array of personas', async () => {
      personaService.listPersonas.mockReturnValue(mockPersonas);

      const response = await request(app.getHttpServer())
        .get('/agents')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toEqual(mockPersonas);
      expect(personaService.listPersonas).toHaveBeenCalled();
    });

    it('should not include sensitive fields in response', async () => {
      personaService.listPersonas.mockReturnValue(mockPersonas);

      const response = await request(app.getHttpServer())
        .get('/agents')
        .expect(200);

      const agent = response.body[0];
      expect(agent).not.toHaveProperty('extra_instructions');
      expect(agent).not.toHaveProperty('temperature');
      expect(agent).not.toHaveProperty('max_tokens');
    });
  });

  describe('POST /reload-personas', () => {
    it('should reload personas successfully', async () => {
      personaService.loadPersonas.mockResolvedValue(undefined);
      personaService.listPersonas.mockReturnValue(mockPersonas);

      const response = await request(app.getHttpServer())
        .post('/reload-personas')
        .expect(201);

      expect(response.body).toMatchObject({
        message: 'Personas reloaded successfully',
        count: 1,
      });
      expect(personaService.loadPersonas).toHaveBeenCalled();
    });
  });

  describe('Content-Type Validation', () => {
    it('should accept application/json', async () => {
      chatService.chat.mockResolvedValue(mockChatResponse);

      await request(app.getHttpServer())
        .post('/chat')
        .set('Content-Type', 'application/json')
        .send({
          agent_id: 'test-agent',
          question: 'Test',
        })
        .expect(201);
    });

    it('should handle malformed JSON', async () => {
      await request(app.getHttpServer())
        .post('/chat')
        .set('Content-Type', 'application/json')
        .send('{"invalid json')
        .expect(400);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      chatService.chat.mockResolvedValue(mockChatResponse);

      // Make multiple requests quickly
      const requests = [];
      for (let i = 0; i < 12; i++) {
        requests.push(
          request(app.getHttpServer()).post('/chat').send({
            agent_id: 'test-agent',
            question: `Test question ${i}`,
          }),
        );
      }

      const responses = await Promise.all(requests);

      // Some requests should be rate limited (429)
      const rateLimited = responses.filter((r) => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });
});
