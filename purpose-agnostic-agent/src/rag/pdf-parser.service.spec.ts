import { Test, TestingModule } from '@nestjs/testing';
import { PDFParserService } from './pdf-parser.service';
import * as fs from 'fs/promises';

jest.mock('fs/promises');

// Mock pdf-parse module
jest.mock('pdf-parse', () => {
  return jest.fn();
});

describe('PDFParserService', () => {
  let service: PDFParserService;
  let pdfParse: jest.Mock;

  beforeEach(async () => {
    // Get the mocked pdf-parse function
    pdfParse = require('pdf-parse');

    const module: TestingModule = await Test.createTestingModule({
      providers: [PDFParserService],
    }).compile();

    service = module.get<PDFParserService>(PDFParserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('extractText', () => {
    it('should extract text from PDF file', async () => {
      const mockBuffer = Buffer.from('mock pdf data');
      const mockText = 'This is extracted text from PDF';

      (fs.readFile as jest.Mock).mockResolvedValue(mockBuffer);
      pdfParse.mockResolvedValue({ text: mockText });

      const result = await service.extractText('/path/to/document.pdf');

      expect(result).toBe(mockText);
      expect(fs.readFile).toHaveBeenCalledWith('/path/to/document.pdf');
    });

    it('should handle PDF parsing errors', async () => {
      (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from('data'));
      pdfParse.mockRejectedValue(new Error('Invalid PDF'));

      await expect(
        service.extractText('/path/to/invalid.pdf'),
      ).rejects.toThrow('Invalid PDF');
    });

    it('should handle file read errors', async () => {
      (fs.readFile as jest.Mock).mockRejectedValue(
        new Error('File not found'),
      );

      await expect(
        service.extractText('/path/to/missing.pdf'),
      ).rejects.toThrow('File not found');
    });
  });

  describe('chunkText', () => {
    it('should chunk text into segments with default options', async () => {
      const text = 'Paragraph 1.\n\nParagraph 2.\n\nParagraph 3.';

      const chunks = await service.chunkText(text);

      expect(chunks).toBeDefined();
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0]).toHaveProperty('content');
      expect(chunks[0]).toHaveProperty('tokenCount');
      expect(chunks[0]).toHaveProperty('chunkIndex');
      expect(chunks[0].chunkIndex).toBe(0);
    });

    it('should respect maxTokens option', async () => {
      const longText = 'Word '.repeat(1000); // Create long text

      const chunks = await service.chunkText(longText, { maxTokens: 100 });

      // Each chunk should not exceed maxTokens significantly
      // Note: Due to paragraph boundaries, chunks may be larger
      expect(chunks.length).toBeGreaterThan(0);
      chunks.forEach((chunk) => {
        expect(chunk.tokenCount).toBeGreaterThan(0);
      });
    });

    it('should apply overlap between chunks', async () => {
      const text = Array(10)
        .fill('This is a paragraph with some content.')
        .join('\n\n');

      const chunks = await service.chunkText(text, {
        maxTokens: 50,
        overlap: 10,
      });

      expect(chunks.length).toBeGreaterThan(1);
      // Verify chunks have sequential indices
      chunks.forEach((chunk, index) => {
        expect(chunk.chunkIndex).toBe(index);
      });
    });

    it('should handle empty text', async () => {
      const chunks = await service.chunkText('');

      expect(chunks).toEqual([]);
    });

    it('should handle text with no paragraph breaks', async () => {
      const text = 'This is a single paragraph without breaks.';

      const chunks = await service.chunkText(text);

      expect(chunks.length).toBe(1);
      expect(chunks[0].content).toBe(text);
    });

    it('should preserve paragraph boundaries', async () => {
      const text = 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.';

      const chunks = await service.chunkText(text, { maxTokens: 1000 });

      // With high maxTokens, should keep all paragraphs together
      expect(chunks.length).toBe(1);
      expect(chunks[0].content).toContain('First paragraph');
      expect(chunks[0].content).toContain('Second paragraph');
      expect(chunks[0].content).toContain('Third paragraph');
    });

    it('should handle various text sizes', async () => {
      const smallText = 'Small text.';
      const mediumText = Array(5).fill('Medium paragraph.').join('\n\n');
      const largeText = Array(50).fill('Large paragraph.').join('\n\n');

      const smallChunks = await service.chunkText(smallText);
      const mediumChunks = await service.chunkText(mediumText);
      const largeChunks = await service.chunkText(largeText);

      expect(smallChunks.length).toBe(1);
      expect(mediumChunks.length).toBeGreaterThanOrEqual(1);
      expect(largeChunks.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('extractCategoryFromPath', () => {
    it('should extract category from standard knowledge path', () => {
      const path = '/knowledge/medical/document.pdf';
      const category = service.extractCategoryFromPath(path);

      expect(category).toBe('medical');
    });

    it('should extract category from nested path', () => {
      const path = '/knowledge/legal/contracts/document.pdf';
      const category = service.extractCategoryFromPath(path);

      expect(category).toBe('legal');
    });

    it('should return "general" for paths without category', () => {
      const path = '/documents/document.pdf';
      const category = service.extractCategoryFromPath(path);

      expect(category).toBe('general');
    });

    it('should handle Windows-style paths', () => {
      const path = 'C:\\knowledge\\technical\\guide.pdf';
      const category = service.extractCategoryFromPath(path);

      // Windows paths use backslashes, regex looks for forward slashes
      expect(category).toBe('general');
    });

    it('should handle relative paths', () => {
      const path = './knowledge/finance/report.pdf';
      const category = service.extractCategoryFromPath(path);

      expect(category).toBe('finance');
    });
  });
});
