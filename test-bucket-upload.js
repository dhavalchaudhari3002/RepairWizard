/**
 * Test script to verify files are uploaded directly to bucket root
 */
import { Storage } from '@google-cloud/storage';
import { randomUUID } from 'crypto';
import fs from 'fs';

// Importing our service directly (bypassing the server)
import { googleCloudStorage } from './server/services/google-cloud-storage.js';

// Test data
const testData = { 
  test: true, 
  timestamp: new Date().toISOString(),
  message: 'This is a test file to verify direct bucket uploads'
};

async function runTest() {
  console.log('Starting direct bucket upload test...');

  try {
    const testDir = 'test';
    
    // Test regular upload with folder (should ignore folder)
    const buffer = Buffer.from(JSON.stringify(testData, null, 2));
    console.log(`Uploading test file with folder parameter...`);
    
    const url = await googleCloudStorage.uploadBuffer(
      buffer, 
      {
        folder: testDir,
        customName: `test-${Date.now()}.json`,
        contentType: 'application/json'
      }
    );
    
    console.log('Upload completed! URL:', url);
    
    // Verify URL doesn't have folders
    if (url.includes('/test/')) {
      console.error('ERROR: Folder still being created in URL:', url);
      console.log('TEST FAILED');
      return false;
    }
    
    console.log('TEST PASSED: File uploaded directly to bucket root');
    console.log('No folder structures detected in the URL');
    
    return true;
  } catch (error) {
    console.error('Test failed:', error);
    return false;
  }
}

// Run the test
runTest();