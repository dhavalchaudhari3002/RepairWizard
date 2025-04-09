/**
 * Database Schema Update Script
 * 
 * This script updates the repair_sessions table to add the metadataUrl column
 * if it doesn't already exist, allowing proper storage of consolidated session data.
 */

const { drizzle } = require("drizzle-orm/postgres-js");
const { migrate } = require("drizzle-orm/postgres-js/migrator");
const postgres = require("postgres");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

async function updateSchema() {
  console.log("Starting database schema update...");
  // Connection string from environment variables
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error("DATABASE_URL environment variable is not set");
    process.exit(1);
  }
  
  // Create a client with updated schema
  const sql = postgres(connectionString);
  const db = drizzle(sql);
  
  try {
    console.log("Checking if metadataUrl column exists in repair_sessions table...");
    
    // Check if the column already exists
    const result = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'repair_sessions' 
        AND column_name = 'metadata_url'
    `;
    
    if (result.length === 0) {
      console.log("metadataUrl column doesn't exist. Adding it now...");
      
      // Add the column if it doesn't exist
      await sql`
        ALTER TABLE repair_sessions 
        ADD COLUMN metadata_url TEXT
      `;
      
      console.log("Successfully added metadataUrl column to repair_sessions table");
    } else {
      console.log("metadataUrl column already exists in repair_sessions table");
    }
    
    console.log("Database schema update completed successfully");
  } catch (error) {
    console.error("Error updating database schema:", error);
  } finally {
    // Close the database connection
    await sql.end();
  }
}

// Run the update function
updateSchema().catch(console.error);