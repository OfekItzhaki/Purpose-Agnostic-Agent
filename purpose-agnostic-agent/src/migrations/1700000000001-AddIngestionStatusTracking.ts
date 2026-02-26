import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddIngestionStatusTracking1700000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add status enum type
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE ingestion_status AS ENUM ('pending', 'processing', 'completed', 'failed');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Add status column with default 'pending'
    await queryRunner.addColumn(
      'knowledge_documents',
      new TableColumn({
        name: 'status',
        type: 'ingestion_status',
        default: "'pending'",
        isNullable: false,
      }),
    );

    // Add error_message column for tracking failure details
    await queryRunner.addColumn(
      'knowledge_documents',
      new TableColumn({
        name: 'error_message',
        type: 'text',
        isNullable: true,
      }),
    );

    // Add retry_count column for tracking retry attempts
    await queryRunner.addColumn(
      'knowledge_documents',
      new TableColumn({
        name: 'retry_count',
        type: 'integer',
        default: 0,
        isNullable: false,
      }),
    );

    // Add updated_at column for tracking status changes
    await queryRunner.addColumn(
      'knowledge_documents',
      new TableColumn({
        name: 'updated_at',
        type: 'timestamp',
        default: 'NOW()',
        isNullable: false,
      }),
    );

    // Make file_hash nullable (it's set during processing, not at creation)
    await queryRunner.changeColumn(
      'knowledge_documents',
      'file_hash',
      new TableColumn({
        name: 'file_hash',
        type: 'varchar',
        isNullable: true,
      }),
    );

    // Update existing documents to 'completed' status
    await queryRunner.query(`
      UPDATE knowledge_documents 
      SET status = 'completed' 
      WHERE file_hash IS NOT NULL AND total_chunks > 0;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove added columns
    await queryRunner.dropColumn('knowledge_documents', 'updated_at');
    await queryRunner.dropColumn('knowledge_documents', 'retry_count');
    await queryRunner.dropColumn('knowledge_documents', 'error_message');
    await queryRunner.dropColumn('knowledge_documents', 'status');

    // Drop enum type
    await queryRunner.query(`DROP TYPE IF EXISTS ingestion_status;`);

    // Restore file_hash to NOT NULL
    await queryRunner.changeColumn(
      'knowledge_documents',
      'file_hash',
      new TableColumn({
        name: 'file_hash',
        type: 'varchar',
        isNullable: false,
      }),
    );
  }
}
