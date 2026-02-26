import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class AddIngestionEventsTable1700000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create ingestion_events table
    await queryRunner.createTable(
      new Table({
        name: 'ingestion_events',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'document_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'event_type',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'timestamp',
            type: 'timestamp',
            default: 'NOW()',
            isNullable: false,
          },
          {
            name: 'processing_time_ms',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'embedding_provider',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'error_message',
            type: 'text',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Add foreign key from ingestion_events to knowledge_documents
    await queryRunner.createForeignKey(
      'ingestion_events',
      new TableForeignKey({
        columnNames: ['document_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'knowledge_documents',
        onDelete: 'CASCADE',
      }),
    );

    // Create indexes for efficient querying
    await queryRunner.createIndex(
      'ingestion_events',
      new TableIndex({
        name: 'IDX_INGESTION_EVENTS_DOCUMENT_ID',
        columnNames: ['document_id'],
      }),
    );

    await queryRunner.createIndex(
      'ingestion_events',
      new TableIndex({
        name: 'IDX_INGESTION_EVENTS_TIMESTAMP',
        columnNames: ['timestamp'],
      }),
    );

    await queryRunner.createIndex(
      'ingestion_events',
      new TableIndex({
        name: 'IDX_INGESTION_EVENTS_EVENT_TYPE',
        columnNames: ['event_type'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('ingestion_events', true);
  }
}
