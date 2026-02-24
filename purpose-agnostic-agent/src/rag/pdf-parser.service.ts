import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import pdfParse from 'pdf-parse';
import { encoding_for_model } from 'tiktoken';

export interface TextChunk {
  content: string;
  tokenCount: number;
  chunkIndex: number;
}

export interface ChunkOptions {
  maxTokens?: number;
  overlap?: number;
}

@Injectable()
export class PDFParserService {
  private readonly encoder = encoding_for_model('gpt-4');

  async extractText(filePath: string): Promise<string> {
    const dataBuffer = await fs.readFile(filePath);
    const data = await (pdfParse as any)(dataBuffer);
    return data.text;
  }

  async chunkText(
    text: string,
    options: ChunkOptions = {},
  ): Promise<TextChunk[]> {
    const maxTokens = options.maxTokens || 512;
    const overlap = options.overlap || 50;

    // Split by paragraphs first
    const paragraphs = text
      .split(/\n\n+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const chunks: TextChunk[] = [];
    let currentChunk = '';
    let currentTokens = 0;
    let chunkIndex = 0;

    for (const paragraph of paragraphs) {
      const paragraphTokens = this.countTokens(paragraph);

      // If adding this paragraph exceeds max tokens, save current chunk
      if (currentTokens + paragraphTokens > maxTokens && currentChunk) {
        chunks.push({
          content: currentChunk.trim(),
          tokenCount: currentTokens,
          chunkIndex: chunkIndex++,
        });

        // Start new chunk with overlap
        const overlapText = this.getOverlapText(currentChunk, overlap);
        currentChunk = overlapText + '\n\n' + paragraph;
        currentTokens = this.countTokens(currentChunk);
      } else {
        // Add paragraph to current chunk
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
        currentTokens += paragraphTokens;
      }
    }

    // Add final chunk
    if (currentChunk) {
      chunks.push({
        content: currentChunk.trim(),
        tokenCount: currentTokens,
        chunkIndex: chunkIndex,
      });
    }

    return chunks;
  }

  extractCategoryFromPath(filePath: string): string {
    // Extract category from /knowledge/{category}/ pattern
    const match = filePath.match(/\/knowledge\/([^\/]+)\//);
    return match ? match[1] : 'general';
  }

  private countTokens(text: string): number {
    try {
      const tokens = this.encoder.encode(text);
      return tokens.length;
    } catch {
      // Fallback: rough estimate (1 token ≈ 4 characters)
      return Math.ceil(text.length / 4);
    }
  }

  private getOverlapText(text: string, overlapTokens: number): string {
    const tokens = this.encoder.encode(text);
    if (tokens.length <= overlapTokens) {
      return text;
    }

    const overlapTokensArray = tokens.slice(-overlapTokens);
    return new TextDecoder().decode(new Uint8Array(overlapTokensArray));
  }
}
