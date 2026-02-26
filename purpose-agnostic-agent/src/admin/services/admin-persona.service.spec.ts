import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AdminPersonaService } from './admin-persona.service.js';
import { PersonaService } from '../../persona/persona.service.js';
import { PersonaEntity } from '../../persona/entities/persona.entity.js';
import { KnowledgeCategoryRepository } from '../repositories/knowledge-category.repository.js';

describe('AdminPersonaService', () => {
  let service: AdminPersonaService;
  let personaRepository: Repository<PersonaEntity>;
  let categoryRepository: KnowledgeCategoryRepository;

  const mockPersonaService = {
    getPersona: jest.fn(),
    listPersonas: jest.fn(),
  };

  const mockPersonaRepository = {
    count: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    query: jest.fn(),
  };

  const mockCategoryRepository = {
    findByName: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminPersonaService,
        {
          provide: PersonaService,
          useValue: mockPersonaService,
        },
        {
          provide: getRepositoryToken(PersonaEntity),
          useValue: mockPersonaRepository,
        },
        {
          provide: KnowledgeCategoryRepository,
          useValue: mockCategoryRepository,
        },
      ],
    }).compile();

    service = module.get<AdminPersonaService>(AdminPersonaService);
    personaRepository = module.get<Repository<PersonaEntity>>(
      getRepositoryToken(PersonaEntity),
    );
    categoryRepository = module.get<KnowledgeCategoryRepository>(
      KnowledgeCategoryRepository,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllPersonas', () => {
    it('should return paginated personas', async () => {
      const mockEntities = [
        {
          id: 'test-persona',
          name: 'Test Persona',
          description: 'Test description',
          extra_instructions: 'Test instructions',
          knowledge_category: 'general',
          temperature: 0.7,
          max_tokens: 1000,
          created_at: new Date('2024-01-01'),
          updated_at: new Date('2024-01-01'),
        },
      ];

      mockPersonaRepository.count.mockResolvedValue(1);
      mockPersonaRepository.find.mockResolvedValue(mockEntities);

      const result = await service.getAllPersonas(1, 10);

      expect(result).toEqual({
        personas: [
          {
            id: 'test-persona',
            name: 'Test Persona',
            description: 'Test description',
            extraInstructions: 'Test instructions',
            knowledgeCategory: 'general',
            temperature: 0.7,
            maxTokens: 1000,
            created_at: new Date('2024-01-01'),
            updated_at: new Date('2024-01-01'),
          },
        ],
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      });

      expect(mockPersonaRepository.count).toHaveBeenCalled();
      expect(mockPersonaRepository.find).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        order: { created_at: 'DESC' },
      });
    });

    it('should throw BadRequestException for invalid page number', async () => {
      await expect(service.getAllPersonas(0, 10)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for invalid page size', async () => {
      await expect(service.getAllPersonas(1, 0)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.getAllPersonas(1, 101)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getPersonaById', () => {
    it('should return persona with details', async () => {
      const mockEntity = {
        id: 'test-persona',
        name: 'Test Persona',
        description: 'Test description',
        extra_instructions: 'Test instructions',
        knowledge_category: 'general',
        temperature: 0.7,
        max_tokens: 1000,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
      };

      mockPersonaRepository.findOne.mockResolvedValue(mockEntity);

      const result = await service.getPersonaById('test-persona');

      expect(result).toEqual({
        id: 'test-persona',
        name: 'Test Persona',
        description: 'Test description',
        extraInstructions: 'Test instructions',
        knowledgeCategory: 'general',
        temperature: 0.7,
        maxTokens: 1000,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
      });

      expect(mockPersonaRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'test-persona' },
      });
    });

    it('should throw NotFoundException when persona not found', async () => {
      mockPersonaRepository.findOne.mockResolvedValue(null);

      await expect(service.getPersonaById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('checkPersonaInUse', () => {
    it('should return count of active sessions using persona', async () => {
      mockPersonaRepository.query.mockResolvedValue([{ count: '5' }]);

      const result = await service.checkPersonaInUse('test-persona');

      expect(result).toBe(5);
      expect(mockPersonaRepository.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT COUNT(*) as count'),
        ['test-persona'],
      );
    });

    it('should return 0 when persona has no active sessions', async () => {
      mockPersonaRepository.query.mockResolvedValue([{ count: '0' }]);

      const result = await service.checkPersonaInUse('unused-persona');

      expect(result).toBe(0);
    });

    it('should only count active sessions (not expired)', async () => {
      mockPersonaRepository.query.mockResolvedValue([{ count: '3' }]);

      const result = await service.checkPersonaInUse('test-persona');

      expect(result).toBe(3);
      expect(mockPersonaRepository.query).toHaveBeenCalledWith(
        expect.stringContaining('expires_at IS NULL OR expires_at > NOW()'),
        ['test-persona'],
      );
    });
  });

  describe('validatePersonaConfig', () => {
    it('should validate correct persona configuration', async () => {
      mockCategoryRepository.findByName.mockResolvedValue({ name: 'general' });

      const result = await service.validatePersonaConfig({
        id: 'test-persona',
        temperature: 0.7,
        maxTokens: 1000,
        knowledgeCategory: 'general',
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid persona id format', async () => {
      const result = await service.validatePersonaConfig({
        id: 'Test_Persona',
        knowledgeCategory: 'general',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Persona id must contain only lowercase letters, numbers, and hyphens',
      );
    });

    it('should reject persona id with uppercase letters', async () => {
      const result = await service.validatePersonaConfig({
        id: 'TestPersona',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Persona id must contain only lowercase letters, numbers, and hyphens',
      );
    });

    it('should reject persona id with special characters', async () => {
      const result = await service.validatePersonaConfig({
        id: 'test@persona',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Persona id must contain only lowercase letters, numbers, and hyphens',
      );
    });

    it('should accept valid persona id formats', async () => {
      mockCategoryRepository.findByName.mockResolvedValue({ name: 'general' });

      const result1 = await service.validatePersonaConfig({
        id: 'test-persona',
        knowledgeCategory: 'general',
      });
      expect(result1.valid).toBe(true);

      const result2 = await service.validatePersonaConfig({
        id: 'test123',
        knowledgeCategory: 'general',
      });
      expect(result2.valid).toBe(true);

      const result3 = await service.validatePersonaConfig({
        id: 'test-persona-123',
        knowledgeCategory: 'general',
      });
      expect(result3.valid).toBe(true);
    });

    it('should reject invalid temperature', async () => {
      const result1 = await service.validatePersonaConfig({
        id: 'test-persona',
        temperature: -0.1,
      });

      expect(result1.valid).toBe(false);
      expect(result1.errors).toContain(
        'Temperature must be a number between 0.0 and 1.0',
      );

      const result2 = await service.validatePersonaConfig({
        id: 'test-persona',
        temperature: 1.5,
      });

      expect(result2.valid).toBe(false);
      expect(result2.errors).toContain(
        'Temperature must be a number between 0.0 and 1.0',
      );
    });

    it('should accept valid temperature boundary values', async () => {
      mockCategoryRepository.findByName.mockResolvedValue({ name: 'general' });

      const result1 = await service.validatePersonaConfig({
        id: 'test-persona',
        temperature: 0.0,
        knowledgeCategory: 'general',
      });
      expect(result1.valid).toBe(true);

      const result2 = await service.validatePersonaConfig({
        id: 'test-persona',
        temperature: 1.0,
        knowledgeCategory: 'general',
      });
      expect(result2.valid).toBe(true);

      const result3 = await service.validatePersonaConfig({
        id: 'test-persona',
        temperature: 0.5,
        knowledgeCategory: 'general',
      });
      expect(result3.valid).toBe(true);
    });

    it('should reject invalid max_tokens', async () => {
      const result1 = await service.validatePersonaConfig({
        id: 'test-persona',
        maxTokens: 0,
      });

      expect(result1.valid).toBe(false);
      expect(result1.errors).toContain('max_tokens must be a positive integer');

      const result2 = await service.validatePersonaConfig({
        id: 'test-persona',
        maxTokens: -100,
      });

      expect(result2.valid).toBe(false);
      expect(result2.errors).toContain('max_tokens must be a positive integer');

      const result3 = await service.validatePersonaConfig({
        id: 'test-persona',
        maxTokens: 100.5,
      });

      expect(result3.valid).toBe(false);
      expect(result3.errors).toContain('max_tokens must be a positive integer');
    });

    it('should reject non-existent knowledge category', async () => {
      mockCategoryRepository.findByName.mockResolvedValue(null);

      const result = await service.validatePersonaConfig({
        id: 'test-persona',
        knowledgeCategory: 'non-existent',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Knowledge category 'non-existent' does not exist",
      );
    });

    it('should accumulate multiple validation errors', async () => {
      mockCategoryRepository.findByName.mockResolvedValue(null);

      const result = await service.validatePersonaConfig({
        id: 'Invalid_ID',
        temperature: 2.0,
        maxTokens: -5,
        knowledgeCategory: 'non-existent',
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });
});
