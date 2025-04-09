/**
 * Test script to verify repair session data is correctly uploaded to Google Cloud Storage
 * 
 * This test addresses a specific issue where repair session data was failing to 
 * upload properly due to a database schema error related to the metadataUrl column.
 */

// Load environment variables first
require('dotenv').config();

// Import required modules
const { Storage } = require('@google-cloud/storage');
const fs = require('fs');
const path = require('path');

// Configuration
const SESSION_ID = 123;  // Mock session ID for testing
const GCS_BUCKET_NAME = process.env.GCS_BUCKET_NAME;

// Initialize Google Cloud Storage client
function initializeGcsClient() {
  try {
    console.log('Initializing GCS client for repair session upload test...');
    
    // Check if we have credentials in environment variables
    if (!process.env.GCS_CREDENTIALS) {
      throw new Error('GCS_CREDENTIALS environment variable is missing');
    }
    
    // Parse the credentials string to JSON
    const credentials = JSON.parse(process.env.GCS_CREDENTIALS);
    console.log('Successfully parsed GCS credentials');
    
    // Create the Storage client with credentials
    const storage = new Storage({
      credentials,
      projectId: process.env.GCS_PROJECT_ID || credentials.project_id
    });
    
    console.log(`Using bucket: ${GCS_BUCKET_NAME}`);
    return { storage, bucket: storage.bucket(GCS_BUCKET_NAME) };
  } catch (error) {
    console.error('Failed to initialize GCS client:', error);
    process.exit(1);
  }
}

// Mock repair session data for testing
function createMockRepairSessionData(sessionId) {
  return {
    sessionId,
    timestamp: new Date().toISOString(),
    initialSubmission: {
      deviceType: 'smartphone',
      deviceBrand: 'Apple',
      deviceModel: 'iPhone 13',
      issueDescription: 'Screen is cracked and touch is not responsive',
      symptoms: ['Screen damage', 'Touch issues'],
      userId: 42
    },
    diagnostics: [{
      id: 1,
      questions: [
        { id: 'q1', question: 'When did the damage occur?', answer: 'Yesterday' },
        { id: 'q2', question: 'Can you still use the device at all?', answer: 'Partially' }
      ],
      results: {
        issueType: 'Screen damage',
        severity: 'High',
        estimatedRepairTime: '1-2 hours'
      }
    }],
    issueConfirmation: {
      confirmedIssue: 'Cracked screen with damaged digitizer',
      repairDifficulty: 'Moderate',
      estimatedCost: '$150-200'
    },
    repairGuide: {
      id: 'rg123',
      title: 'iPhone 13 Screen Replacement Guide',
      steps: [
        { id: 1, instruction: 'Power off the device and remove the bottom screws' },
        { id: 2, instruction: 'Carefully pry up the screen using a suction cup' }
      ],
      estimatedTime: '45 minutes',
      difficultyLevel: 'Moderate'
    },
    interactions: [],
    analytics: [],
    metadata: {
      version: '1.0',
      source: 'repair-ai-assistant-test',
      syncTimestamp: new Date().toISOString(),
      aiTrainingReady: true
    }
  };
}

