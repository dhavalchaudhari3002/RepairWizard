/**
 * Test script to verify direct cloud storage uploads
 */
const fs = require('fs');
const path = require('path');
const { Storage } = require('@google-cloud/storage');

// Load environment variables
require('dotenv').config();

// Configuration
const bucketName = process.env.GCS_BUCKET_NAME;
const testFilePath = path.join(__dirname, 'test-upload-demo.html');
const timestamp = Date.now();

async function testDirectUpload() {
  try {
    console.log('Testing direct upload to Google Cloud Storage...');
    
    if (!process.env.GCS_CREDENTIALS || !process.env.GCS_PROJECT_ID) {
      console.error('Missing required GCS credentials or project ID');
      return false;
    }

    // Initialize storage
    const credentials = JSON.parse(process.env.GCS_CREDENTIALS);
    const storage = new Storage({
      projectId: process.env.GCS_PROJECT_ID,
      credentials
    });
    
    // Check if test file exists
    if (!fs.existsSync(testFilePath)) {
      console.error(`Test file not found: ${testFilePath}`);
      return false;
    }
    
    // Upload to user-data folder
    const destFileName = `user-data/direct_test_${timestamp}.html`;
    console.log(`Uploading ${testFilePath} to ${bucketName}/${destFileName}`);
    
    await storage.bucket(bucketName).upload(testFilePath, {
      destination: destFileName,
      metadata: {
        contentType: 'text/html',
        metadata: {
          testUpload: 'true',
          uploadTime: new Date().toISOString()
        }
      }
    });
    
    console.log(`Successfully uploaded to ${destFileName}`);
    
    // Now repeat the same upload but to repair-session folder
    const repairSessionFileName = `repair-session/direct_test_${timestamp}.html`;
    console.log(`Uploading ${testFilePath} to ${bucketName}/${repairSessionFileName}`);
    
    await storage.bucket(bucketName).upload(testFilePath, {
      destination: repairSessionFileName,
      metadata: {
        contentType: 'text/html',
        metadata: {
          testUpload: 'true',
          uploadTime: new Date().toISOString()
        }
      }
    });
    
    console.log(`Successfully uploaded to ${repairSessionFileName}`);
    return true;
  } catch (error) {
    console.error('Error during direct upload test:', error);
    return false;
  }
}

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

    // Look for our test files
    const testUserDataFile = `user-data/direct_test_${timestamp}.html`;
    const testRepairSessionFile = `repair-session/direct_test_${timestamp}.html`;
    
    console.log('\nChecking for test files...');
    
    const userDataFile = files.find(file => file.name === testUserDataFile);
    const repairSessionFile = files.find(file => file.name === testRepairSessionFile);
    
    if (userDataFile) {
      console.log(`✓ Found user-data test file: ${testUserDataFile}`);
    } else {
      console.log(`✗ User-data test file not found: ${testUserDataFile}`);
    }
    
    if (repairSessionFile) {
      console.log(`✓ Found repair-session test file: ${testRepairSessionFile}`);
    } else {
      console.log(`✗ Repair-session test file not found: ${testRepairSessionFile}`);
    }
  } catch (error) {
    console.error('Error verifying bucket contents:', error);
  }
}

async function runTests() {
  console.log('Starting direct upload tests...');
  console.log('------------------------------');
  
  // First check what's in the bucket
  console.log('\n1. Checking current bucket contents:');
  await verifyBucketContents();
  
  // Then test direct upload
  console.log('\n2. Testing direct upload:');
  const uploadSuccess = await testDirectUpload();
  
  // Check bucket contents again after upload
  if (uploadSuccess) {
    console.log('\n3. Checking bucket contents after upload:');
    await verifyBucketContents();
  }
  
  console.log('\nTests completed!');
  // Save test results to a file
  const results = {
    timestamp: new Date().toISOString(),
    directUploadSuccess: uploadSuccess,
    testTime: new Date().toLocaleString()
  };
  
  fs.writeFileSync(
    `direct-upload-test-results-${Date.now()}.json`, 
    JSON.stringify(results, null, 2)
  );
}

// Run the tests
runTests().catch(console.error);