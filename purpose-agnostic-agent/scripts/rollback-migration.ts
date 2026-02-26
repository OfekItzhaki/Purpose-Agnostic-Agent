import { AppDataSource } from '../src/data-source.js';

async function rollbackMigration() {
  try {
    console.log('Initializing database connection...');
    await AppDataSource.initialize();
    
    console.log('Rolling back last migration...');
    await AppDataSource.undoLastMigration();
    
    console.log('Rollback completed successfully!');
    
    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('Rollback failed:', error);
    process.exit(1);
  }
}

rollbackMigration();
