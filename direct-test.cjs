/**
 * Simple direct test for Google Cloud Storage uploads
 */

// Import the Google Cloud Storage library directly
const { Storage } = require('@google-cloud/storage');

async function testDirectUpload() {
  try {
    console.log('Starting direct GCS upload test...');
    
    // Initialize GCS with credentials from environment
    let credentials;
    try {
      credentials = JSON.parse(process.env.GCS_CREDENTIALS);
      console.log('Found GCS credentials in environment');
    } catch (error) {
      console.error('Error parsing GCS credentials:', error);
      process.exit(1);
    }
    
    const bucketName = process.env.GCS_BUCKET_NAME;
    if (!bucketName) {
      console.error('Missing GCS_BUCKET_NAME environment variable');
      process.exit(1);
    }
    
    const projectId = process.env.GCS_PROJECT_ID;
    if (!projectId) {
      console.error('Missing GCS_PROJECT_ID environment variable');
      process.exit(1);
    }
    
    console.log(`Using bucket: ${bucketName}`);
    
    // Initialize storage
    const storage = new Storage({
      projectId,
      credentials
    });
    
    // Test bucket access
    console.log('Testing bucket access...');
    const [exists] = await storage.bucket(bucketName).exists();
    if (!exists) {
      console.error(`Bucket ${bucketName} does not exist`);
      process.exit(1);
    }
    
    console.log(`Bucket ${bucketName} exists!`);
    
    // Upload test file directly to bucket root
    const timestamp = Date.now();
    const testFilename = `direct_root_test_${timestamp}.json`;
    const testData = {
      test: true,
      timestamp,
      message: "This is a direct upload test to bucket root (no folders)"
    };
    
    console.log(`Uploading test file: ${testFilename}`);
    
    const file = storage.bucket(bucketName).file(testFilename);
    await file.save(
      JSON.stringify(testData, null, 2),
      {
        contentType: 'application/json',
        metadata: {
          contentType: 'application/json'
        }
      }
    );
    
    // Get the URL
    const publicUrl = `https://storage.googleapis.com/${bucketName}/${testFilename}`;
    console.log('Upload successful!');
    console.log('File URL:', publicUrl);
    
    // Verify URL doesn't have folders
    if (publicUrl.includes('/repair_data/') || 
        publicUrl.includes('/sessions/') || 
        publicUrl.includes('/diagnostics/')) {
      console.error('ERROR: URL contains folder structures:', publicUrl);
      process.exit(1);
    }
    
    console.log('TEST PASSED: File uploaded directly to bucket root');
    console.log('No folder structures detected in the URL');
    
    process.exit(0);
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testDirectUpload();