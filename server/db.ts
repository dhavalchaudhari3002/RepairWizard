/**
 * Main database module - re-exports database connection from abstraction layer
 * This allows easy switching between Replit PostgreSQL and Google Cloud SQL
 */
import { pool, db, getDatabaseInfo, testDatabaseConnection } from './db-connection';

// Check database connection on startup
testDatabaseConnection()
  .then(result => {
    if (result === true) {
      console.log('Database connection successful');
    } else {
      console.error('Database connection failed:', result);
    }
  })
  .catch(error => {
    console.error('Error testing database connection:', error);
  });

// Re-export database connection and ORM
export { pool, db, getDatabaseInfo, testDatabaseConnection };
