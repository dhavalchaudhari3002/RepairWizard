/**
 * Update Metadata URLs Script
 * 
 * This script finds all repair sessions that have consolidated data files in Google Cloud Storage
 * but don't have their metadataUrl field updated in the database, and updates them.
 */

const { drizzle } = require("drizzle-orm/postgres-js");
const postgres = require("postgres");
const path = require("path");
const { Storage } = require("@google-cloud/storage");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

async function updateMetadataUrls() {
  console.log("Starting metadata URL update process...");
  // Connection string from environment variables
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error("DATABASE_URL environment variable is not set");
    process.exit(1);
  }
  
  // Create a client
  const sql = postgres(connectionString);
  const db = drizzle(sql);
  
  // Set up Google Cloud Storage client
  let storage;
  const bucketName = process.env.GCS_BUCKET_NAME;
  const projectId = process.env.GCS_PROJECT_ID;
  
  try {
    // Initialize GCS client
    console.log("Initializing Google Cloud Storage client...");
    
    // Check if we have credentials
    if (!process.env.GCS_CREDENTIALS) {
      console.error("GCS_CREDENTIALS environment variable is not set");
      process.exit(1);
    }
    
    // Parse GCS credentials from environment variable
    const credentials = JSON.parse(process.env.GCS_CREDENTIALS);
    
    storage = new Storage({
      projectId,
      credentials,
    });
    
    console.log(`Working with bucket: ${bucketName}`);
    
    // First check if the column exists in the database
    const columnResult = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'repair_sessions' 
        AND column_name = 'metadata_url'
    `;
    
    if (columnResult.length === 0) {
      console.error("The metadataUrl column doesn't exist in the repair_sessions table. Run update-db-schema.js first.");
      process.exit(1);
    }
    
    // Get all repair sessions
    const repairSessions = await sql`SELECT id FROM repair_sessions`;
    console.log(`Found ${repairSessions.length} repair sessions in the database`);
    
    let updateCount = 0;
    
    // For each session, check if it has files in GCS but no metadataUrl in the DB
    for (const session of repairSessions) {
      const sessionId = session.id;
      const prefix = `repair_sessions/${sessionId}/`;
      
      // Check if session has a metadataUrl set
      const [dbSession] = await sql`
        SELECT metadata_url FROM repair_sessions WHERE id = ${sessionId}
      `;
      
      if (dbSession.metadata_url) {
        console.log(`Session #${sessionId} already has metadata URL: ${dbSession.metadata_url}`);
        continue;
      }
      
      // Check for files in GCS
      try {
        const [files] = await storage.bucket(bucketName).getFiles({ prefix });
        
        // If we found consolidated JSON files
        const consolidatedFiles = files.filter(file => 
          file.name.includes('session_') && file.name.endsWith('.json')
        );
        
        if (consolidatedFiles.length > 0) {
          // Use the newest file by sorting by name (which includes timestamp)
          consolidatedFiles.sort((a, b) => b.name.localeCompare(a.name));
          const newestFile = consolidatedFiles[0];
          
          // Create the full URL
          const metadataUrl = `https://storage.googleapis.com/${bucketName}/${newestFile.name}`;
          
          // Update the database
          await sql`
            UPDATE repair_sessions 
            SET metadata_url = ${metadataUrl} 
            WHERE id = ${sessionId}
          `;
          
          console.log(`Updated metadata URL for session #${sessionId}: ${metadataUrl}`);
          updateCount++;
        } else {
          console.log(`No consolidated files found for session #${sessionId}`);
        }
      } catch (error) {
        console.error(`Error checking files for session #${sessionId}:`, error);
      }
    }
    
    console.log(`Metadata URL update process completed. Updated ${updateCount} sessions.`);
  } catch (error) {
    console.error("Error updating metadata URLs:", error);
  } finally {
    // Close the database connection
    await sql.end();
  }
}

// Run the update function
updateMetadataUrls().catch(console.error);