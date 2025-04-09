/**
 * Test script to verify direct uploads to Google Cloud Storage without database dependency
 */
import fs from 'fs';
import path from 'path';
import { Storage } from '@google-cloud/storage';

// Configuration
const TEST_SESSION_ID = 142; // Use the session ID that was failing before
const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'reusehub-repaire-data';

// Initialize Google Cloud Storage
async function initializeGoogleCloudStorage() {
  try {
    // Check if we have credentials
    const projectId = process.env.GCS_PROJECT_ID;
    const hasCredentials = !!process.env.GCS_CREDENTIALS;
    
    console.log('Initializing Google Cloud Storage:');
    console.log(`- Project ID: ${projectId}`);
    console.log(`- Bucket: ${BUCKET_NAME}`);
    console.log(`- Has credentials: ${hasCredentials}`);
    
    // Create storage client
    const storage = new Storage({
      projectId,
      credentials: hasCredentials 
        ? JSON.parse(process.env.GCS_CREDENTIALS)
        : undefined
    });
    
    // Verify bucket exists
    const [exists] = await storage.bucket(BUCKET_NAME).exists();
    if (!exists) {
      throw new Error(`Bucket '${BUCKET_NAME}' does not exist`);
    }
    
    console.log('Google Cloud Storage initialized successfully');
    return storage;
  } catch (error) {
    console.error('Failed to initialize Google Cloud Storage:', error);
    throw error;
  }
}

// Upload file directly to Google Cloud Storage without database dependency (using repair-session folder)
async function uploadDiagnosticData(storage, sessionId, diagnosticData) {
  try {
    // Generate a unique filename with timestamp
    const timestamp = Date.now();
    const randomId = Math.floor(Math.random() * 10000);
    const filename = `test_diagnostic_${sessionId}_${timestamp}_${randomId}.json`;
    
    // Use the repair-session folder
    const folderName = 'repair-session';
    const filePath = `${folderName}/${filename}`;
    
    console.log(`Uploading test diagnostic data to: ${filePath}`);
    
    // Upload to the repair-session folder
    const bucket = storage.bucket(BUCKET_NAME);
    const file = bucket.file(filePath);
    
    // Save the JSON data
    await file.save(JSON.stringify(diagnosticData, null, 2), {
      contentType: 'application/json',
      metadata: {
        source: 'test-script',
        sessionId: String(sessionId),
        timestamp: new Date().toISOString(),
        folder: folderName
      }
    });
    
    // Get the public URL
    const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${filePath}`;
    console.log(`Diagnostic data uploaded successfully to: ${publicUrl}`);
    return publicUrl;
  } catch (error) {
    console.error(`Error uploading diagnostic data for session #${sessionId}:`, error);
    throw error;
  }
}

// Main function
async function runTest() {
  try {
    console.log(`=== Starting Direct GCS Upload Test for Session #${TEST_SESSION_ID} ===`);
    
    // Initialize Google Cloud Storage
    const storage = await initializeGoogleCloudStorage();
    
    // Create sample diagnostic data
    const sampleDiagnosticData = {
      sessionId: TEST_SESSION_ID,
      userId: 26, // Sample user ID
      timestamp: new Date().toISOString(),
      diagnosticResults: {
        symptomInterpretation: "Device shows signs of water damage affecting the charging port",
        possibleCauses: [
          "Liquid exposure to charging port",
          "Corrosion on charging connectors",
          "Internal moisture damage"
        ],
        informationGaps: [
          "Unknown when liquid exposure occurred",
          "Uncertain if device was powered on during exposure"
        ],
        diagnosticSteps: [
          "Examine charging port for visible corrosion",
          "Test with alternative charging cable",
          "Check for moisture indicators"
        ],
        likelySolutions: [
          "Clean charging port with isopropyl alcohol",
          "Replace charging port if corrosion is extensive",
          "Use rice or silica gel packets to remove moisture"
        ],
        safetyWarnings: [
          "Ensure device is powered off before cleaning",
          "Allow device to dry completely before charging"
        ]
      },
      metadata: {
        source: "test-direct-cloud-storage.js",
        version: "1.0",
        testCase: "Direct GCS Upload"
      }
    };
    
    // Upload the diagnostic data directly to Google Cloud Storage
    const url = await uploadDiagnosticData(storage, TEST_SESSION_ID, sampleDiagnosticData);
    
    console.log('=== Test Results ===');
    console.log(`Diagnostic data for Session #${TEST_SESSION_ID} uploaded successfully`);
    console.log(`URL: ${url}`);
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

// Run the test
runTest();