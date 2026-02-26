import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PersonaService } from '../../persona/persona.service.js';
import { PersonaEntity } from '../../persona/entities/persona.entity.js';
import { Persona } from '../../persona/interfaces/persona.interface.js';
import { KnowledgeCategoryRepository } from '../repositories/knowledge-category.repository.js';

export interface PaginatedPersonas {
  personas: PersonaWithDetails[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PersonaWithDetails extends Persona {
  created_at: Date;
  updated_at: Date;
}

export interface PersonaValidationResult {
  valid: boolean;
  errors: string[];
}

@Injectable()
export class AdminPersonaService {
  constructor(
    private readonly personaService: PersonaService,
    @InjectRepository(PersonaEntity)
    private readonly personaRepository: Repository<PersonaEntity>,
    private readonly categoryRepository: KnowledgeCategoryRepository,
  ) {}

  /**
   * Get all personas with pagination support
   * Requirements: 2.3, 2.4
   */
  async getAllPersonas(
    page: number = 1,
    pageSize: number = 10,
  ): Promise<PaginatedPersonas> {
    // Validate pagination parameters
    if (page < 1) {
      throw new BadRequestException('Page number must be greater than 0');
    }
    if (pageSize < 1 || pageSize > 100) {
      throw new BadRequestException('Page size must be between 1 and 100');
    }

    const skip = (page - 1) * pageSize;

    // Get total count
    const total = await this.personaRepository.count();

    // Get paginated results
    const entities = await this.personaRepository.find({
      skip,
      take: pageSize,
      order: {
        created_at: 'DESC',
      },
    });

    // Map entities to PersonaWithDetails
    const personas: PersonaWithDetails[] = entities.map((entity) => ({
      id: entity.id,
      name: entity.name,
      description: entity.description,
      extraInstructions: entity.extra_instructions,
      knowledgeCategory: entity.knowledge_category,
      temperature: entity.temperature ? Number(entity.temperature) : undefined,
      maxTokens: entity.max_tokens || undefined,
      created_at: entity.created_at,
      updated_at: entity.updated_at,
    }));

    const totalPages = Math.ceil(total / pageSize);

    return {
      personas,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  /**
   * Get persona by ID with full configuration details
   * Requirements: 2.4
   */
  async getPersonaById(id: string): Promise<PersonaWithDetails> {
    const entity = await this.personaRepository.findOne({ where: { id } });

    if (!entity) {
      throw new NotFoundException(`Persona with id '${id}' not found`);
    }

    return {
      id: entity.id,
      name: entity.name,
      description: entity.description,
      extraInstructions: entity.extra_instructions,
      knowledgeCategory: entity.knowledge_category,
      temperature: entity.temperature ? Number(entity.temperature) : undefined,
      maxTokens: entity.max_tokens || undefined,
      created_at: entity.created_at,
      updated_at: entity.updated_at,
    };
  }

  /**
   * Check if persona is currently in use by active chat sessions
   * Requirements: 2.7
   */
  async checkPersonaInUse(personaId: string): Promise<number> {
    const result = await this.personaRepository.query(
      `SELECT COUNT(*) as count 
       FROM chat_sessions 
       WHERE agent_id = $1 
       AND (expires_at IS NULL OR expires_at > NOW())`,
      [personaId],
    );

    return parseInt(result[0].count, 10);
  }

  /**
   * Validate persona configuration
   * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
   */
  async validatePersonaConfig(
    persona: Partial<Persona> & { id: string },
  ): Promise<PersonaValidationResult> {
    const errors: string[] = [];

    // Validate persona id format (lowercase, alphanumeric, hyphens)
    // Requirement 8.5
    if (persona.id) {
      const validIdPattern = /^[a-z0-9-]+$/;
      if (!validIdPattern.test(persona.id)) {
        errors.push(
          'Persona id must contain only lowercase letters, numbers, and hyphens',
        );
      }
    }

    // Validate temperature range (0.0 to 1.0)
    // Requirement 8.1
    if (persona.temperature !== undefined && persona.temperature !== null) {
      const temp = Number(persona.temperature);
      if (isNaN(temp) || temp < 0.0 || temp > 1.0) {
        errors.push('Temperature must be a number between 0.0 and 1.0');
      }
    }

    // Validate max_tokens is positive integer
    // Requirement 8.2
    if (persona.maxTokens !== undefined && persona.maxTokens !== null) {
      const tokens = Number(persona.maxTokens);
      if (isNaN(tokens) || tokens <= 0 || !Number.isInteger(tokens)) {
        errors.push('max_tokens must be a positive integer');
      }
    }

    // Verify knowledge category exists
    // Requirement 8.3, 8.4
    if (persona.knowledgeCategory) {
      const category = await this.categoryRepository.findByName(
        persona.knowledgeCategory,
      );
      if (!category) {
        errors.push(
          `Knowledge category '${persona.knowledgeCategory}' does not exist`,
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
