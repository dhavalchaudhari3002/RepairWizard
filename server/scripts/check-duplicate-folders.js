// Script to check for duplicate folders in Google Cloud Storage
import { googleCloudStorage } from '../services/google-cloud-storage.js';

async function checkDuplicateFolders() {
  try {
    console.log("Checking for duplicate session folders in Google Cloud Storage...");
    
    // Get all repair session folders from the bucket
    const [files] = await googleCloudStorage.storage.bucket(googleCloudStorage.bucketName).getFiles({
      prefix: 'repair_sessions/'
    });
    
    console.log(`Total files found: ${files.length}`);
    
    // Create a map to track session folders
    const sessionFolders = new Map();
    
    // Process file paths to extract session IDs
    for (const file of files) {
      const match = file.name.match(/repair_sessions\/(\d+)\//);
      if (match && match[1]) {
        const sessionId = parseInt(match[1]);
        
        if (!sessionFolders.has(sessionId)) {
          sessionFolders.set(sessionId, []);
        }
        
        sessionFolders.get(sessionId).push(file.name);
      }
    }
    
    // Report results
    console.log(`Found ${sessionFolders.size} unique session folders`);
    
    // Check for multiple folders with the same session ID
    let hasDuplicates = false;
    sessionFolders.forEach((fileNames, sessionId) => {
      // Count subfolders with the same session ID
      const uniqueSubFolders = new Set();
      fileNames.forEach(fileName => {
        const parts = fileName.split('/');
        if (parts.length >= 3) {
          uniqueSubFolders.add(`${parts[0]}/${parts[1]}`);
        }
      });
      
      if (uniqueSubFolders.size > 1) {
        console.log(`Potential issue: Session #${sessionId} has ${uniqueSubFolders.size} root folders:`);
        uniqueSubFolders.forEach(folder => console.log(`  - ${folder}`));
        hasDuplicates = true;
      }
    });
    
    if (!hasDuplicates) {
      console.log("No duplicate session folders were found. Your fix is working correctly!");
    } else {
      console.log("Some duplicate session folders were found. These were likely created before your fix.");
    }
    
  } catch (error) {
    console.error("Error checking for duplicate folders:", error);
  }
}

checkDuplicateFolders();