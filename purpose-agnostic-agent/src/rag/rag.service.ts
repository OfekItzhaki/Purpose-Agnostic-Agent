import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import type {
  SearchOptions,
  SearchResult,
} from './interfaces/knowledge-chunk.repository.interface.js';
import { PostgresKnowledgeChunkRepository } from './repositories/postgres-knowledge-chunk.repository.js';
import { EmbeddingRouterService } from './services/embedding-router.service.js';
import { StructuredLogger } from '../common/logger.service.js';
import { FileUploadValidator } from '../common/validators/file-upload.validator.js';

@Injectable()
export class RAGService {
  private readonly logger = new StructuredLogger();

  constructor(
    private readonly chunkRepository: PostgresKnowledgeChunkRepository,
    private readonly embeddingService: EmbeddingRouterService,
    @InjectQueue('document-ingestion')
    private readonly ingestionQueue: Queue,
  ) {}

  async ingestDocument(path: string, category: string): Promise<string> {
    // Validate file path
    FileUploadValidator.validatePath(path);

    this.logger.log(`Queuing document ingestion: ${path}`, 'RAGService');

    const job = await this.ingestionQueue.add({
      filePath: path,
      category,
    });

    return job.id.toString();
  }

  async search(
    query: string,
    options: SearchOptions = {},
  ): Promise<SearchResult[]> {
    const startTime = Date.now();

    this.logger.log(`Searching knowledge base: ${query}`, 'RAGService');

    // Generate query embedding
    const queryEmbedding = await this.embeddingService.generateEmbedding(query);

    // Search vector database
    const results = await this.chunkRepository.search(queryEmbedding, {
      category: options.category,
      topK: options.topK || 5,
      minScore: options.minScore || 0.7,
    });

    const duration = Date.now() - startTime;

    this.logger.logPerformance('rag_search', duration, {
      query,
      category: options.category,
      resultsCount: results.length,
    });

    this.logger.log(
      `Found ${results.length} results in ${duration}ms`,
      'RAGService',
    );

    return results;
  }

  async getDocumentStatus(jobId: string): Promise<any> {
    const job = await this.ingestionQueue.getJob(jobId);

    if (!job) {
      return { status: 'not_found' };
    }

    const state = await job.getState();
    const progress = job.progress();

    return {
      status: state,
      progress,
      data: job.data,
    };
  }
}
