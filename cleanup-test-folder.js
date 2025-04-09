/**
 * This utility script removes the problematic test/ folder from Google Cloud Storage
 */
require('dotenv').config();
const { Storage } = require('@google-cloud/storage');

async function deleteTestFolder() {
  try {
    console.log('Initializing storage client to delete test folder...');
    
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
    
    // Get all files in the test/ folder
    console.log('Listing files in test/ folder...');
    const [files] = await bucket.getFiles({ prefix: 'test/' });
    
    console.log(`Found ${files.length} files in test/ folder`);
    
    // Delete each file
    for (const file of files) {
      console.log(`Deleting file: ${file.name}`);
      await file.delete();
    }
    
    // Delete the test/ folder itself - this creates a placeholder empty folder marker
    console.log('Deleting test/ folder marker if it exists...');
    const testFolder = bucket.file('test/');
    await testFolder.delete().catch(err => {
      // It's okay if the folder doesn't exist
      console.log('Info: Folder marker might not exist:', err.message);
    });
    
    console.log('Successfully deleted test/ folder and all its contents');
  } catch (error) {
    console.error('Error deleting test folder:', error);
  }
}

deleteTestFolder();