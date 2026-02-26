import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KnowledgeCategory } from '../entities/knowledge-category.entity.js';
import { KnowledgeCategoryRepository } from '../repositories/knowledge-category.repository.js';
import { KnowledgeDocument } from '../../rag/entities/knowledge-document.entity.js';

export interface CategoryWithCount {
  id: string;
  name: string;
  description?: string;
  document_count: number;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class AdminKnowledgeCategoryService {
  constructor(
    private readonly categoryRepository: KnowledgeCategoryRepository,
    @InjectRepository(KnowledgeDocument)
    private readonly documentRepository: Repository<KnowledgeDocument>,
  ) {}

  async createCategory(
    name: string,
    description?: string,
  ): Promise<KnowledgeCategory> {
    // Validate name format (alphanumeric + hyphens only)
    this.validateCategoryName(name);

    // Check if category already exists
    const existing = await this.categoryRepository.findByName(name);
    if (existing) {
      throw new ConflictException(
        `Category with name '${name}' already exists`,
      );
    }

    // Create category
    return this.categoryRepository.create({
      name,
      description,
      document_count: 0,
    });
  }

  async listCategories(): Promise<CategoryWithCount[]> {
    const categories = await this.categoryRepository.findAll();

    // Sync document counts with actual documents in database
    const categoriesWithCounts = await Promise.all(
      categories.map(async (category) => {
        const actualCount = await this.documentRepository.count({
          where: { category: category.name },
        });

        // Update if count is out of sync
        if (actualCount !== category.document_count) {
          await this.categoryRepository.update(category.id, {
            document_count: actualCount,
          });
          category.document_count = actualCount;
        }

        return {
          id: category.id,
          name: category.name,
          description: category.description,
          document_count: category.document_count,
          created_at: category.created_at,
          updated_at: category.updated_at,
        };
      }),
    );

    return categoriesWithCounts;
  }

  async getCategoryById(id: string): Promise<KnowledgeCategory> {
    const category = await this.categoryRepository.findById(id);
    if (!category) {
      throw new NotFoundException(`Category with id '${id}' not found`);
    }
    return category;
  }

  async getCategoryByName(name: string): Promise<KnowledgeCategory | null> {
    return this.categoryRepository.findByName(name);
  }

  async updateCategory(
    id: string,
    updates: { name?: string; description?: string },
  ): Promise<KnowledgeCategory> {
    const category = await this.getCategoryById(id);

    // Validate new name if provided
    if (updates.name && updates.name !== category.name) {
      this.validateCategoryName(updates.name);

      // Check if new name already exists
      const existing = await this.categoryRepository.findByName(updates.name);
      if (existing) {
        throw new ConflictException(
          `Category with name '${updates.name}' already exists`,
        );
      }
    }

    const updated = await this.categoryRepository.update(id, updates);
    if (!updated) {
      throw new NotFoundException(`Category with id '${id}' not found`);
    }

    return updated;
  }

  async deleteCategory(id: string): Promise<void> {
    const category = await this.getCategoryById(id);

    // Check if category has associated documents
    const documentCount = await this.documentRepository.count({
      where: { category: category.name },
    });

    if (documentCount > 0) {
      throw new BadRequestException(
        `Cannot delete category '${category.name}' because it has ${documentCount} associated document(s). ` +
          `Please delete or reassign the documents first.`,
      );
    }

    const deleted = await this.categoryRepository.delete(id);
    if (!deleted) {
      throw new NotFoundException(`Category with id '${id}' not found`);
    }
  }

  private validateCategoryName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new BadRequestException('Category name cannot be empty');
    }

    // Only allow alphanumeric characters and hyphens
    const validNamePattern = /^[a-zA-Z0-9-]+$/;
    if (!validNamePattern.test(name)) {
      throw new BadRequestException(
        'Category name must contain only alphanumeric characters and hyphens',
      );
    }
  }
}