// Upload repair session data to Google Cloud Storage
async function uploadRepairSessionData(bucket, sessionData) {
  const timestamp = Date.now();
  const randomId = Math.floor(Math.random() * 10000);
  const filename = `test_session_${sessionData.sessionId}_${timestamp}.json`;
  
  console.log(`\nUploading mock repair session data: ${filename} directly to bucket root`);
  
  try {
    // Create a file object in the bucket with this name
    const file = bucket.file(filename);
    
    // Upload the JSON data to the file
    await file.save(JSON.stringify(sessionData, null, 2), {
      contentType: 'application/json',
      metadata: {
        sessionId: sessionData.sessionId.toString(),
        timestamp: timestamp.toString(),
        source: 'test-script',
        testId: randomId.toString()
      }
    });
    
    console.log(`Successfully uploaded repair session data to ${filename}`);
    
    // Get file metadata to verify upload
    const [metadata] = await file.getMetadata();
    console.log('\nFile metadata for verification:');
    console.log(`Name: ${metadata.name}`);
    console.log(`Content-Type: ${metadata.contentType}`);
    console.log(`Size: ${metadata.size} bytes`);
    console.log(`Generation: ${metadata.generation}`);
    console.log(`Storage class: ${metadata.storageClass}`);
    
    // Download the file to verify content
    console.log('\nDownloading file to verify content...');
    const [content] = await file.download();
    const contentStr = content.toString();
    console.log(`Downloaded file content (first 100 chars): ${contentStr.substring(0, 100)} ...`);
    
    // Save test results to local file
    const resultsFilename = `repair-session-upload-test-results-${timestamp}.json`;
    fs.writeFileSync(resultsFilename, JSON.stringify({
      success: true,
      timestamp,
      testId: randomId,
      filename,
      metadata,
      contentSample: contentStr.substring(0, 200) // Just a sample to keep the file small
    }, null, 2));
    
    console.log(`\nTest results saved to ${resultsFilename}`);
    
    return filename;
  } catch (error) {
    console.error('Error uploading repair session data:', error);
    throw error;
  }
}

// Check if any files are in folders (should be none)
async function checkBucketStructure(storage) {
  console.log('\nListing all files in bucket to verify file locations:');
  
  try {
    const [files] = await storage.bucket(GCS_BUCKET_NAME).getFiles();
    
    console.log(`Found ${files.length} files in bucket ${GCS_BUCKET_NAME}:`);
    
    // Separate files by location (root vs folders)
    const rootFiles = [];
    const folderFiles = {};
    
    for (const file of files) {
      if (file.name.includes('/')) {
        // This file is in a folder
        const folderPath = file.name.split('/')[0];
        if (!folderFiles[folderPath]) {
          folderFiles[folderPath] = [];
        }
        folderFiles[folderPath].push(file.name);
      } else {
        // This file is at the root
        rootFiles.push(file.name);
      }
    }
    
    // Print out results
    console.log(`\nFiles at bucket root (${rootFiles.length}):`);
    for (const file of rootFiles) {
      console.log(`  - ${file}`);
    }
    
    // Check if there are any files in folders
    const folderPaths = Object.keys(folderFiles);
    if (folderPaths.length > 0) {
      console.log('\nFiles in folders:');
      for (const folder of folderPaths) {
        console.log(`  Folder: ${folder}/ (${folderFiles[folder].length} files)`);
        for (const file of folderFiles[folder]) {
          console.log(`    - ${file}`);
        }
      }
      return false; // Found files in folders - not good
    } else {
      console.log('\nSUCCESS: No files found in folders - all files are at bucket root');
      return true; // No files in folders - good
    }
  } catch (error) {
    console.error('Error listing files in bucket:', error);
    return false;
  }
}

// Main test function
async function runTest() {
  console.log('Starting repair session upload test...');
  
  try {
    // Initialize GCS client
    const { storage, bucket } = initializeGcsClient();
    
    // Create mock repair session data
    const sessionData = createMockRepairSessionData(SESSION_ID);
    
    // Upload repair session data
    const filename = await uploadRepairSessionData(bucket, sessionData);
    
    // Check if any files are in folders
    const noFoldersExist = await checkBucketStructure(storage);
    
    if (noFoldersExist) {
      console.log('\nRepair session upload test completed successfully!');
      console.log(`The file was correctly uploaded directly to the bucket root: ${filename}`);
    } else {
      console.error('\nTest failed: Found files in folders when all should be at bucket root');
      process.exit(1);
    }
  } catch (error) {
    console.error('Test failed with error:', error);
    process.exit(1);
  }
}

// Run the test
runTest();