import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { KnowledgeDocument } from '../../rag/entities/knowledge-document.entity.js';
import { KnowledgeChunk } from '../../rag/entities/knowledge-chunk.entity.js';

export interface DocumentListItem {
  id: string;
  source_path: string;
  category: string;
  total_chunks: number;
  ingested_at: Date;
  status: string;
  error_message?: string;
  retry_count: number;
  metadata?: Record<string, any>;
}

export interface DocumentDetail {
  id: string;
  source_path: string;
  category: string;
  file_hash?: string;
  total_chunks: number;
  ingested_at: Date;
  status: string;
  error_message?: string;
  retry_count: number;
  metadata?: Record<string, any>;
  chunk_count: number;
}

export interface KnowledgeStatistics {
  total_documents: number;
  total_chunks: number;
  documents_by_category: Record<string, number>;
  chunks_by_category: Record<string, number>;
  recent_documents: Array<{
    id: string;
    source_path: string;
    category: string;
    ingested_at: Date;
  }>;
}

export interface BulkOperationResult {
  total: number;
  successful: number;
  failed: number;
  errors: Array<{
    id: string;
    error: string;
  }>;
}

@Injectable()
export class AdminKnowledgeService {
  constructor(
    @InjectRepository(KnowledgeDocument)
    private readonly documentRepository: Repository<KnowledgeDocument>,
    @InjectRepository(KnowledgeChunk)
    private readonly chunkRepository: Repository<KnowledgeChunk>,
  ) {}

  /**
   * List all documents with optional category filtering
   * Requirement 4.1: Display list of Knowledge_Documents grouped by category
   */
  async listDocuments(category?: string): Promise<DocumentListItem[]> {
    const where = category ? { category } : {};

    const documents = await this.documentRepository.find({
      where,
      order: { ingested_at: 'DESC' },
    });

    return documents.map((doc) => ({
      id: doc.id,
      source_path: doc.source_path,
      category: doc.category,
      total_chunks: doc.total_chunks,
      ingested_at: doc.ingested_at,
      status: doc.status,
      error_message: doc.error_message,
      retry_count: doc.retry_count,
      metadata: doc.metadata,
    }));
  }

