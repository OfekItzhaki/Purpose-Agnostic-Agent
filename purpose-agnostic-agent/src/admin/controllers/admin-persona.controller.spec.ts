import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { AdminPersonaController } from './admin-persona.controller.js';
import { AdminPersonaService } from '../services/admin-persona.service.js';
import { AdminPersonaTestService } from '../services/admin-persona-test.service.js';
import { PersonaService } from '../../persona/persona.service.js';
import { AdminAuthGuard } from '../guards/admin-auth.guard.js';
import { CreateAdminPersonaDto } from '../dto/create-admin-persona.dto.js';
import { UpdateAdminPersonaDto } from '../dto/update-admin-persona.dto.js';
import { TestPersonaDto } from '../dto/test-persona.dto.js';

describe('AdminPersonaController', () => {
  let controller: AdminPersonaController;
  let adminPersonaService: jest.Mocked<AdminPersonaService>;
  let adminPersonaTestService: jest.Mocked<AdminPersonaTestService>;
  let personaService: jest.Mocked<PersonaService>;

  beforeEach(async () => {
    const mockAdminPersonaService = {
      getAllPersonas: jest.fn(),
      getPersonaById: jest.fn(),
      validatePersonaConfig: jest.fn(),
      checkPersonaInUse: jest.fn(),
    };

    const mockAdminPersonaTestService = {
      testPersona: jest.fn(),
    };

    const mockPersonaService = {
      createPersona: jest.fn(),
      updatePersona: jest.fn(),
      deletePersona: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminPersonaController],
      providers: [
        {
          provide: AdminPersonaService,
          useValue: mockAdminPersonaService,
        },
        {
          provide: AdminPersonaTestService,
          useValue: mockAdminPersonaTestService,
        },
        {
          provide: PersonaService,
          useValue: mockPersonaService,
        },
      ],
    })
      .overrideGuard(AdminAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminPersonaController>(AdminPersonaController);
    adminPersonaService = module.get(AdminPersonaService);
    adminPersonaTestService = module.get(AdminPersonaTestService);
    personaService = module.get(PersonaService);
  });

  describe('listPersonas', () => {
    it('should return paginated personas with default parameters', async () => {
      const mockResult = {
        personas: [
          {
            id: 'test-persona',
            name: 'Test Persona',
            description: 'Test description',
            knowledgeCategory: 'general',
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      };

      adminPersonaService.getAllPersonas.mockResolvedValue(mockResult);

      const result = await controller.listPersonas();

      expect(result).toEqual(mockResult);
      expect(adminPersonaService.getAllPersonas).toHaveBeenCalledWith(1, 10);
    });

    it('should return paginated personas with custom parameters', async () => {
      const mockResult = {
        personas: [],
        total: 0,
        page: 2,
        pageSize: 20,
        totalPages: 0,
      };

      adminPersonaService.getAllPersonas.mockResolvedValue(mockResult);

      const result = await controller.listPersonas('2', '20');

      expect(result).toEqual(mockResult);
      expect(adminPersonaService.getAllPersonas).toHaveBeenCalledWith(2, 20);
    });

    it('should throw BadRequestException for invalid page number', async () => {
      await expect(controller.listPersonas('invalid', '10')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getPersona', () => {
    it('should return persona details', async () => {
      const mockPersona = {
        id: 'test-persona',
        name: 'Test Persona',
        description: 'Test description',
        knowledgeCategory: 'general',
        created_at: new Date(),
        updated_at: new Date(),
      };

      adminPersonaService.getPersonaById.mockResolvedValue(mockPersona);

      const result = await controller.getPersona('test-persona');

      expect(result).toEqual(mockPersona);
      expect(adminPersonaService.getPersonaById).toHaveBeenCalledWith(
        'test-persona',
      );
    });

    it('should throw NotFoundException for non-existent persona', async () => {
      adminPersonaService.getPersonaById.mockRejectedValue(
        new NotFoundException(),
      );

      await expect(controller.getPersona('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createPersona', () => {
    const validDto: CreateAdminPersonaDto = {
      id: 'new-persona',
      name: 'New Persona',
      description: 'New description',
      knowledgeCategory: 'general',
      temperature: 0.7,
      maxTokens: 2000,
    };

    it('should create a new persona successfully', async () => {
      adminPersonaService.validatePersonaConfig.mockResolvedValue({
        valid: true,
        errors: [],
      });

      adminPersonaService.getPersonaById.mockRejectedValue(
        new NotFoundException(),
      );

      const mockCreatedPersona = {
        ...validDto,
        extraInstructions: undefined,
      };

      personaService.createPersona.mockResolvedValue(mockCreatedPersona);

      const result = await controller.createPersona(validDto);

      expect(result).toEqual(mockCreatedPersona);
      expect(adminPersonaService.validatePersonaConfig).toHaveBeenCalled();
      expect(personaService.createPersona).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid persona config', async () => {
      adminPersonaService.validatePersonaConfig.mockResolvedValue({
        valid: false,
        errors: ['Temperature must be between 0.0 and 1.0'],
      });

      await expect(controller.createPersona(validDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ConflictException for duplicate persona id', async () => {
      adminPersonaService.validatePersonaConfig.mockResolvedValue({
        valid: true,
        errors: [],
      });

      adminPersonaService.getPersonaById.mockResolvedValue({
        id: 'new-persona',
        name: 'Existing',
        description: 'Existing',
        knowledgeCategory: 'general',
        created_at: new Date(),
        updated_at: new Date(),
      });

      await expect(controller.createPersona(validDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('updatePersona', () => {
    const validDto: UpdateAdminPersonaDto = {
      name: 'Updated Name',
      description: 'Updated description',
    };

    it('should update persona successfully', async () => {
      const existingPersona = {
        id: 'test-persona',
        name: 'Old Name',
        description: 'Old description',
        knowledgeCategory: 'general',
        created_at: new Date(),
        updated_at: new Date(),
      };

      adminPersonaService.getPersonaById.mockResolvedValue(existingPersona);

      adminPersonaService.validatePersonaConfig.mockResolvedValue({
        valid: true,
        errors: [],
      });

      const updatedPersona = {
        ...existingPersona,
        ...validDto,
      };

      personaService.updatePersona.mockResolvedValue(updatedPersona);

      const result = await controller.updatePersona('test-persona', validDto);

      expect(result).toEqual(updatedPersona);
      expect(personaService.updatePersona).toHaveBeenCalledWith(
        'test-persona',
        validDto,
      );
    });

    it('should throw NotFoundException for non-existent persona', async () => {
      adminPersonaService.getPersonaById.mockRejectedValue(
        new NotFoundException(),
      );

      await expect(
        controller.updatePersona('non-existent', validDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid updates', async () => {
      adminPersonaService.getPersonaById.mockResolvedValue({
        id: 'test-persona',
        name: 'Test',
        description: 'Test',
        knowledgeCategory: 'general',
        created_at: new Date(),
        updated_at: new Date(),
      });

      adminPersonaService.validatePersonaConfig.mockResolvedValue({
        valid: false,
        errors: ['Invalid temperature value'],
      });

      await expect(
        controller.updatePersona('test-persona', validDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deletePersona', () => {
    it('should delete persona successfully when not in use', async () => {
      adminPersonaService.getPersonaById.mockResolvedValue({
        id: 'test-persona',
        name: 'Test',
        description: 'Test',
        knowledgeCategory: 'general',
        created_at: new Date(),
        updated_at: new Date(),
      });

      adminPersonaService.checkPersonaInUse.mockResolvedValue(0);

      personaService.deletePersona.mockResolvedValue(undefined);

      const result = await controller.deletePersona('test-persona');

      expect(result).toEqual({
        message: "Persona 'test-persona' deleted successfully",
        id: 'test-persona',
      });
      expect(personaService.deletePersona).toHaveBeenCalledWith('test-persona');
    });

    it('should throw BadRequestException when persona is in use', async () => {
      adminPersonaService.getPersonaById.mockResolvedValue({
        id: 'test-persona',
        name: 'Test',
        description: 'Test',
        knowledgeCategory: 'general',
        created_at: new Date(),
        updated_at: new Date(),
      });

      adminPersonaService.checkPersonaInUse.mockResolvedValue(5);

      await expect(controller.deletePersona('test-persona')).rejects.toThrow(
        BadRequestException,
      );
      expect(personaService.deletePersona).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent persona', async () => {
      adminPersonaService.getPersonaById.mockRejectedValue(
        new NotFoundException(),
      );

      await expect(controller.deletePersona('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('testPersona', () => {
    const validDto: TestPersonaDto = {
      query: 'How do I deploy a Kubernetes cluster?',
    };

    it('should test persona successfully and return results', async () => {
      const mockTestResult = {
        answer: 'To deploy a Kubernetes cluster, you need to...',
        retrievedChunks: [
          {
            content: 'Kubernetes is a container orchestration platform...',
            sourcePath: 'knowledge/general/kubernetes-guide.txt',
            category: 'general',
            relevanceScore: 0.85,
          },
          {
            content: 'To set up a cluster, first install kubectl...',
            sourcePath: 'knowledge/general/kubernetes-guide.txt',
            category: 'general',
            relevanceScore: 0.78,
          },
        ],
        modelProvider: 'openai/gpt-4',
        tokensUsed: 450,
        latencyMs: 1250,
      };

      adminPersonaTestService.testPersona.mockResolvedValue(mockTestResult);

      const result = await controller.testPersona('tech-support', validDto);

      expect(result).toEqual(mockTestResult);
      expect(adminPersonaTestService.testPersona).toHaveBeenCalledWith({
        personaId: 'tech-support',
        query: validDto.query,
      });
    });

    it('should throw NotFoundException for non-existent persona', async () => {
      adminPersonaTestService.testPersona.mockRejectedValue(
        new NotFoundException("Persona with id 'non-existent' not found"),
      );

      await expect(
        controller.testPersona('non-existent', validDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return empty chunks when no relevant knowledge found', async () => {
      const mockTestResult = {
        answer: 'I do not have enough information to answer that question.',
        retrievedChunks: [],
        modelProvider: 'openai/gpt-4',
        tokensUsed: 120,
        latencyMs: 800,
      };

      adminPersonaTestService.testPersona.mockResolvedValue(mockTestResult);

      const result = await controller.testPersona('tech-support', validDto);

      expect(result).toEqual(mockTestResult);
      expect(result.retrievedChunks).toHaveLength(0);
    });

    it('should include relevance scores for all retrieved chunks', async () => {
      const mockTestResult = {
        answer: 'Here is the information...',
        retrievedChunks: [
          {
            content: 'Content 1',
            sourcePath: 'path1.txt',
            category: 'general',
            relevanceScore: 0.92,
          },
          {
            content: 'Content 2',
            sourcePath: 'path2.txt',
            category: 'general',
            relevanceScore: 0.75,
          },
        ],
        modelProvider: 'anthropic/claude-3',
        tokensUsed: 300,
        latencyMs: 950,
      };

      adminPersonaTestService.testPersona.mockResolvedValue(mockTestResult);

      const result = await controller.testPersona('tech-support', validDto);

      expect(result.retrievedChunks).toHaveLength(2);
      result.retrievedChunks.forEach((chunk) => {
        expect(chunk).toHaveProperty('relevanceScore');
        expect(typeof chunk.relevanceScore).toBe('number');
        expect(chunk.relevanceScore).toBeGreaterThanOrEqual(0);
        expect(chunk.relevanceScore).toBeLessThanOrEqual(1);
      });
    });

    it('should include model usage metrics in response', async () => {
      const mockTestResult = {
        answer: 'Test answer',
        retrievedChunks: [],
        modelProvider: 'openai/gpt-4',
        tokensUsed: 250,
        latencyMs: 1100,
      };

      adminPersonaTestService.testPersona.mockResolvedValue(mockTestResult);

      const result = await controller.testPersona('tech-support', validDto);

      expect(result).toHaveProperty('modelProvider');
      expect(result).toHaveProperty('tokensUsed');
      expect(result).toHaveProperty('latencyMs');
      expect(typeof result.tokensUsed).toBe('number');
      expect(typeof result.latencyMs).toBe('number');
    });
  });
});
