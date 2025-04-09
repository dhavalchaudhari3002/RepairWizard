/**
 * Direct Upload Test
 * 
 * This script tests direct uploads to Google Cloud Storage bucket root
 * It creates files with unique names directly in the bucket without any folders
 */

const { Storage } = require('@google-cloud/storage');
const fs = require('fs');

// Create test data for upload
const testData = {
  timestamp: Date.now(),
  test: true,
  message: 'This is a direct upload test to bucket root (no folders)',
  testId: `test-${Date.now()}`,
};

// Run direct root upload test
async function testDirectRootUpload() {
  try {
    console.log('Running direct upload test to bucket root (no folder structure)...');
    
    // Get Google Cloud Storage credentials and config from environment
    if (!process.env.GCS_CREDENTIALS || !process.env.GCS_BUCKET_NAME || !process.env.GCS_PROJECT_ID) {
      console.error('ERROR: Missing required GCS environment variables');
      process.exit(1);
    }
    
    // Parse credentials
    let credentials;
    try {
      credentials = JSON.parse(process.env.GCS_CREDENTIALS);
      console.log('Successfully parsed GCS credentials');
    } catch (error) {
      console.error('Failed to parse GCS credentials:', error);
      process.exit(1);
    }
    
    // Initialize Google Cloud Storage
    const storage = new Storage({
      projectId: process.env.GCS_PROJECT_ID,
      credentials
    });
    
    const bucketName = process.env.GCS_BUCKET_NAME;
    console.log(`Using bucket: ${bucketName}`);
    
    // Verify bucket exists
    const [exists] = await storage.bucket(bucketName).exists();
    if (!exists) {
      console.error(`ERROR: Bucket ${bucketName} does not exist`);
      process.exit(1);
    }
    
    console.log(`Successfully connected to bucket: ${bucketName}`);
    
    // Generate filename based on timestamp to ensure uniqueness
    const timestamp = Date.now();
    const filename = `direct_bucket_root_test_${timestamp}.json`;
    
    console.log(`Creating test file: ${filename}`);
    
    // Upload the file directly to bucket root
    const file = storage.bucket(bucketName).file(filename);
    
    // Convert test data to JSON string
    const fileContent = JSON.stringify({
      ...testData,
      filename
    }, null, 2);
    
    // Upload the file
    await file.save(fileContent, {
      contentType: 'application/json',
      metadata: {
        contentType: 'application/json'
      }
    });
    
    // Get public URL
    const publicUrl = `https://storage.googleapis.com/${bucketName}/${filename}`;
    console.log(`Successfully uploaded file to: ${publicUrl}`);
    
    // Verify URL does not contain folders
    if (publicUrl.includes('/')) {
      const lastSlashIndex = publicUrl.lastIndexOf('/');
      const path = publicUrl.substring(0, lastSlashIndex);
      
      if (path.includes('/repair_data') || 
          path.includes('/sessions') || 
          path.includes('/diagnostics')) {
        console.error(`ERROR: URL contains folder structure: ${publicUrl}`);
        process.exit(1);
      }
    }
    
    console.log('TEST PASSED: File is in bucket root, not in any folder structure');
    
    // Save results locally
    const results = {
      testId: `direct-upload-test-${timestamp}`,
      timestamp,
      bucketName,
      filename,
      publicUrl,
      testData
    };
    
    fs.writeFileSync(
      `direct-upload-test-results-${timestamp}.json`,
      JSON.stringify(results, null, 2)
    );
    
    console.log(`Test results saved to: direct-upload-test-results-${timestamp}.json`);
    
    return {
      success: true,
      url: publicUrl
    };
  } catch (error) {
    console.error('TEST FAILED:', error);
    process.exit(1);
  }
}

// Run the test
testDirectRootUpload()
  .then(result => {
    console.log(`\nTest completed successfully: ${result.url}`);
    process.exit(0);
  })
  .catch(error => {
    console.error('Unhandled error in test:', error);
    process.exit(1);
  });