  /**
   * Get document by ID with metadata and actual chunk count
   * Requirement 4.2: Display document metadata including chunk count
   */
  async getDocumentById(id: string): Promise<DocumentDetail> {
    const document = await this.documentRepository.findOne({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException(`Document with id '${id}' not found`);
    }

    // Get actual chunk count from database
    const chunkCount = await this.chunkRepository.count({
      where: { document_id: id },
    });

    return {
      id: document.id,
      source_path: document.source_path,
      category: document.category,
      file_hash: document.file_hash,
      total_chunks: document.total_chunks,
      ingested_at: document.ingested_at,
      status: document.status,
      error_message: document.error_message,
      retry_count: document.retry_count,
      metadata: document.metadata,
      chunk_count: chunkCount,
    };
  }

  /**
   * Search documents by text in source path or category
   * Requirement 4.5: Provide search functionality to filter documents
   */
  async searchDocuments(searchText: string): Promise<DocumentListItem[]> {
    const documents = await this.documentRepository.find({
      where: [
        { source_path: Like(`%${searchText}%`) },
        { category: Like(`%${searchText}%`) },
      ],
      order: { ingested_at: 'DESC' },
    });

    return documents.map((doc) => ({
      id: doc.id,
      source_path: doc.source_path,
      category: doc.category,
      total_chunks: doc.total_chunks,
      ingested_at: doc.ingested_at,
      status: doc.status,
      error_message: doc.error_message,
      retry_count: doc.retry_count,
      metadata: doc.metadata,
    }));
  }

  /**
   * Get knowledge base statistics
   * Requirements 9.1-9.5: Display statistics about knowledge base
   */
  async getStatistics(): Promise<KnowledgeStatistics> {
    // Get total documents
    const totalDocuments = await this.documentRepository.count();

    // Get total chunks
    const totalChunks = await this.chunkRepository.count();

    // Get documents by category
    const documentsByCategory = await this.documentRepository
      .createQueryBuilder('doc')
      .select('doc.category', 'category')
      .addSelect('COUNT(*)', 'count')
      .groupBy('doc.category')
      .getRawMany();

    const docsByCategoryMap: Record<string, number> = {};
    documentsByCategory.forEach((row) => {
      docsByCategoryMap[row.category] = parseInt(row.count, 10);
    });

    // Get chunks by category
    const chunksByCategory = await this.chunkRepository
      .createQueryBuilder('chunk')
      .leftJoin('knowledge_documents', 'doc', 'doc.id = chunk.document_id')
      .select('doc.category', 'category')
      .addSelect('COUNT(*)', 'count')
      .groupBy('doc.category')
      .getRawMany();

    const chunksByCategoryMap: Record<string, number> = {};
    chunksByCategory.forEach((row) => {
      chunksByCategoryMap[row.category] = parseInt(row.count, 10);
    });

    // Get recent documents (last 10)
    const recentDocuments = await this.documentRepository.find({
      order: { ingested_at: 'DESC' },
      take: 10,
    });

    return {
      total_documents: totalDocuments,
      total_chunks: totalChunks,
      documents_by_category: docsByCategoryMap,
      chunks_by_category: chunksByCategoryMap,
      recent_documents: recentDocuments.map((doc) => ({
        id: doc.id,
        source_path: doc.source_path,
        category: doc.category,
        ingested_at: doc.ingested_at,
      })),
    };
  }

  /**
   * Delete document and all associated chunks
   * Requirement 4.4: Remove document and all associated chunks from database
   * Uses CASCADE delete from database schema to automatically remove chunks
   */
  async deleteDocument(id: string): Promise<void> {
    // Check if document exists
    const document = await this.documentRepository.findOne({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException(`Document with id '${id}' not found`);
    }

    const category = document.category;

    // Delete the document (CASCADE will automatically delete associated chunks)
    await this.documentRepository.delete(id);

    // Update category document count
    await this.updateCategoryDocumentCount(category);
  }

  /**
   * Update category document count based on actual documents in database
   * This ensures the count stays accurate after deletions
   */
  private async updateCategoryDocumentCount(
    categoryName: string,
  ): Promise<void> {
    // Count actual documents in this category
    const actualCount = await this.documentRepository.count({
      where: { category: categoryName },
    });

    // Update the knowledge_categories table if it exists
    // Note: This assumes knowledge_categories table exists from the admin schema
    await this.documentRepository.manager.query(
      `UPDATE knowledge_categories SET document_count = $1, updated_at = NOW() WHERE name = $2`,
      [actualCount, categoryName],
    );
  }

  /**
   * Bulk delete multiple documents with transaction support
   * Requirement 6.4, 6.5: Support bulk deletion with success/failure tracking
   */
  async bulkDeleteDocuments(
    documentIds: string[],
  ): Promise<BulkOperationResult> {
    const result: BulkOperationResult = {
      total: documentIds.length,
      successful: 0,
      failed: 0,
      errors: [],
    };

    // Use transaction to ensure atomicity
    await this.documentRepository.manager.transaction(
      async (transactionalEntityManager) => {
        const affectedCategories = new Set<string>();

        for (const id of documentIds) {
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
              result.errors.push({
                id,
                error: `Document with id '${id}' not found`,
              });
              continue;
            }

            affectedCategories.add(document.category);

            // Delete the document (CASCADE will automatically delete associated chunks)
            await transactionalEntityManager.delete(KnowledgeDocument, id);
            result.successful++;
          } catch (error) {
            result.failed++;
            result.errors.push({
              id,
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
   * Bulk reassign category for multiple documents
   * Requirement 6.6: Support bulk category reassignment
   */
  async bulkReassignCategory(
    documentIds: string[],
    newCategory: string,
  ): Promise<BulkOperationResult> {
    const result: BulkOperationResult = {
      total: documentIds.length,
      successful: 0,
      failed: 0,
      errors: [],
    };

    // Use transaction to ensure atomicity
    await this.documentRepository.manager.transaction(
      async (transactionalEntityManager) => {
        const affectedCategories = new Set<string>();
        affectedCategories.add(newCategory);

        for (const id of documentIds) {
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
              result.errors.push({
                id,
                error: `Document with id '${id}' not found`,
              });
              continue;
            }

            const oldCategory = document.category;
            affectedCategories.add(oldCategory);

            // Update the document's category
            await transactionalEntityManager.update(
              KnowledgeDocument,
              { id },
              { category: newCategory },
            );
            result.successful++;
          } catch (error) {
            result.failed++;
            result.errors.push({
              id,
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
}
