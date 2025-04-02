import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import dotenv from 'dotenv';

// Load the environment variables
dotenv.config();

// Establish database connection
const connectionString = process.env.DATABASE_URL;
const sql = postgres(connectionString, { max: 1 });
const db = drizzle(sql);

// The tables we need to create
const tables = [
  {
    name: 'products',
    sql: `
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        brand TEXT NOT NULL,
        image_url TEXT,
        specifications JSONB,
        common_failure_points JSONB,
        maintenance_tips JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `
  },
  {
    name: 'diagnostic_question_trees',
    sql: `
      CREATE TABLE IF NOT EXISTS diagnostic_question_trees (
        id SERIAL PRIMARY KEY,
        product_category TEXT NOT NULL,
        sub_category TEXT,
        version INTEGER NOT NULL DEFAULT 1,
        tree_data JSONB NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `
  },
  {
    name: 'failure_patterns',
    sql: `
      CREATE TABLE IF NOT EXISTS failure_patterns (
        id SERIAL PRIMARY KEY,
        product_category TEXT NOT NULL,
        title TEXT NOT NULL,
        symptoms TEXT[],
        causes TEXT[],
        telltale_audio_cues TEXT[],
        visual_indicators TEXT[],
        recommended_questions TEXT[],
        urgency_level TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `
  },
  {
    name: 'repair_history',
    sql: `
      CREATE TABLE IF NOT EXISTS repair_history (
        id SERIAL PRIMARY KEY,
        repair_request_id INTEGER NOT NULL REFERENCES repair_requests(id),
        diagnosis_accuracy DECIMAL,
        actual_problem TEXT,
        solution_effectiveness DECIMAL,
        followup_notes TEXT,
        user_reported BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `
  }
];

async function createTables() {
  console.log('Starting schema migration...');
  
  for (const table of tables) {
    try {
      console.log(`Creating table: ${table.name}`);
      await sql.unsafe(table.sql);
      console.log(`Table ${table.name} created successfully`);
    } catch (error) {
      console.error(`Error creating table ${table.name}:`, error);
    }
  }
  
  console.log('Schema migration completed');
  
  // Close the database connection
  await sql.end();
  process.exit(0);
}

// Run the migration
createTables().catch(err => {
  console.error('Schema migration failed:', err);
  process.exit(1);
});