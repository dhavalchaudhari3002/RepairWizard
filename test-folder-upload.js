/**
 * Test script to verify files are correctly uploaded to the designated folders
 */
import { Storage } from '@google-cloud/storage';
import path from 'path';
import fs from 'fs';

async function runTest() {
  console.log('Starting folder structure upload test...');
  
  // Create a test buffer
  const testBuffer = Buffer.from('This is a test file to verify folder uploads');
  
  // Initialize Google Cloud Storage
  const storage = new Storage();
  const bucketName = process.env.GCS_BUCKET_NAME;
  
  if (!bucketName) {
    console.error('Error: GCS_BUCKET_NAME environment variable is not set');
    process.exit(1);
  }
  
  console.log(`Using bucket: ${bucketName}`);
  const bucket = storage.bucket(bucketName);
  
  // Test uploading to repair-session folder
  const repairSessionFileName = `test-repair-${Date.now()}.txt`;
  const repairSessionFilePath = `repair-session/${repairSessionFileName}`;
  
  console.log(`Uploading test file to repair-session folder: ${repairSessionFilePath}`);
  
  try {
    // Create file in repair-session folder
    const repairSessionFile = bucket.file(repairSessionFilePath);
    await repairSessionFile.save(testBuffer, {
      metadata: {
        contentType: 'text/plain',
      }
    });
    
    console.log('✅ Successfully uploaded file to repair-session folder');
    
    // Test uploading to user-data folder
    const userDataFileName = `test-user-${Date.now()}.txt`;
    const userDataFilePath = `user-data/${userDataFileName}`;
    
    console.log(`Uploading test file to user-data folder: ${userDataFilePath}`);
    
    // Create file in user-data folder
    const userDataFile = bucket.file(userDataFilePath);
    await userDataFile.save(testBuffer, {
      metadata: {
        contentType: 'text/plain',
      }
    });
    
    console.log('✅ Successfully uploaded file to user-data folder');
    
    // Verify files exist
    console.log('Verifying uploaded files...');
    
    // Check repair-session file
    const [repairSessionFileExists] = await repairSessionFile.exists();
    console.log(`Repair session file exists: ${repairSessionFileExists}`);
    
    // Check user-data file
    const [userDataFileExists] = await userDataFile.exists();
    console.log(`User data file exists: ${userDataFileExists}`);
    
    // Clean up test files
    console.log('Cleaning up test files...');
    
    // Delete repair-session file
    await repairSessionFile.delete();
    console.log(`Deleted repair session test file: ${repairSessionFilePath}`);
    
    // Delete user-data file
    await userDataFile.delete();
    console.log(`Deleted user data test file: ${userDataFilePath}`);
    
    console.log('✅ Test completed successfully');
  } catch (error) {
    console.error('❌ Error during test:', error);
    process.exit(1);
  }
}

// Use IIFE for top-level await in ES modules
(async () => {
  await runTest();
})();