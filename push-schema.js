// push-schema.js
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { sql } from 'drizzle-orm';

async function createUserInteractionsTable() {
  // Initialize database connection
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  
  try {
    console.log('Checking if user_interactions table exists...');
    
    // Execute table creation directly
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "user_interactions" (
        "id" SERIAL PRIMARY KEY,
        "user_id" INTEGER REFERENCES "users"("id"),
        "repair_request_id" INTEGER REFERENCES "repair_requests"("id"),
        "interaction_type" TEXT NOT NULL,
        "guide_step" INTEGER,
        "guide_title" TEXT,
        "product_type" TEXT,
        "duration_seconds" INTEGER,
        "metadata" JSONB,
        "timestamp" TIMESTAMP DEFAULT now() NOT NULL
      );
    `);
    
    console.log('user_interactions table created or already exists.');
  } catch (error) {
    console.error('Error creating user_interactions table:', error);
  } finally {
    // Close the database connection
    await pool.end();
    console.log('Database connection closed. Done.');
    process.exit(0);
  }
}

createUserInteractionsTable();