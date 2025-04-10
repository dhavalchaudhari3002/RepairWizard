/**
 * Simple verification script to check that the uploadBuffer method 
 * correctly handles folders
 */

import dotenv from 'dotenv';
import { Storage } from '@google-cloud/storage';

// Load environment variables
dotenv.config();

async function verifyFolders() {
  console.log('Starting folder verification...');
  
  // Initialize Google Cloud Storage client
  const storage = new Storage();
  const bucketName = process.env.GCS_BUCKET_NAME;
  
  if (!bucketName) {
    console.error('Error: GCS_BUCKET_NAME environment variable is not set');
    process.exit(1);
  }
  
  console.log(`Using bucket: ${bucketName}`);
  const bucket = storage.bucket(bucketName);
  
  // List all files in the repair-session folder
  console.log('Checking repair-session folder:');
  try {
    const [repairFiles] = await bucket.getFiles({ 
      prefix: 'repair-session/' 
    });
    
    console.log(`Found ${repairFiles.length} files in repair-session folder`);
    repairFiles.slice(0, 5).forEach(file => {
      console.log(`- ${file.name}`);
    });
    if (repairFiles.length > 5) {
      console.log(`... and ${repairFiles.length - 5} more files`);
    }
    
    // List all files in the user-data folder
    console.log('\nChecking user-data folder:');
    const [userFiles] = await bucket.getFiles({ 
      prefix: 'user-data/' 
    });
    
    console.log(`Found ${userFiles.length} files in user-data folder`);
    userFiles.slice(0, 5).forEach(file => {
      console.log(`- ${file.name}`);
    });
    if (userFiles.length > 5) {
      console.log(`... and ${userFiles.length - 5} more files`);
    }
    
    // Print summary
    console.log('\nSummary:');
    console.log(`- repair-session folder: ${repairFiles.length} files`);
    console.log(`- user-data folder: ${userFiles.length} files`);
    
    // Verify folders exist
    if (repairFiles.length > 0 && userFiles.length > 0) {
      console.log('\n✅ Both folders exist and contain files');
    } else {
      if (repairFiles.length === 0) {
        console.log('\n❌ repair-session folder is empty or does not exist');
      }
      if (userFiles.length === 0) {
        console.log('\n❌ user-data folder is empty or does not exist');
      }
    }
    
  } catch (error) {
    console.error('Error verifying folders:', error);
    process.exit(1);
  }
}

// Run the verification
(async () => {
  await verifyFolders();
})();