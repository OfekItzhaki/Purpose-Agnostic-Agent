export interface SearchOptions {
  category?: string;
  topK?: number;
  minScore?: number;
}

export interface SearchResult {
  content: string;
  metadata: ChunkMetadata;
  score: number;
}

export interface ChunkMetadata {
  sourcePath: string;
  category: string;
  chunkIndex: number;
  timestamp: Date;
}

export interface KnowledgeChunkData {
  documentId: string;
  chunkIndex: number;
  content: string;
  embedding: number[];
  tokenCount: number;
  category: string;
}

export interface KnowledgeChunkRepository {
  save(chunk: KnowledgeChunkData): Promise<void>;
  saveBatch(chunks: KnowledgeChunkData[]): Promise<void>;
  findByDocumentId(documentId: string): Promise<KnowledgeChunkData[]>;
  search(embedding: number[], options: SearchOptions): Promise<SearchResult[]>;
  deleteByDocumentId(documentId: string): Promise<void>;
}
