/**
 * Database connection abstraction for Replit PostgreSQL with user data only
 * 
 * This module configures the database connection to Replit PostgreSQL, which is used
 * exclusively for storing user information. All other application data is stored in
 * Google Cloud Storage buckets to optimize for scaling.
 * 
 * Future migration path: When user count grows beyond Replit PostgreSQL capacity,
 * this module will allow easy switching to Google Cloud SQL by setting the 
 * USE_GOOGLE_CLOUD_SQL environment variable to 'true'.
 */
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Initialize WebSocket for Neon database
neonConfig.webSocketConstructor = ws;

// Default to Replit's built-in PostgreSQL for user data storage
let connectionString = process.env.DATABASE_URL;

// Check if we should use Google Cloud SQL instead (for future migration)
if (process.env.USE_GOOGLE_CLOUD_SQL === 'true' && process.env.GOOGLE_CLOUD_SQL_CONNECTION) {
  console.log('Using Google Cloud SQL for user data storage');
  connectionString = process.env.GOOGLE_CLOUD_SQL_CONNECTION;
} else {
  console.log('Using Replit PostgreSQL for user data storage');
}

if (!connectionString) {
  throw new Error(
    "No database connection string available. Set either DATABASE_URL or GOOGLE_CLOUD_SQL_CONNECTION",
  );
}

// Create connection pool
export const pool = new Pool({ connectionString });

// Create Drizzle ORM instance
export const db = drizzle({ client: pool, schema });

/**
 * Get information about current database connection 
 * @returns Object with database connection info
 */
export function getDatabaseInfo() {
  return {
    provider: process.env.USE_GOOGLE_CLOUD_SQL === 'true' ? 'Google Cloud SQL' : 'Replit PostgreSQL',
    usingCloudSQL: process.env.USE_GOOGLE_CLOUD_SQL === 'true',
    // Don't return the actual connection string as it contains credentials
  };
}

/**
 * Test database connection
 * @returns Promise resolving to true if connection successful, or error message
 */
export async function testDatabaseConnection() {
  try {
    const result = await pool.query('SELECT 1 as test');
    return result.rows[0].test === 1;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return error instanceof Error ? error.message : String(error);
  }
}