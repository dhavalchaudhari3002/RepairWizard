/**
 * This script finds all files in the bucket related to a specific repair session ID
 * and verifies they are stored at the bucket root
 */
require('dotenv').config();
const { Storage } = require('@google-cloud/storage');

// The repair session ID to search for
const SESSION_ID = 139; // Replace with your session ID

async function findRepairSessionFiles() {
  try {
    console.log(`Looking for all files related to repair session #${SESSION_ID}...`);
    
    let credentials;
    try {
      credentials = JSON.parse(process.env.GCS_CREDENTIALS || '{}');
      console.log('Successfully parsed GCS credentials');
    } catch (error) {
      console.error('Error parsing GCS credentials:', error);
      return;
    }
    
    const projectId = process.env.GCS_PROJECT_ID;
    const bucketName = process.env.GCS_BUCKET_NAME;
    
    if (!projectId || !bucketName) {
      console.error('Missing required environment variables: GCS_PROJECT_ID or GCS_BUCKET_NAME');
      return;
    }
    
    console.log(`Using bucket: ${bucketName}`);
    
    // Initialize the Google Cloud Storage client
    const storage = new Storage({
      projectId,
      credentials
    });
    
    const bucket = storage.bucket(bucketName);
    
    // Get all files in the bucket
    const [files] = await bucket.getFiles();
    
    console.log(`Found ${files.length} total files in the bucket`);
    
    // Look for files that contain the session ID in their name
    const sessionFiles = files.filter(file => 
      file.name.includes(`_${SESSION_ID}_`) || 
      file.name.includes(`_${SESSION_ID}.`) ||
      file.name.includes(`session_${SESSION_ID}`) ||
      file.name.includes(`repair_${SESSION_ID}`) ||
      file.name.includes(`repair-${SESSION_ID}`)
    );
    
    if (sessionFiles.length > 0) {
      console.log(`\nFound ${sessionFiles.length} files related to session #${SESSION_ID}:`);
      
      for (const file of sessionFiles) {
        // Get file metadata
        const [metadata] = await file.getMetadata();
        
        console.log(`\nFile: ${file.name}`);
        console.log(`Size: ${metadata.size} bytes`);
        console.log(`Created: ${metadata.timeCreated}`);
        console.log(`Content type: ${metadata.contentType}`);
        
        // Check if file is in a folder structure
        if (file.name.includes('/')) {
          console.error(`WARNING: This file is in a folder structure: ${file.name}`);
          
          // Show the folder path
          const folderPath = file.name.substring(0, file.name.lastIndexOf('/'));
          console.error(`Folder path: ${folderPath}`);
        } else {
          console.log(`SUCCESS: This file is stored at bucket root: ${file.name}`);
        }
        
        // Get a sample of the file content (first 200 chars)
        try {
          const [content] = await file.download();
          const contentStr = content.toString().substring(0, 200);
          console.log(`Content preview: ${contentStr}...`);
        } catch (downloadErr) {
          console.error(`Could not download file content: ${downloadErr.message}`);
        }
      }
    } else {
      console.log(`\nNo files found specifically for session #${SESSION_ID}`);
      
      // Let's look for any files that might be related to repair sessions in general
      console.log(`\nSearching for any repair session files...`);
      
      const possibleSessionFiles = files.filter(file => 
        file.name.includes('session') || 
        file.name.includes('repair') || 
        file.name.includes('diagnostic') ||
        file.name.includes('consolidated')
      );
      
      if (possibleSessionFiles.length > 0) {
        console.log(`\nFound ${possibleSessionFiles.length} potential repair session files:`);
        possibleSessionFiles.forEach(file => console.log(`- ${file.name}`));
      } else {
        console.log(`No repair session files found at all`);
      }
    }
    
    // Now check for any recently created files (within the last hour)
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    
    const recentFiles = files.filter(file => {
      try {
        const createdTime = new Date(file.metadata.timeCreated);
        return createdTime > oneHourAgo;
      } catch (err) {
        return false;
      }
    });
    
    if (recentFiles.length > 0) {
      console.log(`\nFound ${recentFiles.length} files created in the last hour:`);
      recentFiles.forEach(file => console.log(`- ${file.name}`));
    }
    
  } catch (error) {
    console.error('Error finding repair session files:', error);
  }
}

// Run the search
findRepairSessionFiles();