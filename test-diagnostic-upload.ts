/**
 * Test script to verify diagnostic data uploads directly to bucket root
 */
import { cloudDataSync } from './server/services/cloud-data-sync';

async function testDiagnosticUpload() {
  try {
    // Create a test diagnostic data object
    const testDiagnosticData = {
      deviceType: 'Smartphone',
      symptom: 'Screen cracked',
      possibleCauses: [
        'Physical impact damage',
        'Pressure applied to screen'
      ],
      recommendedSteps: [
        'Replace screen assembly',
        'Test touchscreen functionality after replacement'
      ],
      timestamp: new Date().toISOString(),
      testRun: true
    };
    
    console.log('Testing diagnostic data upload...');
    
    // Use the storeDiagnosticData method which should now use the fixed uploadBuffer/uploadFile
    // This should upload directly to bucket root with no folder structure
    const url = await cloudDataSync.storeDiagnosticData(
      999999, // Use a fake session ID that won't conflict with real data
      testDiagnosticData
    );
    
    console.log('Upload completed. URL:', url);
    
    // Check if folder is in URL (it should NOT be)
    if (url.includes('/diagnostics/') || url.includes('/repair-sessions/')) {
      console.log('❌ FAILED: Still creating folders in URL:', url);
    } else {
      console.log('✅ SUCCESS: Correctly placing files in bucket root:', url);
    }
  } catch (error) {
    console.error('Test error:', error);
  }
}

// Run the test
testDiagnosticUpload();