/**
 * Test script to verify API uploads
 */
import axios from 'axios';

async function testApiUpload() {
  try {
    console.log('Testing file upload via API...');
    
    // Create a simple test file (base64 encoded small test image)
    const testFileBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAo0lEQVR4nGNgGAWjYOgC1apQBlJBJtRwBmQJC3cJn+CpwWdcal1Y6iNbYi6FvJHagrffjk1cJBvg4C4RGjw16Myv/78YvFtkS8PFHN0lnIOnBZ8B0r/+/2KYsE+GQbfGlUG3xpVhwj4Zhh///jD8+v+LIXJGKMzFIAOgLv/x7w/Dj39/GPxaZBmcS2UY7Gb6MjiXyjAEtMgB+aEMGA0jmgMAoJ5CdeMBvqIAAAAASUVORK5CYII=';
    
    // Make the API request
    const response = await axios.post('http://localhost:5000/api/cloud-storage/upload', {
      file: testFileBase64,
      contentType: 'image/png',
      fileName: `test-api-${Date.now()}.png`,
      folder: 'test-api-folder'  // This should be ignored
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('API Response:', response.data);
    
    // Verify the URL doesn't contain the folder
    if (response.data.url.includes('/test-api-folder/')) {
      console.log('❌ FAILED: API upload still creating folders');
    } else {
      console.log('✅ SUCCESS: API upload correctly placing files in bucket root');
    }
  } catch (error) {
    console.error('Test error:', error);
  }
}

// Run the test
testApiUpload();