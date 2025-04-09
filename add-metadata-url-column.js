// add-metadata-url-column.js
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { sql } from 'drizzle-orm';

async function addMetadataUrlColumn() {
  // Initialize database connection
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  
  try {
    console.log('Adding metadata_url column to repair_sessions table...');
    
    // Check if column already exists
    const checkResult = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'repair_sessions' 
        AND column_name = 'metadata_url';
    `);
    
    if (checkResult.rows.length > 0) {
      console.log('metadata_url column already exists in repair_sessions table.');
    } else {
      // Add the column if it doesn't exist
      await db.execute(sql`
        ALTER TABLE "repair_sessions" 
        ADD COLUMN "metadata_url" TEXT;
      `);
      console.log('Successfully added metadata_url column to repair_sessions table.');
    }
  } catch (error) {
    console.error('Error adding metadata_url column:', error);
  } finally {
    // Close the database connection
    await pool.end();
    console.log('Database connection closed. Done.');
    process.exit(0);
  }
}

addMetadataUrlColumn();