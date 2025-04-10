/**
 * Test script to test the upload API endpoint 
 */
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

async function testUpload() {
  console.log('Starting API upload test...');
  
  try {
    // Create test file
    const testFileName = `test-file-${Date.now()}.txt`;
    const testFilePath = `./${testFileName}`;
    fs.writeFileSync(testFilePath, 'This is a test file for upload');
    
    console.log(`Created test file: ${testFilePath}`);
    
    // Create form data
    const formData = new FormData();
    formData.append('file', fs.createReadStream(testFilePath));
    
    // Make the upload request
    const response = await axios.post('http://localhost:3000/api/cloud-storage/upload', formData, {
      headers: {
        ...formData.getHeaders(),
        Cookie: 'connect.sid=YOUR_SESSION_COOKIE' // You need to get a valid session cookie
      }
    });
    
    console.log('Upload response:', response.data);
    
    if (response.data.url && response.data.url.includes('user-data')) {
      console.log('✅ Success! File was uploaded to user-data folder');
    } else {
      console.log('❌ Error: File was not uploaded to user-data folder');
    }
    
    // Clean up
    fs.unlinkSync(testFilePath);
    console.log(`Deleted test file: ${testFilePath}`);
    
  } catch (error) {
    console.error('Error during test:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
  }
}

// Run the test
testUpload();