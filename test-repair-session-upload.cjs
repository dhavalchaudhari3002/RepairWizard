/**
 * Test script to verify repair session uploads are working correctly
 */
const fs = require('fs');
const path = require('path');
const { Storage } = require('@google-cloud/storage');
const fetch = require('node-fetch');

// Load environment variables
require('dotenv').config();

// Configuration
const bucketName = process.env.GCS_BUCKET_NAME;

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

    // Specifically check for repair-session folder
    console.log('\nChecking for repair-session folder...');
    const repairSessionFiles = files.filter(file => file.name.startsWith('repair-session/'));
    
    if (repairSessionFiles.length > 0) {
      console.log('\nFiles in repair-session folder:');
      repairSessionFiles.forEach(file => {
        console.log(`- ${file.name}`);
      });
    } else {
      console.log('No files found in repair-session folder');
    }
  } catch (error) {
    console.error('Error verifying bucket contents:', error);
  }
}

async function testRepairSessionUpload() {
  try {
    console.log('Testing repair session upload...');
    
    // Create a mock diagnostic data
    const mockSessionId = Date.now().toString();
    const diagnosticData = {
      id: mockSessionId,
      userId: 26, // Test user ID
      deviceType: 'smartphone',
      deviceBrand: 'Test Brand',
      deviceModel: 'Test Model',
      problemDescription: 'Test problem description for file upload',
      diagnosticSteps: [
        { id: 1, question: 'Does the device turn on?', answer: 'No' },
        { id: 2, question: 'Do you see any lights?', answer: 'Yes' }
      ],
      timestamp: new Date().toISOString()
    };
    
    // Send upload request to our API
    const response = await fetch('http://localhost:5000/api/repair-session/diagnostic', {
      method: 'POST',
      body: JSON.stringify(diagnosticData),
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'connect.sid=s%3AIEeOdQBnRyWV6SxzecLRDNLRh4NlK_Qh.iXzb2EcO0YHpP9kHy4q7WG4O7PuOV%2BPOK9ZLLEj0%2FKE' // You need a valid session
      }
    });
    
    const result = await response.json();
    
    console.log('Upload API Response:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log(`Repair session data uploaded successfully for session ID: ${mockSessionId}`);
      return true;
    } else {
      console.error('Repair session upload failed:', result.error || 'Unknown error');
      return false;
    }
  } catch (error) {
    console.error('Error performing repair session upload test:', error);
    return false;
  }
}

async function runTests() {
  console.log('Starting repair session upload tests...');
  console.log('---------------------------------------');
  
  // First check what's in the bucket
  console.log('\n1. Checking current bucket contents:');
  await verifyBucketContents();
  
  // Then test upload via API
  console.log('\n2. Testing repair session upload via API:');
  const uploadSuccess = await testRepairSessionUpload();
  
  // Check bucket contents again after upload
  if (uploadSuccess) {
    console.log('\n3. Checking bucket contents after upload:');
    await verifyBucketContents();
  }
  
  console.log('\nTests completed!');
  // Save test results to a file
  const results = {
    timestamp: new Date().toISOString(),
    repairSessionUploadSuccess: uploadSuccess,
    testTime: new Date().toLocaleString()
  };
  
  fs.writeFileSync(
    `repair-session-upload-test-results-${Date.now()}.json`, 
    JSON.stringify(results, null, 2)
  );
}

// Run the tests
runTests().catch(console.error);