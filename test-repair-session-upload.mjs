/**
 * Test script to verify repair session uploads are working correctly
 */
import fs from 'fs';
import path from 'path';
import { Storage } from '@google-cloud/storage';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

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
    const mockSessionId = 142; // Using a test session ID
    const timestamp = Date.now();
    const diagnosticData = {
      sessionId: mockSessionId,
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
    
    // Create test file content
    const testFileContent = JSON.stringify(diagnosticData, null, 2);
    const testFileName = `test_session_${mockSessionId}_diagnostic_${timestamp}.json`;
    
    // Save test file locally first
    fs.writeFileSync(testFileName, testFileContent);
    console.log(`Created test file: ${testFileName}`);
    
    // Upload directly to Google Cloud Storage
    if (!process.env.GCS_CREDENTIALS || !process.env.GCS_PROJECT_ID) {
      console.error('Missing required GCS credentials or project ID');
      return false;
    }

    const credentials = JSON.parse(process.env.GCS_CREDENTIALS);
    const storage = new Storage({
      projectId: process.env.GCS_PROJECT_ID,
      credentials
    });
    
    const folder = 'repair-session';
    const filePath = `${folder}/${testFileName}`;
    
    // Upload file to bucket
    console.log(`Uploading test file to ${bucketName}/${filePath}`);
    await storage.bucket(bucketName).upload(testFileName, {
      destination: filePath,
      metadata: {
        contentType: 'application/json'
      }
    });
    
    // Generate public URL
    const publicUrl = `https://storage.googleapis.com/${bucketName}/${filePath}`;
    console.log(`File uploaded successfully to: ${publicUrl}`);
    
    // Clean up local file
    fs.unlinkSync(testFileName);
    console.log(`Removed local test file: ${testFileName}`);
    
    // Create test result
    const result = {
      testId: `repair-session-test-${timestamp}`,
      sessionId: mockSessionId,
      bucket: bucketName,
      folder,
      filename: testFileName,
      filePath,
      publicUrl,
      timestamp: new Date().toISOString(),
      success: true
    };
    
    return result;
  } catch (error) {
    console.error('Error performing repair session upload test:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
      timestamp: new Date().toISOString()
    };
  }
}

async function runTests() {
  console.log('Starting repair session upload tests...');
  console.log('---------------------------------------');
  
  // First check what's in the bucket
  console.log('\n1. Checking current bucket contents:');
  await verifyBucketContents();
  
  // Then test upload via direct GCS upload
  console.log('\n2. Testing repair session upload:');
  const result = await testRepairSessionUpload();
  
  // Check bucket contents again after upload
  if (result.success) {
    console.log('\n3. Checking bucket contents after upload:');
    await verifyBucketContents();
  }
  
  console.log('\nTests completed!');
  
  // Save test results to a file
  fs.writeFileSync(
    `repair-session-upload-test-results-${Date.now()}.json`, 
    JSON.stringify(result, null, 2)
  );
}

// Run the tests
runTests().catch(console.error);