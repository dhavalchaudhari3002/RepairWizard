/**
 * Test script to directly test file uploads to Google Cloud Storage
 */
import { googleCloudStorage } from './server/services/google-cloud-storage';

async function testDirectUpload() {
  try {
    console.log('Starting direct upload test...');
    
    // 1. Test uploading a text file with a folder parameter (should be ignored)
    const textContent = JSON.stringify({
      test: 'Direct upload test',
      timestamp: new Date().toISOString()
    }, null, 2);
    
    const textBuffer = Buffer.from(textContent, 'utf-8');
    const textUrl = await googleCloudStorage.uploadBuffer(
      textBuffer,
      {
        folder: 'test-folder',  // This should be ignored now
        customName: `text-file-${Date.now()}.json`,
        contentType: 'application/json'
      }
    );
    
    console.log('Text file upload completed. URL:', textUrl);
    const textResult = !textUrl.includes('/test-folder/');
    console.log(textResult ? '✅ SUCCESS: Text file in bucket root' : '❌ FAILED: Text file in folder');
    
    // 2. Test uploading a JSON file using saveJsonData
    const jsonData = {
      message: 'Test JSON data',
      timestamp: new Date().toISOString(),
      nested: {
        value: 123,
        array: [1, 2, 3]
      }
    };
    
    const jsonUrl = await googleCloudStorage.saveJsonData(
      jsonData,
      {
        folder: 'json-folder',  // This should be ignored now
        customName: `json-file-${Date.now()}.json`
      }
    );
    
    console.log('JSON data upload completed. URL:', jsonUrl);
    const jsonResult = !jsonUrl.includes('/json-folder/');
    console.log(jsonResult ? '✅ SUCCESS: JSON file in bucket root' : '❌ FAILED: JSON file in folder');
    
    // 3. Test uploadText method with a folder
    const textPath = `test-folder/text-file-${Date.now()}.txt`;  // This should ignore folder
    const textContent2 = 'This is a test file for direct upload.\nLine 2\nLine 3';
    
    const textUrl2 = await googleCloudStorage.uploadText(
      textPath,  // Should only use the filename part
      textContent2,
      'text/plain'
    );
    
    console.log('Text uploadText completed. URL:', textUrl2);
    const textResult2 = !textUrl2.includes('/test-folder/');
    console.log(textResult2 ? '✅ SUCCESS: Text file (uploadText) in bucket root' : '❌ FAILED: Text file in folder');
    
    // Overall result
    const overallResult = textResult && jsonResult && textResult2;
    console.log('');
    console.log(overallResult ? '✅ OVERALL TEST: PASSED' : '❌ OVERALL TEST: FAILED');
    console.log('All files are now being correctly uploaded to the bucket root.');
    
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Run the test
testDirectUpload();