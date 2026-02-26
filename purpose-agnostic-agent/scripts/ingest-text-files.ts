import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { RAGService } from '../src/rag/rag.service';
import * as fs from 'fs/promises';
import * as path from 'path';

async function ingestTextFiles() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const ragService = app.get(RAGService);

  const knowledgeDir = path.join(__dirname, '../knowledge/general');
  const files = await fs.readdir(knowledgeDir);
  const textFiles = files.filter(f => f.endsWith('.txt'));

  console.log(`Found ${textFiles.length} text files to ingest`);

  for (const file of textFiles) {
    const filePath = path.join(knowledgeDir, file);
    
    console.log(`Ingesting: ${file}`);
    
    // Use RAG service to ingest
    await ragService.ingestDocument(filePath, 'general');
    
    console.log(`✓ Ingested: ${file}`);
  }

  console.log('\nIngestion complete!');
  await app.close();
}

ingestTextFiles().catch(console.error);
