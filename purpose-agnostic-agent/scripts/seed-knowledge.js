const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function seedKnowledge() {
  const client = new Client({
    host: process.env.DATABASE_HOST || 'localhost',
    port: process.env.DATABASE_PORT || 5432,
    user: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'password',
    database: process.env.DATABASE_NAME || 'purpose_agnostic_agent',
  });

  await client.connect();
  console.log('Connected to database');

  const knowledgeDir = path.join(__dirname, '../knowledge');
  const categories = ['general', 'support'];

  let totalFiles = 0;
  let totalChunks = 0;

  for (const category of categories) {
    const categoryDir = path.join(knowledgeDir, category);
    
    if (!fs.existsSync(categoryDir)) {
      console.log(`Skipping ${category} - directory not found`);
      continue;
    }

    const files = fs.readdirSync(categoryDir).filter(f => f.endsWith('.txt'));
    console.log(`\nProcessing ${files.length} files in ${category} category...`);

    for (const file of files) {
      const filePath = path.join(categoryDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const relativePath = `knowledge/${category}/${file}`;

      // Check if document already exists
      const existing = await client.query(
        'SELECT id FROM knowledge_documents WHERE source_path = $1',
        [relativePath]
      );

      if (existing.rows.length > 0) {
        console.log(`  ⊘ Skipped ${file} (already exists)`);
        continue;
      }

      // Create document record
      const docResult = await client.query(
        `INSERT INTO knowledge_documents (source_path, category, file_hash, total_chunks, status)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [relativePath, category, 'manual-seed', 1, 'completed']
      );

      const documentId = docResult.rows[0].id;

      // Create a single chunk with the full content
      // Note: Using a zero vector as placeholder since we don't have embeddings
      const zeroVector = '[' + Array(768).fill(0).join(',') + ']';
      await client.query(
        `INSERT INTO knowledge_chunks (document_id, chunk_index, content, embedding, token_count)
         VALUES ($1, $2, $3, $4, $5)`,
        [documentId, 0, content, zeroVector, content.split(/\s+/).length]
      );

      console.log(`  ✓ Ingested ${file}`);
      totalFiles++;
      totalChunks++;
    }
  }

  console.log(`\n✅ Ingestion complete!`);
  console.log(`   Documents: ${totalFiles}`);
  console.log(`   Chunks: ${totalChunks}`);

  await client.end();
}

seedKnowledge().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
