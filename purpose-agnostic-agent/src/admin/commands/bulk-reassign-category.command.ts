import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KnowledgeDocument } from '../../rag/entities/knowledge-document.entity.js';
import { KnowledgeCategory } from '../entities/knowledge-category.entity.js';
import {
  BulkOperationCommand,
  BulkOperationResult,
  ValidationResult,
} from './bulk-operation-command.interface.js';

/**
 * Command for bulk reassignment of documents to a different category
 *
 * Implements the command pattern for bulk category reassignment with:
 * - Pre-execution validation to ensure target category exists
 * - Transactional execution with per-document success/failure tracking
 * - Automatic document count updates for both source and target categories
 *
 * Requirements: 6.6
 */
@Injectable()
export class BulkReassignCategoryCommand implements BulkOperationCommand<
  string,
  string
> {
  private documentIds: string[];
  private targetCategory: string;
  private originalAssignments: Map<string, string> = new Map();

  constructor(
    @InjectRepository(KnowledgeDocument)
    private readonly documentRepository: Repository<KnowledgeDocument>,
    @InjectRepository(KnowledgeCategory)
    private readonly categoryRepository: Repository<KnowledgeCategory>,
    documentIds: string[],
    targetCategory: string,
  ) {
    this.documentIds = documentIds;
    this.targetCategory = targetCategory;
  }

  /**
   * Validates that target category exists and documents exist before reassignment
   *
   * Requirements: 6.6 - Validate target category exists before bulk reassignment
   */
  async validate(): Promise<ValidationResult> {
    const errors: string[] = [];

    if (!this.documentIds || this.documentIds.length === 0) {
      errors.push('No document IDs provided for reassignment');
      return { isValid: false, errors };
    }

    if (!this.targetCategory || this.targetCategory.trim().length === 0) {
      errors.push('Target category is required');
      return { isValid: false, errors };
    }

    // Check for duplicate IDs
    const uniqueIds = new Set(this.documentIds);
    if (uniqueIds.size !== this.documentIds.length) {
      errors.push('Duplicate document IDs detected in the request');
    }

    // Validate that target category exists
    const targetCategoryEntity = await this.categoryRepository.findOne({
      where: { name: this.targetCategory },
    });

    if (!targetCategoryEntity) {
      errors.push(`Target category '${this.targetCategory}' does not exist`);
    }

    // Validate that all documents exist
    for (const id of this.documentIds) {
      const document = await this.documentRepository.findOne({
        where: { id },
      });

      if (!document) {
        errors.push(`Document with id '${id}' not found`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Executes bulk category reassignment in a transaction
   *
   * Reassigns documents to the target category and updates document counts
   * for both source and target categories. Tracks success/failure for each document.
   *
   * Requirements: 6.6 - Execute reassignment with success/failure tracking and count updates
   */
  async execute(): Promise<BulkOperationResult<string>> {
    const result: BulkOperationResult<string> = {
      total: this.documentIds.length,
      successful: 0,
      failed: 0,
      successes: [],
      failures: [],
    };

    // Execute reassignment in transaction
    await this.documentRepository.manager.transaction(
      async (transactionalEntityManager) => {
        const affectedCategories = new Set<string>();
        affectedCategories.add(this.targetCategory);

        for (const id of this.documentIds) {
          try {
            // Find document to get its current category
            const document = await transactionalEntityManager.findOne(
              KnowledgeDocument,
              {
                where: { id },
              },
            );

            if (!document) {
              result.failed++;
              result.failures.push({
                item: id,
                error: `Document with id '${id}' not found`,
              });
              continue;
            }

            // Store original category for potential rollback
            this.originalAssignments.set(id, document.category);
            affectedCategories.add(document.category);

            // Skip if already in target category
            if (document.category === this.targetCategory) {
              result.successful++;
              result.successes.push(id);
              continue;
            }

            // Update document category
            await transactionalEntityManager.update(
              KnowledgeDocument,
              { id },
              { category: this.targetCategory, updated_at: new Date() },
            );

            result.successful++;
            result.successes.push(id);
          } catch (error) {
            result.failed++;
            result.failures.push({
              item: id,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }

        // Update document counts for all affected categories
        for (const category of affectedCategories) {
          const actualCount = await transactionalEntityManager.count(
            KnowledgeDocument,
            {
              where: { category },
            },
          );

          await transactionalEntityManager.query(
            `UPDATE knowledge_categories SET document_count = $1, updated_at = NOW() WHERE name = $2`,
            [actualCount, category],
          );
        }
      },
    );

    return result;
  }

  /**
   * Rolls back the reassignment operation
   *
   * Note: Since we use database transactions, rollback is handled automatically
   * by the transaction manager if an error occurs during execution.
   * This method is provided for interface compliance.
   *
   * Requirements: 6.6 - Transaction support for bulk operations
   */
  async rollback(): Promise<boolean> {
    // Transaction-based operations are automatically rolled back by TypeORM
    // if an error occurs during execution. This method is a no-op since
    // we rely on database transaction semantics.
    return true;
  }
}
