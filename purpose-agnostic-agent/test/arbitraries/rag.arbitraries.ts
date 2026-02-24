/**
 * RAG-specific Arbitraries for Property-Based Testing
 */

import * as fc from 'fast-check';
import {
  uuidArbitrary,
  knowledgeCategoryArbitrary,
  filePathArbitrary,
  embeddingVectorArbitrary,
  chunkContentArbitrary,
  similarityScoreArbitrary,
} from './common.arbitraries';

/**
 * Generate valid KnowledgeDocument objects
 */
export const knowledgeDocumentArbitrary = (): fc.Arbitrary<{
  id: string;
  sourcePath: string;
  category: string;
  fileHash: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}> =>
  fc.record({
    id: uuidArbitrary(),
    sourcePath: filePathArbitrary(),
    category: knowledgeCategoryArbitrary(),
    fileHash: fc.hexaString({ minLength: 64, maxLength: 64 }),
    metadata: fc.dictionary(fc.string(), fc.anything()),
    createdAt: fc.date(),
  });

/**
 * Generate valid KnowledgeChunk objects
 */
export const knowledgeChunkArbitrary = (): fc.Arbitrary<{
  id: string;
  documentId: string;
  content: string;
  embedding: number[];
  chunkIndex: number;
  category: string;
  sourcePath: string;
}> =>
  fc.record({
    id: uuidArbitrary(),
    documentId: uuidArbitrary(),
    content: chunkContentArbitrary(),
    embedding: embeddingVectorArbitrary(),
    chunkIndex: fc.integer({ min: 0, max: 1000 }),
    category: knowledgeCategoryArbitrary(),
    sourcePath: filePathArbitrary(),
  });

/**
 * Generate valid search result objects
 */
export const searchResultArbitrary = (): fc.Arbitrary<{
  content: string;
  sourcePath: string;
  category: string;
  chunkIndex: number;
  score: number;
}> =>
  fc.record({
    content: chunkContentArbitrary(),
    sourcePath: filePathArbitrary(),
    category: knowledgeCategoryArbitrary(),
    chunkIndex: fc.integer({ min: 0, max: 1000 }),
    score: similarityScoreArbitrary(),
  });

/**
 * Generate valid search query parameters
 */
export const searchQueryArbitrary = (): fc.Arbitrary<{
  query: string;
  category?: string;
  topK?: number;
  minScore?: number;
}> =>
  fc.record({
    query: fc.string({ minLength: 1, maxLength: 500 }),
    category: fc.option(knowledgeCategoryArbitrary(), { nil: undefined }),
    topK: fc.option(fc.integer({ min: 1, max: 20 }), { nil: undefined }),
    minScore: fc.option(fc.double({ min: 0.0, max: 1.0 }), { nil: undefined }),
  });

/**
 * Generate valid PDF text content
 */
export const pdfTextArbitrary = (): fc.Arbitrary<string> =>
  fc.array(fc.lorem({ maxCount: 50 }), { minLength: 5, maxLength: 100 }).map((paragraphs) =>
    paragraphs.join('\n\n'),
  );

/**
 * Generate valid text chunks
 */
export const textChunkArbitrary = (): fc.Arbitrary<{
  content: string;
  index: number;
  tokens: number;
}> =>
  fc.record({
    content: chunkContentArbitrary(),
    index: fc.integer({ min: 0, max: 1000 }),
    tokens: fc.integer({ min: 50, max: 512 }),
  });

/**
 * Generate document ingestion job data
 */
export const documentIngestionJobArbitrary = (): fc.Arbitrary<{
  filePath: string;
  category: string;
  metadata: Record<string, unknown>;
}> =>
  fc.record({
    filePath: filePathArbitrary(),
    category: knowledgeCategoryArbitrary(),
    metadata: fc.dictionary(fc.string(), fc.anything()),
  });
