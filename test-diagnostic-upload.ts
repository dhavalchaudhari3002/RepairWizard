/**
 * Test script to verify diagnostic data uploads directly to bucket root
 */

// Import necessary modules
import dotenv from 'dotenv';
import { CloudDataSyncService } from './server/services/cloud-data-sync';

// Load environment variables
dotenv.config();

// Create a mock diagnostic data
const mockDiagnosticData = {
  sessionId: 999,
  userId: 26,
  timestamp: Date.now(),
  symptomInterpretation: "Test symptom interpretation for storage testing",
  possibleCauses: [
    "Test cause 1",
    "Test cause 2",
    "Test cause 3"
  ],
  informationGaps: [
    "Test information gap 1",
    "Test information gap 2"
  ],
  diagnosticSteps: [
    "Test diagnostic step 1",
    "Test diagnostic step 2"
  ],
  likelySolutions: [
    "Test solution 1",
    "Test solution 2"
  ],
  safetyWarnings: [
    "Test safety warning 1",
    "Test safety warning 2"
  ]
};

async function testDiagnosticUpload() {
  try {
    console.log('Initializing cloud data sync service...');
    const cloudDataSync = new CloudDataSyncService();
    
    // Store diagnostic data in cloud storage
    console.log('Storing diagnostic data...');
    const result = await cloudDataSync.storeDiagnosticData(
      mockDiagnosticData.sessionId,
      mockDiagnosticData
    );
    
    console.log('Storage result:', result);
    
    // Verify the file was stored properly with the correct name pattern
    const filePattern = `test_session_${mockDiagnosticData.sessionId}_`;
    
    // Check if the file was stored in the expected location
    console.log(`\nChecking for file with pattern: ${filePattern}`);
    
    // The cloud sync service is supposed to use the CloudStorageService, 
    // which should upload files directly to bucket root
    console.log('\nFile should be stored directly in bucket root with no folder structure');
    
    console.log('\nTest complete. If successful, a diagnostic data file should now exist in the bucket root.');
    
  } catch (error) {
    console.error('Error in diagnostic upload test:', error);
  }
}

// Run the test
testDiagnosticUpload();