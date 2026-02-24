import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  KnowledgeChunkRepository,
  KnowledgeChunkData,
  SearchOptions,
  SearchResult,
} from '../interfaces/knowledge-chunk.repository.interface.js';
import { KnowledgeChunk } from '../entities/knowledge-chunk.entity.js';
import { KnowledgeDocument } from '../entities/knowledge-document.entity.js';

@Injectable()
export class PostgresKnowledgeChunkRepository
  implements KnowledgeChunkRepository
{
  constructor(
    @InjectRepository(KnowledgeChunk)
    private readonly chunkRepository: Repository<KnowledgeChunk>,
    @InjectRepository(KnowledgeDocument)
    private readonly documentRepository: Repository<KnowledgeDocument>,
  ) {}

  async save(chunk: KnowledgeChunkData): Promise<void> {
    const entity = this.chunkRepository.create({
      document_id: chunk.documentId,
      chunk_index: chunk.chunkIndex,
      content: chunk.content,
      embedding: JSON.stringify(chunk.embedding),
      token_count: chunk.tokenCount,
    });

    await this.chunkRepository.save(entity);
  }

  async saveBatch(chunks: KnowledgeChunkData[]): Promise<void> {
    const entities = chunks.map((chunk) =>
      this.chunkRepository.create({
        document_id: chunk.documentId,
        chunk_index: chunk.chunkIndex,
        content: chunk.content,
        embedding: JSON.stringify(chunk.embedding),
        token_count: chunk.tokenCount,
      }),
    );

    await this.chunkRepository.save(entities);
  }

  async findByDocumentId(documentId: string): Promise<KnowledgeChunkData[]> {
    const chunks = await this.chunkRepository.find({
      where: { document_id: documentId },
      order: { chunk_index: 'ASC' },
    });

    return chunks.map((chunk) => ({
      documentId: chunk.document_id,
      chunkIndex: chunk.chunk_index,
      content: chunk.content,
      embedding: JSON.parse(chunk.embedding),
      tokenCount: chunk.token_count,
      category: '', // Will be populated from document
    }));
  }

  async search(
    embedding: number[],
    options: SearchOptions,
  ): Promise<SearchResult[]> {
    const topK = options.topK || 5;
    const minScore = options.minScore || 0.7;

    let query = this.chunkRepository
      .createQueryBuilder('chunk')
      .leftJoinAndSelect('chunk.document', 'document')
      .select([
        'chunk.id',
        'chunk.content',
        'chunk.chunk_index',
        'chunk.created_at',
        'document.source_path',
        'document.category',
      ])
      .addSelect(
        `1 - (chunk.embedding <=> '[${embedding.join(',')}]')`,
        'score',
      )
      .where(`1 - (chunk.embedding <=> '[${embedding.join(',')}]') >= :minScore`, {
        minScore,
      });

    if (options.category) {
      query = query.andWhere('document.category = :category', {
        category: options.category,
      });
    }

    query = query.orderBy('score', 'DESC').limit(topK);

    const results = await query.getRawMany();

    return results.map((result) => ({
      content: result.chunk_content,
      score: parseFloat(result.score),
      metadata: {
        sourcePath: result.document_source_path,
        category: result.document_category,
        chunkIndex: result.chunk_chunk_index,
        timestamp: result.chunk_created_at,
      },
    }));
  }

  async deleteByDocumentId(documentId: string): Promise<void> {
    await this.chunkRepository.delete({ document_id: documentId });
  }
}
