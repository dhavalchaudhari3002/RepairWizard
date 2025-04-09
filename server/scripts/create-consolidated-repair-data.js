/**
 * Helper script to create consolidated repair data for a specific session.
 * This can be used from within the application or run directly to consolidate
 * previous repair session data.
 * 
 * Usage:
 *   node scripts/create-consolidated-repair-data.js <session_id>
 */

import { cloudDataSync } from '../services/cloud-data-sync.js';
import { db } from '../db.js';
import { repairSessions } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';

async function consolidateRepairSession(sessionId) {
  if (!sessionId || isNaN(Number(sessionId))) {
    console.error('Invalid session ID. Please provide a valid session ID.');
    return;
  }
  
  sessionId = Number(sessionId);
  
  try {
    // First, check if the session exists
    const [session] = await db
      .select()
      .from(repairSessions)
      .where(eq(repairSessions.id, sessionId));
      
    if (!session) {
      console.error(`Repair session with ID ${sessionId} not found.`);
      return;
    }
    
    console.log(`Consolidating data for repair session #${sessionId}...`);
    
    // Generate a consolidated file with all data
    const url = await cloudDataSync.storeConsolidatedSessionData(sessionId);
    
    console.log(`Consolidated file created successfully: ${url}`);
    return url;
  } catch (error) {
    console.error(`Error consolidating repair session data:`, error);
  }
}

// If this script is run directly (not imported)
if (process.argv[1].includes('create-consolidated-repair-data')) {
  const sessionId = process.argv[2];
  
  if (!sessionId) {
    console.error('Please provide a session ID.');
    console.error('Usage: node scripts/create-consolidated-repair-data.js <session_id>');
    process.exit(1);
  }
  
  consolidateRepairSession(sessionId)
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

export { consolidateRepairSession };