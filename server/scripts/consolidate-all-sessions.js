/**
 * Batch script to consolidate all existing repair sessions into the
 * new consolidated file format.
 * 
 * This is useful for migrating existing data to the new format.
 */

import { cloudDataSync } from '../services/cloud-data-sync.js';
import { db } from '../db.js';
import { repairSessions } from '../../shared/schema.js';

async function consolidateAllSessions() {
  try {
    console.log('Starting consolidation of all repair sessions...');
    
    // Get all repair sessions
    const sessions = await db
      .select()
      .from(repairSessions);
      
    console.log(`Found ${sessions.length} repair sessions to consolidate`);
    
    // Process each session
    const results = [];
    for (const session of sessions) {
      try {
        console.log(`Processing session #${session.id}...`);
        const url = await cloudDataSync.storeConsolidatedSessionData(session.id);
        console.log(`Session #${session.id} consolidated at: ${url}`);
        results.push({
          sessionId: session.id,
          success: true,
          url: url
        });
      } catch (error) {
        console.error(`Error consolidating session #${session.id}:`, error);
        results.push({
          sessionId: session.id,
          success: false,
          error: String(error)
        });
      }
    }
    
    // Print summary
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;
    
    console.log('\n===== CONSOLIDATION SUMMARY =====');
    console.log(`Total sessions processed: ${results.length}`);
    console.log(`Successfully consolidated: ${successCount}`);
    console.log(`Failed to consolidate: ${failureCount}`);
    
    if (failureCount > 0) {
      console.log('\nFailed sessions:');
      results.filter(r => !r.success).forEach(r => {
        console.log(`- Session #${r.sessionId}: ${r.error}`);
      });
    }
    
    return results;
  } catch (error) {
    console.error('Error during batch consolidation:', error);
    throw error;
  }
}

// Run the script if it's executed directly
if (process.argv[1].includes('consolidate-all-sessions')) {
  consolidateAllSessions()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

export { consolidateAllSessions };