import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Persona, PersonaInfo } from './interfaces/persona.interface.js';
import { PersonaEntity } from './entities/persona.entity.js';
import { StructuredLogger } from '../common/logger.service.js';

@Injectable()
export class PersonaService {
  private readonly logger = new StructuredLogger();
  private personaCache = new Map<string, Persona>();

  constructor(
    @InjectRepository(PersonaEntity)
    private readonly personaRepository: Repository<PersonaEntity>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.loadPersonas();
  }

  async loadPersonas(): Promise<void> {
    this.logger.log('Loading personas from database', 'PersonaService');

    const entities = await this.personaRepository.find();

    this.personaCache.clear();
    for (const entity of entities) {
      const persona: Persona = {
        id: entity.id,
        name: entity.name,
        description: entity.description,
        extraInstructions: entity.extra_instructions,
        knowledgeCategory: entity.knowledge_category,
        temperature: entity.temperature ? Number(entity.temperature) : undefined,
        maxTokens: entity.max_tokens || undefined,
      };
      this.personaCache.set(entity.id, persona);
    }

    this.logger.log(
      `Loaded ${this.personaCache.size} personas`,
      'PersonaService',
    );
  }

  getPersona(agentId: string): Persona | null {
    return this.personaCache.get(agentId) || null;
  }

  listPersonas(): PersonaInfo[] {
    return Array.from(this.personaCache.values()).map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      knowledgeCategory: p.knowledgeCategory,
    }));
  }

  async createPersona(persona: Persona): Promise<Persona> {
    const entity = this.personaRepository.create({
      id: persona.id,
      name: persona.name,
      description: persona.description,
      extra_instructions: persona.extraInstructions,
      knowledge_category: persona.knowledgeCategory,
      temperature: persona.temperature,
      max_tokens: persona.maxTokens,
    });

    await this.personaRepository.save(entity);
    this.personaCache.set(persona.id, persona);

    this.logger.log(`Created persona: ${persona.id}`, 'PersonaService');
    return persona;
  }

  async updatePersona(id: string, updates: Partial<Persona>): Promise<Persona> {
    const existing = await this.personaRepository.findOne({ where: { id } });

    if (!existing) {
      throw new NotFoundException(`Persona ${id} not found`);
    }

    await this.personaRepository.update(id, {
      name: updates.name,
      description: updates.description,
      extra_instructions: updates.extraInstructions,
      knowledge_category: updates.knowledgeCategory,
      temperature: updates.temperature,
      max_tokens: updates.maxTokens,
    });

    // Reload cache
    await this.loadPersonas();

    const updated = this.personaCache.get(id);
    if (!updated) {
      throw new NotFoundException(`Persona ${id} not found after update`);
    }

    this.logger.log(`Updated persona: ${id}`, 'PersonaService');
    return updated;
  }

  async deletePersona(id: string): Promise<void> {
    await this.personaRepository.delete(id);
    this.personaCache.delete(id);

    this.logger.log(`Deleted persona: ${id}`, 'PersonaService');
  }
}
