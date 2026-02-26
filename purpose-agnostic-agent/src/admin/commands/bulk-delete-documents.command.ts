import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KnowledgeDocument } from '../../rag/entities/knowledge-document.entity.js';
import {
  BulkOperationCommand,
  BulkOperationResult,
  ValidationResult,
} from './bulk-operation-command.interface.js';

/**
 * Command for bulk deletion of knowledge documents
 *
 * Implements the command pattern for bulk document deletion with:
 * - Pre-execution validation to ensure documents exist
 * - Transactional execution with per-document success/failure tracking
 * - Automatic category document count updates
 *
 * Requirements: 6.4, 6.5
 */
@Injectable()
export class BulkDeleteDocumentsCommand implements BulkOperationCommand<
  string,
  string
> {
  private documentIds: string[];
  private deletedDocuments: Array<{ id: string; category: string }> = [];

  constructor(
    @InjectRepository(KnowledgeDocument)
    private readonly documentRepository: Repository<KnowledgeDocument>,
    documentIds: string[],
  ) {
    this.documentIds = documentIds;
  }

  /**
   * Validates that all documents exist before deletion
   *
   * Requirements: 6.4 - Validate documents exist before bulk deletion
   */
  async validate(): Promise<ValidationResult> {
    const errors: string[] = [];

    if (!this.documentIds || this.documentIds.length === 0) {
      errors.push('No document IDs provided for deletion');
      return { isValid: false, errors };
    }

    // Check for duplicate IDs
    const uniqueIds = new Set(this.documentIds);
    if (uniqueIds.size !== this.documentIds.length) {
      errors.push('Duplicate document IDs detected in the request');
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
   * Executes bulk deletion in a transaction
   *
   * Deletes documents and updates category document counts.
   * Tracks success/failure for each document.
   *
   * Requirements: 6.4, 6.5 - Execute deletion with success/failure tracking
   */
  async execute(): Promise<BulkOperationResult<string>> {
    const result: BulkOperationResult<string> = {
      total: this.documentIds.length,
      successful: 0,
      failed: 0,
      successes: [],
      failures: [],
    };

    // Execute deletion in transaction
    await this.documentRepository.manager.transaction(
      async (transactionalEntityManager) => {
        const affectedCategories = new Set<string>();

        for (const id of this.documentIds) {
          try {
            // Find document to get its category
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

            // Store for potential rollback
            this.deletedDocuments.push({
              id: document.id,
              category: document.category,
            });

            affectedCategories.add(document.category);

            // Delete the document (CASCADE will automatically delete associated chunks)
            await transactionalEntityManager.delete(KnowledgeDocument, id);

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

        // Update category document counts for all affected categories
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
   * Rolls back the deletion operation
   *
   * Note: Since we use database transactions, rollback is handled automatically
   * by the transaction manager if an error occurs during execution.
   * This method is provided for interface compliance.
   *
   * Requirements: 6.4 - Transaction support for bulk operations
   */
  async rollback(): Promise<boolean> {
    // Transaction-based operations are automatically rolled back by TypeORM
    // if an error occurs during execution. This method is a no-op since
    // we rely on database transaction semantics.
    return true;
  }
}
