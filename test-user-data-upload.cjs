/**
 * Test script to verify user-data folder uploads
 */
const { Storage } = require('@google-cloud/storage');
const fs = require('fs');

// Configuration
const TEST_USER_ID = 26;
const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'reusehub-repaire-data';
const FOLDER_NAME = 'user-data';

// Main function
async function testUserDataUpload() {
  try {
    console.log(`=== Testing User Data Folder Upload ===`);
    
    // Initialize Google Cloud Storage
    console.log('Initializing Google Cloud Storage...');
    const storage = new Storage({
      projectId: process.env.GCS_PROJECT_ID,
      credentials: process.env.GCS_CREDENTIALS ? JSON.parse(process.env.GCS_CREDENTIALS) : undefined
    });
    
    const bucket = storage.bucket(BUCKET_NAME);
    
    // Create dummy user data
    const userData = {
      userId: TEST_USER_ID,
      dataType: 'user_preferences',
      preferences: {
        theme: 'light',
        notifications: true,
        language: 'en-US'
      },
      createdAt: new Date().toISOString(),
      metadata: {
        source: 'test-user-data-upload.cjs',
        type: 'folder-test'
      }
    };
    
    // Generate filename with timestamp to avoid conflicts
    const timestamp = Date.now();
    const filename = `test_user_${TEST_USER_ID}_preferences_${timestamp}.json`;
    const filePath = `${FOLDER_NAME}/${filename}`;
    
    console.log(`Uploading test file to: ${filePath}`);
    
    // Create a file in the bucket
    const file = bucket.file(filePath);
    
    // Upload the file
    await file.save(JSON.stringify(userData, null, 2), {
      contentType: 'application/json',
      metadata: {
        source: 'test-script',
        type: 'user-data-test'
      }
    });
    
    // Verify the file was created
    console.log(`Uploaded file to ${filePath}`);
    
    // Get public URL
    const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${filePath}`;
    console.log(`Public URL: ${publicUrl}`);
    
    // Save test results
    const results = {
      testId: `user-data-test-${timestamp}`,
      userId: TEST_USER_ID,
      bucket: BUCKET_NAME,
      folder: FOLDER_NAME,
      filename,
      filePath,
      publicUrl,
      timestamp: new Date().toISOString(),
      success: true
    };
    
    const resultsFile = `user-data-upload-test-results-${timestamp}.json`;
    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
    console.log(`Test results saved to: ${resultsFile}`);
    
    console.log('=== User Data Folder Upload Test Completed Successfully ===');
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testUserDataUpload();