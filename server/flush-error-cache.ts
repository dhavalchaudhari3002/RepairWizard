// Script to manually flush the error cache
import { db } from './db';
import { flushErrorCache } from './services/error-tracking';

async function manualFlush() {
  try {
    console.log("Manually flushing error cache...");
    
    // Now we can call the exported function directly
    await flushErrorCache();
    
    console.log("Error cache flushed successfully. Check the database for results.");
    
  } catch (error) {
    console.error("Error flushing cache:", error);
  }
}

// Run the flush
manualFlush();