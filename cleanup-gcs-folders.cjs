/**
 * This utility script aggressively removes all folders from Google Cloud Storage
 * including any empty folders that might be appearing in the Google Cloud Storage UI
 * 
 * USAGE:
 * node cleanup-gcs-folders.cjs
 */
require('dotenv').config();
const { Storage } = require('@google-cloud/storage');

async function cleanupAllFolders() {
  try {
    console.log('Initializing Google Cloud Storage client for folder cleanup...');
    
    // Parse the GCS credentials from the environment variable
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
    
    console.log('Requesting all objects in the bucket to find folders...');
    
    // Get all objects in the bucket
    const [files] = await bucket.getFiles();
    
    console.log(`Found ${files.length} objects in the bucket`);
    
    // Identify potential folder markers (objects ending with '/' or empty objects)
    const potentialFolders = files.filter(file => 
      file.name.endsWith('/') || 
      file.name.includes('/') ||
      file.name === 'test' || 
      file.name === 'test/'
    );
    
    console.log(`Identified ${potentialFolders.length} potential folder markers`);
    
    // Delete all potential folder markers
    for (const folder of potentialFolders) {
      console.log(`Deleting folder marker: ${folder.name}`);
      try {
        await folder.delete();
        console.log(`Successfully deleted: ${folder.name}`);
      } catch (err) {
        console.error(`Error deleting ${folder.name}:`, err.message);
      }
    }
    
    // Now also try to delete the explicit test folder in various ways
    console.log('\nAttempting to delete test/ folder specifically...');
    
    // Different possible representations of the test folder
    const testFolderVariations = [
      'test',
      'test/',
      'test/.',
      'test//',
      'test#',
      'test:',
      'test.keep'
    ];
    
    // Try to delete each variation
    for (const testPath of testFolderVariations) {
      try {
        console.log(`Attempting to delete: ${testPath}`);
        const testFile = bucket.file(testPath);
        await testFile.delete();
        console.log(`Successfully deleted: ${testPath}`);
      } catch (err) {
        console.log(`Could not delete ${testPath}: ${err.message}`);
      }
    }
    
    // Attempt to list files with the test/ prefix
    try {
      console.log('\nChecking for any remaining files with test/ prefix...');
      const [testFiles] = await bucket.getFiles({ prefix: 'test' });
      
      if (testFiles.length > 0) {
        console.log(`Found ${testFiles.length} files with test/ prefix, deleting them...`);
        for (const file of testFiles) {
          console.log(`Deleting: ${file.name}`);
          await file.delete();
        }
        console.log('All files with test/ prefix deleted');
      } else {
        console.log('No files with test/ prefix found');
      }
    } catch (err) {
      console.error('Error listing files with test/ prefix:', err.message);
    }
    
    console.log('\nFolder cleanup completed');
    
    // As a final check, list all files again to verify
    try {
      const [remainingFiles] = await bucket.getFiles();
      const remainingFolders = remainingFiles.filter(file => 
        file.name.endsWith('/') || 
        file.name.includes('/') ||
        file.name === 'test' || 
        file.name === 'test/'
      );
      
      if (remainingFolders.length > 0) {
        console.log(`WARNING: There are still ${remainingFolders.length} folder-like objects in the bucket:`);
        remainingFolders.forEach(f => console.log(`- ${f.name}`));
      } else {
        console.log('SUCCESS: No folder-like objects remaining in the bucket');
      }
    } catch (err) {
      console.error('Error checking remaining files:', err.message);
    }
    
  } catch (error) {
    console.error('Error cleaning up folders:', error);
  }
}

// Run the cleanup
cleanupAllFolders();