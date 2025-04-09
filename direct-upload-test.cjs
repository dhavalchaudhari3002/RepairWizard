/**
 * Test script to directly check the API upload functionality
 */
const fs = require('fs');
const path = require('path');
const axios = require('axios');

async function testDirectUpload() {
  try {
    console.log('Testing direct API upload to verify no folders are created...');
    
    // Create a minimal test image (1x1 pixel transparent PNG)
    const base64Image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    
    // Prepare the API request
    const apiUrl = 'http://localhost:5000/api/cloud-storage/upload';
    
    // Create random filename with timestamp
    const timestamp = Date.now();
    const filename = `test-api-${timestamp}.png`;
    
    // First attempt - with folder parameter
    const testData1 = {
      file: base64Image,
      contentType: 'image/png',
      fileName: filename,
      folder: 'test-api-folder' // This should be ignored
    };
    
    console.log(`Uploading test file with folder parameter: ${testData1.folder}/${testData1.fileName}`);
    
    try {
      const response1 = await axios.post(apiUrl, testData1);
      console.log('Upload response:', response1.data);
      
      // Check if the URL has a folder structure
      const url = response1.data.url;
      if (url.includes('/test-api-folder/')) {
        console.log('❌ FAILED: URL still includes folder structure:', url);
      } else {
        console.log('✅ SUCCESS: File uploaded to bucket root:', url);
      }
      
      // Save the results to a JSON file for analysis
      fs.writeFileSync(`direct-upload-test-results-${timestamp}.json`, JSON.stringify({
        testData: testData1,
        response: response1.data,
        timestamp: new Date().toISOString()
      }, null, 2));
      
    } catch (error) {
      console.error('API upload failed:', error.response?.data || error.message);
      if (error.response) {
        console.log('Status:', error.response.status);
        console.log('Headers:', error.response.headers);
        console.log('Data:', error.response.data);
      }
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testDirectUpload();