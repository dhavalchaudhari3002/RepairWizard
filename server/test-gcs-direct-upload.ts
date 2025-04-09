import { googleCloudStorage } from './services/google-cloud-storage';

/**
 * Test direct uploads to GCS bucket root
 * This test uploads files directly to the bucket root
 */
async function testDirectUpload() {
  try {
    console.log('Testing direct upload to Google Cloud Storage bucket root...');
    
    // Generate a unique test file name
    const timestamp = Date.now();
    const testFileName = `test_file_direct_${timestamp}.json`;
    
    // Test data
    const testData = {
      test: true,
      timestamp,
      message: 'This is a test file uploaded directly to bucket root'
    };
    
    // Upload directly to bucket root (no folder prefix)
    const url = await googleCloudStorage.uploadText(
      testFileName,
      JSON.stringify(testData, null, 2)
    );
    
    console.log(`Successfully uploaded test file to: ${url}`);
    console.log('Test passed: File was uploaded directly to bucket root');
    
    return {
      success: true,
      url
    };
  } catch (error) {
    console.error('Test failed:', error);
    return {
      success: false,
      error: String(error)
    };
  }
}

// Run the test
testDirectUpload()
  .then(result => {
    console.log('Test complete with result:', result);
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unhandled error in test:', error);
    process.exit(1);
  });