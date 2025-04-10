/**
 * User Database Utility Functions
 * 
 * These utilities help manage and monitor the SQL database that stores user information.
 * The database is configured to ONLY store user data, while other application data
 * (like repair sessions, diagnostics, etc.) is stored in Google Cloud Storage.
 */
import { db, pool } from '../db';
import { sql } from 'drizzle-orm';
import type { QueryResult } from '@neondatabase/serverless';

/**
 * Enumeration of database providers
 */
export enum DatabaseProvider {
  REPLIT_POSTGRES = 'replit_postgres',
  GOOGLE_CLOUD_SQL = 'google_cloud_sql',
}

/**
 * Get current user database statistics (table counts, sizes)
 * Useful for monitoring user database growth
 */
export async function getUserDatabaseStats() {
  try {
    // Get table sizes and row counts
    const tableSizes = await db.execute(sql`
      SELECT
        relname as table_name,
        pg_size_pretty(pg_total_relation_size(relid)) as total_size,
        pg_size_pretty(pg_relation_size(relid)) as table_size,
        pg_size_pretty(pg_total_relation_size(relid) - pg_relation_size(relid)) as index_size,
        n_live_tup as row_count
      FROM pg_stat_user_tables
      WHERE relname = 'users'
      ORDER BY pg_total_relation_size(relid) DESC;
    `);
    
    // Get database size
    const dbSizeResult = await db.execute(sql`
      SELECT pg_size_pretty(pg_database_size(current_database())) as database_size;
    `);
    
    // Safely extract database size with type assertion to handle QueryResult structure
    const dbSize = dbSizeResult.rows && dbSizeResult.rows.length > 0 
      ? dbSizeResult.rows[0] as { database_size: string } 
      : { database_size: 'unknown' };
    
    return {
      tables: tableSizes,
      databaseSize: dbSize.database_size,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error getting user database stats:', error);
    return {
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Optimize indexes for the user table to improve query performance
 * This is important as the user count grows in the Replit database
 */
export async function optimizeUserTableIndexes() {
  try {
    console.log('Optimizing user table indexes for better performance');
    
    // Add compound indexes that are useful for user authentication and lookup
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_users_email_role ON users (email, role);
    `);
    
    // Add index for faster profile lookups
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users (email_verified);
    `);
    
    return {
      success: true,
      message: 'Successfully optimized user table indexes',
    };
  } catch (error) {
    console.error('Error optimizing user table indexes:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Check if the user table is approaching scaling limits
 * This helps determine when to migrate to Google Cloud SQL
 */
export async function checkUserTableScaling() {
  try {
    const stats = await getUserDatabaseStats();
    
    // Determine if we need to scale based on user table size
    const needsScaling = { 
      needsMigration: false, 
      recommendations: [] as string[] 
    };
    
    // Safely parse the table data
    const tables = stats.tables?.rows || [];
    
    // Check specifically for the users table
    for (const table of tables) {
      // Use type assertion to handle unknown row_count type
      const rowCount = (table as any).row_count;
      if ((table as any).table_name === 'users' && typeof rowCount === 'number' && rowCount > 50000) {
        needsScaling.needsMigration = true;
        needsScaling.recommendations.push('User table has over 50,000 rows - consider migrating to Google Cloud SQL');
      }
    }
    
    // Check database size
    if (typeof stats.databaseSize === 'string' && stats.databaseSize.includes('GB')) {
      // Extract numeric part from string like "3.5 GB"
      const sizeMatch = stats.databaseSize.match(/(\d+\.?\d*)/);
      if (sizeMatch) {
        const sizeGB = parseFloat(sizeMatch[1]);
        if (sizeGB > 3) {
          needsScaling.needsMigration = true;
          needsScaling.recommendations.push(`Database size (${stats.databaseSize}) is approaching Replit limits - consider migrating to Google Cloud SQL`);
        }
      }
    }
    
    return {
      ...stats,
      scaling: needsScaling,
    };
  } catch (error) {
    console.error('Error checking user table scaling needs:', error);
    return {
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    };
  }
}