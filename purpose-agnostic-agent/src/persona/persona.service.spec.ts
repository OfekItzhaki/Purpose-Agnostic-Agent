import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { PersonaService } from './persona.service';
import { PersonaEntity } from './entities/persona.entity';
import { Persona } from './interfaces/persona.interface';

describe('PersonaService', () => {
  let service: PersonaService;
  let repository: jest.Mocked<Repository<PersonaEntity>>;

  const mockPersonaEntities: PersonaEntity[] = [
    {
      id: 'tech-support',
      name: 'Technical Support',
      description: 'Helps with technical issues',
      extra_instructions: 'Be concise',
      knowledge_category: 'support',
      temperature: '0.7',
      max_tokens: 2000,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: 'sales-agent',
      name: 'Sales Agent',
      description: 'Assists with sales inquiries',
      extra_instructions: 'Be friendly',
      knowledge_category: 'sales',
      temperature: '0.8',
      max_tokens: 1500,
      created_at: new Date(),
      updated_at: new Date(),
    },
  ];

  beforeEach(async () => {
    const mockRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PersonaService,
        {
          provide: getRepositoryToken(PersonaEntity),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<PersonaService>(PersonaService);
    repository = module.get(getRepositoryToken(PersonaEntity));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('loadPersonas', () => {
    it('should load personas from database into cache', async () => {
      repository.find.mockResolvedValue(mockPersonaEntities);

      await service.loadPersonas();

      expect(repository.find).toHaveBeenCalled();

      const persona = service.getPersona('tech-support');
      expect(persona).toBeDefined();
      expect(persona?.id).toBe('tech-support');
      expect(persona?.name).toBe('Technical Support');
      expect(persona?.temperature).toBe(0.7);
    });

    it('should handle empty database', async () => {
      repository.find.mockResolvedValue([]);

      await service.loadPersonas();

      const personas = service.listPersonas();
      expect(personas).toEqual([]);
    });

    it('should handle database errors', async () => {
      repository.find.mockRejectedValue(new Error('Database connection failed'));

      await expect(service.loadPersonas()).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should clear cache before loading', async () => {
      // First load
      repository.find.mockResolvedValue(mockPersonaEntities);
      await service.loadPersonas();

      // Second load with different data
      const newEntities = [mockPersonaEntities[0]]; // Only one persona
      repository.find.mockResolvedValue(newEntities);
      await service.loadPersonas();

      const personas = service.listPersonas();
      expect(personas.length).toBe(1);
    });

    it('should convert temperature from string to number', async () => {
      repository.find.mockResolvedValue(mockPersonaEntities);

      await service.loadPersonas();

      const persona = service.getPersona('tech-support');
      expect(typeof persona?.temperature).toBe('number');
      expect(persona?.temperature).toBe(0.7);
    });
  });

  describe('getPersona', () => {
    beforeEach(async () => {
      repository.find.mockResolvedValue(mockPersonaEntities);
      await service.loadPersonas();
    });

    it('should return persona by valid agent ID', () => {
      const persona = service.getPersona('tech-support');

      expect(persona).toBeDefined();
      expect(persona?.id).toBe('tech-support');
      expect(persona?.name).toBe('Technical Support');
    });

    it('should return null for invalid agent ID', () => {
      const persona = service.getPersona('nonexistent');

      expect(persona).toBeNull();
    });

    it('should return persona with all fields', () => {
      const persona = service.getPersona('tech-support');

      expect(persona).toMatchObject({
        id: 'tech-support',
        name: 'Technical Support',
        description: 'Helps with technical issues',
        extraInstructions: 'Be concise',
        knowledgeCategory: 'support',
        temperature: 0.7,
        maxTokens: 2000,
      });
    });
  });

  describe('listPersonas', () => {
    beforeEach(async () => {
      repository.find.mockResolvedValue(mockPersonaEntities);
      await service.loadPersonas();
    });

    it('should return array of persona info', () => {
      const personas = service.listPersonas();

      expect(personas).toHaveLength(2);
      expect(personas[0]).toMatchObject({
        id: 'tech-support',
        name: 'Technical Support',
        description: 'Helps with technical issues',
        knowledgeCategory: 'support',
      });
    });

    it('should not include sensitive fields in persona info', () => {
      const personas = service.listPersonas();

      personas.forEach((persona) => {
        expect(persona).not.toHaveProperty('extraInstructions');
        expect(persona).not.toHaveProperty('temperature');
        expect(persona).not.toHaveProperty('maxTokens');
      });
    });

    it('should return empty array when no personas loaded', () => {
      // Create new service without loading
      const emptyService = new PersonaService(repository);
      const personas = emptyService.listPersonas();

      expect(personas).toEqual([]);
    });
  });

  describe('createPersona', () => {
    it('should create and cache new persona', async () => {
      const newPersona: Persona = {
        id: 'new-agent',
        name: 'New Agent',
        description: 'A new agent',
        extraInstructions: 'Be helpful',
        knowledgeCategory: 'general',
        temperature: 0.5,
        maxTokens: 1000,
      };

      const mockEntity = {
        id: newPersona.id,
        name: newPersona.name,
        description: newPersona.description,
        extra_instructions: newPersona.extraInstructions,
        knowledge_category: newPersona.knowledgeCategory,
        temperature: newPersona.temperature,
        max_tokens: newPersona.maxTokens,
      } as PersonaEntity;

      repository.create.mockReturnValue(mockEntity);
      repository.save.mockResolvedValue(mockEntity);

      const result = await service.createPersona(newPersona);

      expect(result).toEqual(newPersona);
      expect(repository.create).toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalledWith(mockEntity);

      // Verify it's in cache
      const cached = service.getPersona('new-agent');
      expect(cached).toEqual(newPersona);
    });

    it('should handle missing optional fields', async () => {
      const minimalPersona: Persona = {
        id: 'minimal',
        name: 'Minimal Agent',
        description: 'Minimal configuration',
        knowledgeCategory: 'general',
      };

      const mockEntity = {
        id: minimalPersona.id,
        name: minimalPersona.name,
        description: minimalPersona.description,
        knowledge_category: minimalPersona.knowledgeCategory,
      } as PersonaEntity;

      repository.create.mockReturnValue(mockEntity);
      repository.save.mockResolvedValue(mockEntity);

      const result = await service.createPersona(minimalPersona);

      expect(result).toEqual(minimalPersona);
    });

    it('should handle database save errors', async () => {
      const newPersona: Persona = {
        id: 'error-agent',
        name: 'Error Agent',
        description: 'Will fail',
        knowledgeCategory: 'general',
      };

      repository.create.mockReturnValue({} as PersonaEntity);
      repository.save.mockRejectedValue(new Error('Duplicate key'));

      await expect(service.createPersona(newPersona)).rejects.toThrow(
        'Duplicate key',
      );
    });
  });

  describe('updatePersona', () => {
    beforeEach(async () => {
      repository.find.mockResolvedValue(mockPersonaEntities);
      await service.loadPersonas();
    });

    it('should update existing persona', async () => {
      const updates: Partial<Persona> = {
        name: 'Updated Name',
        description: 'Updated description',
      };

      repository.findOne.mockResolvedValue(mockPersonaEntities[0]);
      repository.update.mockResolvedValue({ affected: 1 } as any);

      // Mock reload
      const updatedEntity = {
        ...mockPersonaEntities[0],
        name: updates.name,
        description: updates.description,
      };
      repository.find.mockResolvedValue([updatedEntity, mockPersonaEntities[1]]);

      const result = await service.updatePersona('tech-support', updates);

      expect(result.name).toBe('Updated Name');
      expect(result.description).toBe('Updated description');
      expect(repository.update).toHaveBeenCalledWith('tech-support', {
        name: updates.name,
        description: updates.description,
        extra_instructions: undefined,
        knowledge_category: undefined,
        temperature: undefined,
        max_tokens: undefined,
      });
    });

    it('should throw NotFoundException for non-existent persona', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.updatePersona('nonexistent', { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reload cache after update', async () => {
      repository.findOne.mockResolvedValue(mockPersonaEntities[0]);
      repository.update.mockResolvedValue({ affected: 1 } as any);

      const updatedEntity = {
        ...mockPersonaEntities[0],
        name: 'Updated Name',
      };
      repository.find.mockResolvedValue([updatedEntity, mockPersonaEntities[1]]);

      await service.updatePersona('tech-support', { name: 'Updated Name' });

      // Verify cache was reloaded
      expect(repository.find).toHaveBeenCalledTimes(2); // Initial load + reload
    });
  });

  describe('deletePersona', () => {
    beforeEach(async () => {
      repository.find.mockResolvedValue(mockPersonaEntities);
      await service.loadPersonas();
    });

    it('should delete persona from database and cache', async () => {
      repository.delete.mockResolvedValue({ affected: 1 } as any);

      await service.deletePersona('tech-support');

      expect(repository.delete).toHaveBeenCalledWith('tech-support');

      // Verify removed from cache
      const persona = service.getPersona('tech-support');
      expect(persona).toBeNull();
    });

    it('should handle deletion of non-existent persona', async () => {
      repository.delete.mockResolvedValue({ affected: 0 } as any);

      // Should not throw error
      await service.deletePersona('nonexistent');

      expect(repository.delete).toHaveBeenCalledWith('nonexistent');
    });
  });

  describe('validation', () => {
    beforeEach(async () => {
      repository.find.mockResolvedValue(mockPersonaEntities);
      await service.loadPersonas();
    });

    it('should handle personas with missing optional fields', () => {
      const minimalEntity: PersonaEntity = {
        id: 'minimal',
        name: 'Minimal',
        description: 'Minimal persona',
        extra_instructions: null,
        knowledge_category: 'general',
        temperature: null,
        max_tokens: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      repository.find.mockResolvedValue([minimalEntity]);

      // Should not throw
      expect(async () => await service.loadPersonas()).not.toThrow();
    });
  });
});
