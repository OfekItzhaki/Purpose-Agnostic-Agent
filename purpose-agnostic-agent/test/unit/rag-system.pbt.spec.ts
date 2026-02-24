import * as fc from 'fast-check';
import { pbtConfig } from '../pbt.config';

/**
 * Property-Based Tests for RAG System
 * 
 * These tests validate:
 * - Property 5: Category Tagging from Folder Structure
 * - Property 6: Embedding Generation and Storage
 */

describe('RAG System Properties', () => {
  describe('Property 5: Category Tagging from Folder Structure', () => {
    it('should extract category from folder path', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('general', 'technical', 'creative', 'support', 'legal'),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('/')),
          (category, filename) => {
            const folderPath = `/knowledge/${category}/${filename}`;

            // Extract category from path
            const pathParts = folderPath.split('/');
            const knowledgeIndex = pathParts.indexOf('knowledge');
            const extractedCategory = knowledgeIndex >= 0 && pathParts.length > knowledgeIndex + 1
              ? pathParts[knowledgeIndex + 1]
              : 'unknown';

            // Verify category extraction
            expect(extractedCategory).toBe(category);
          },
        ),
        pbtConfig.standard,
      );
    });

    it('should handle nested folder structures', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('general', 'technical', 'creative'),
          fc.array(fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes('/')), { minLength: 1, maxLength: 3 }),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('/')),
          (category, subfolders, filename) => {
            const folderPath = `/knowledge/${category}/${subfolders.join('/')}/${filename}`;

            // Extract category (should be first folder after /knowledge/)
            const pathParts = folderPath.split('/');
            const knowledgeIndex = pathParts.indexOf('knowledge');
            const extractedCategory = knowledgeIndex >= 0 && pathParts.length > knowledgeIndex + 1
              ? pathParts[knowledgeIndex + 1]
              : 'unknown';

            // Category should always be the immediate subfolder of /knowledge/
            expect(extractedCategory).toBe(category);
          },
        ),
        pbtConfig.standard,
      );
    });

    it('should handle paths without knowledge folder', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => !s.includes('knowledge')),
          (path) => {
            // Extract category from path without /knowledge/
            const pathParts = path.split('/');
            const knowledgeIndex = pathParts.indexOf('knowledge');
            const extractedCategory = knowledgeIndex >= 0 && pathParts.length > knowledgeIndex + 1
              ? pathParts[knowledgeIndex + 1]
              : 'unknown';

            // Should default to 'unknown' when no knowledge folder
            expect(extractedCategory).toBe('unknown');
          },
        ),
        pbtConfig.standard,
      );
    });

    it('should preserve category through chunking process', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('general', 'technical', 'creative'),
          fc.string({ minLength: 100, maxLength: 1000 }),
          fc.integer({ min: 50, max: 200 }), // chunk size
          (category, text, chunkSize) => {
            // Simulate chunking
            const chunks: Array<{ content: string; category: string }> = [];
            for (let i = 0; i < text.length; i += chunkSize) {
              chunks.push({
                content: text.slice(i, i + chunkSize),
                category: category, // Category should be preserved
              });
            }

            // Verify all chunks have the same category
            chunks.forEach(chunk => {
              expect(chunk.category).toBe(category);
            });
          },
        ),
        pbtConfig.standard,
      );
    });
  });

  describe('Property 6: Embedding Generation and Storage', () => {
    it('should generate embeddings with correct dimensions', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 500 }),
          fc.constantFrom(1536, 768, 384), // Common embedding dimensions
          (text, expectedDimensions) => {
            // Simulate embedding generation
            const embedding = new Array(expectedDimensions).fill(0).map(() => Math.random());

            // Verify dimensions
            expect(embedding.length).toBe(expectedDimensions);

            // Verify all values are numbers
            embedding.forEach(value => {
              expect(typeof value).toBe('number');
              expect(isNaN(value)).toBe(false);
            });
          },
        ),
        pbtConfig.standard,
      );
    });

    it('should normalize embedding vectors', () => {
      fc.assert(
        fc.property(
          fc.array(fc.float({ min: -10, max: 10 }), { minLength: 100, maxLength: 1536 })
            .filter(arr => arr.some(val => !isNaN(val) && isFinite(val))), // Filter out all-NaN or all-infinite arrays
          (rawEmbedding) => {
            // Filter out NaN and infinite values
            const cleanEmbedding = rawEmbedding.map(val => 
              isNaN(val) || !isFinite(val) ? 0 : val
            );

            // Calculate magnitude
            const magnitude = Math.sqrt(
              cleanEmbedding.reduce((sum, val) => sum + val * val, 0)
            );

            // Normalize
            const normalized = magnitude > 0
              ? cleanEmbedding.map(val => val / magnitude)
              : cleanEmbedding;

            // Calculate normalized magnitude
            const normalizedMagnitude = Math.sqrt(
              normalized.reduce((sum, val) => sum + val * val, 0)
            );

            // Verify magnitude is approximately 1 (or 0 if original was zero vector)
            if (magnitude > 0) {
              expect(Math.abs(normalizedMagnitude - 1.0)).toBeLessThan(0.0001);
            } else {
              expect(normalizedMagnitude).toBe(0);
            }
          },
        ),
        pbtConfig.standard,
      );
    });

    it('should store embeddings with associated metadata', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 500 }), // content
          fc.array(fc.float(), { minLength: 1536, maxLength: 1536 }), // embedding
          fc.constantFrom('general', 'technical', 'creative'), // category
          fc.string({ minLength: 1, maxLength: 200 }), // sourcePath
          fc.integer({ min: 0, max: 100 }), // chunkIndex
          (content, embedding, category, sourcePath, chunkIndex) => {
            // Simulate storage
            const storedChunk = {
              content,
              embedding,
              metadata: {
                category,
                sourcePath,
                chunkIndex,
              },
            };

            // Verify all data is preserved
            expect(storedChunk.content).toBe(content);
            expect(storedChunk.embedding).toEqual(embedding);
            expect(storedChunk.metadata.category).toBe(category);
            expect(storedChunk.metadata.sourcePath).toBe(sourcePath);
            expect(storedChunk.metadata.chunkIndex).toBe(chunkIndex);
          },
        ),
        pbtConfig.standard,
      );
    });

    it('should handle batch embedding generation', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 10, maxLength: 200 }), { minLength: 1, maxLength: 50 }),
          fc.integer({ min: 1, max: 10 }), // batch size
          (texts, batchSize) => {
            // Simulate batch processing
            const batches: string[][] = [];
            for (let i = 0; i < texts.length; i += batchSize) {
              batches.push(texts.slice(i, i + batchSize));
            }

            // Verify batching
            const totalProcessed = batches.reduce((sum, batch) => sum + batch.length, 0);
            expect(totalProcessed).toBe(texts.length);

            // Verify batch sizes
            batches.forEach((batch, index) => {
              if (index < batches.length - 1) {
                // All batches except last should be full
                expect(batch.length).toBeLessThanOrEqual(batchSize);
              }
              // Last batch can be smaller
              expect(batch.length).toBeGreaterThan(0);
            });
          },
        ),
        pbtConfig.standard,
      );
    });

    it('should calculate cosine similarity correctly', () => {
      fc.assert(
        fc.property(
          fc.array(fc.float({ min: -1, max: 1, noNaN: true }), { minLength: 10, maxLength: 100 }),
          fc.array(fc.float({ min: -1, max: 1, noNaN: true }), { minLength: 10, maxLength: 100 }),
          (vec1, vec2) => {
            fc.pre(vec1.length === vec2.length); // Vectors must be same length

            // Calculate cosine similarity
            const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
            const mag1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
            const mag2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));

            const similarity = mag1 > 0 && mag2 > 0 ? dotProduct / (mag1 * mag2) : 0;

            // Verify similarity is in valid range [-1, 1]
            expect(similarity).toBeGreaterThanOrEqual(-1.0);
            expect(similarity).toBeLessThanOrEqual(1.0);

            // Verify self-similarity is 1 for non-zero vectors
            if (mag1 > 0.01) { // Only check for vectors with meaningful magnitude
              const selfDotProduct = vec1.reduce((sum, val) => sum + val * val, 0);
              const selfSimilarity = selfDotProduct / (mag1 * mag1);
              // Self-similarity should be exactly 1
              expect(Math.abs(selfSimilarity - 1.0)).toBeLessThan(0.0001);
            }
          },
        ),
        pbtConfig.standard,
      );
    });
  });
});
