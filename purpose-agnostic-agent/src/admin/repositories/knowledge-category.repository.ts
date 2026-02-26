import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KnowledgeCategory } from '../entities/knowledge-category.entity.js';

@Injectable()
export class KnowledgeCategoryRepository {
  constructor(
    @InjectRepository(KnowledgeCategory)
    private readonly repository: Repository<KnowledgeCategory>,
  ) {}

  async findById(id: string): Promise<KnowledgeCategory | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByName(name: string): Promise<KnowledgeCategory | null> {
    return this.repository.findOne({ where: { name } });
  }

  async findAll(): Promise<KnowledgeCategory[]> {
    return this.repository.find({ order: { name: 'ASC' } });
  }

  async create(
    category: Partial<KnowledgeCategory>,
  ): Promise<KnowledgeCategory> {
    const newCategory = this.repository.create(category);
    return this.repository.save(newCategory);
  }

  async update(
    id: string,
    updates: Partial<KnowledgeCategory>,
  ): Promise<KnowledgeCategory | null> {
    await this.repository.update(id, updates);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async hasDocuments(categoryName: string): Promise<boolean> {
    const category = await this.findByName(categoryName);
    return category ? category.document_count > 0 : false;
  }

  async incrementDocumentCount(id: string): Promise<void> {
    await this.repository.increment({ id }, 'document_count', 1);
  }

  async decrementDocumentCount(id: string): Promise<void> {
    await this.repository.decrement({ id }, 'document_count', 1);
  }
}
