/**
 * Simple script to test direct bucket uploads
 */
import { googleCloudStorage } from './server/services/google-cloud-storage';

async function testUpload() {
  try {
    // Create a simple test buffer
    const testData = { 
      test: true, 
      timestamp: new Date().toISOString()
    };
    const buffer = Buffer.from(JSON.stringify(testData, null, 2));
    
    console.log('Testing upload with folder parameter (should be ignored)...');
    
    // Attempt upload with folder (should be ignored)
    const url = await googleCloudStorage.uploadBuffer(
      buffer, 
      {
        folder: 'test-folder',  // This should be ignored by our fix
        customName: `test-file-${Date.now()}.json`,
        contentType: 'application/json'
      }
    );
    
    console.log('Upload completed. URL:', url);
    
    // Check if the folder parameter was ignored correctly
    if (url.includes('/test-folder/')) {
      console.log('❌ FAILED: Folder was still created in the URL path');
    } else {
      console.log('✅ SUCCESS: File was uploaded directly to bucket root, ignoring folder parameter');
    }
  } catch (error) {
    console.error('Test error:', error);
  }
}

// Run the test
testUpload();