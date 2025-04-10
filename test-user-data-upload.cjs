/**
 * Test script to verify user data uploads are working correctly
 */
const fs = require('fs');
const path = require('path');
const { Storage } = require('@google-cloud/storage');
const fetch = require('node-fetch');
const FormData = require('form-data');

// Load environment variables
require('dotenv').config();

// Configuration
const bucketName = process.env.GCS_BUCKET_NAME;
const testFilePath = path.join(__dirname, 'test-upload-demo.html');

async function verifyBucketContents() {
  try {
    if (!process.env.GCS_CREDENTIALS || !process.env.GCS_PROJECT_ID) {
      console.error('Missing required GCS credentials or project ID');
      return;
    }

    const credentials = JSON.parse(process.env.GCS_CREDENTIALS);
    const storage = new Storage({
      projectId: process.env.GCS_PROJECT_ID,
      credentials
    });

    console.log(`Listing files in bucket: ${bucketName}`);
    const [files] = await storage.bucket(bucketName).getFiles();
    
    console.log('Files in bucket:');
    files.forEach(file => {
      console.log(`- ${file.name}`);
    });

    // Specifically check for user-data folder
    console.log('\nChecking for user-data folder...');
    const userDataFiles = files.filter(file => file.name.startsWith('user-data/'));
    
    if (userDataFiles.length > 0) {
      console.log('\nFiles in user-data folder:');
      userDataFiles.forEach(file => {
        console.log(`- ${file.name}`);
      });
    } else {
      console.log('No files found in user-data folder');
    }
  } catch (error) {
    console.error('Error verifying bucket contents:', error);
  }
}

async function testUploadUsingAPI() {
  try {
    console.log(`Testing file upload via API using file: ${testFilePath}`);
    
    // First check if test file exists
    if (!fs.existsSync(testFilePath)) {
      console.error(`Test file not found: ${testFilePath}`);
      return;
    }
    
    // Create form data for the upload
    const form = new FormData();
    form.append('file', fs.createReadStream(testFilePath));
    
    // Send upload request to our API
    const response = await fetch('http://localhost:5000/api/cloud-storage/upload', {
      method: 'POST',
      body: form,
      headers: {
        ...form.getHeaders(),
        'Cookie': 'connect.sid=s%3AIEeOdQBnRyWV6SxzecLRDNLRh4NlK_Qh.iXzb2EcO0YHpP9kHy4q7WG4O7PuOV%2BPOK9ZLLEj0%2FKE' // You need a valid session
      }
    });
    
    const result = await response.json();
    
    console.log('Upload API Response:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log(`File uploaded successfully to: ${result.url}`);
      return true;
    } else {
      console.error('API upload failed:', result.error);
      return false;
    }
  } catch (error) {
    console.error('Error performing API upload test:', error);
    return false;
  }
}

async function runTests() {
  console.log('Starting user data upload tests...');
  console.log('------------------------------------');
  
  // First check what's in the bucket
  console.log('\n1. Checking current bucket contents:');
  await verifyBucketContents();
  
  // Then test upload via API
  console.log('\n2. Testing upload via API:');
  const apiUploadSuccess = await testUploadUsingAPI();
  
  // Check bucket contents again after upload
  if (apiUploadSuccess) {
    console.log('\n3. Checking bucket contents after upload:');
    await verifyBucketContents();
  }
  
  console.log('\nTests completed!');
  // Save test results to a file
  const results = {
    timestamp: new Date().toISOString(),
    apiUploadSuccess,
    testTime: new Date().toLocaleString()
  };
  
  fs.writeFileSync(
    `user-data-upload-test-results-${Date.now()}.json`, 
    JSON.stringify(results, null, 2)
  );
}

// Run the tests
runTests().catch(console.error);