/**
 * Simplified test script for verifying direct GCS uploads without folder structure
 * 
 * This script directly uses the cloudDataSync and GoogleCloudStorage services
 * to verify files are uploaded correctly to the bucket root.
 */

// Import required services
import { cloudDataSync } from './server/services/cloud-data-sync.js';
import { googleCloudStorage } from './server/services/google-cloud-storage.js';

// Helper function to sanitize complex objects for console output
function sanitizeForDisplay(obj, level = 0, maxLevel = 2) {
  if (level >= maxLevel) return '[Object]';
  if (!obj || typeof obj !== 'object') return obj;
  
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeForDisplay(value, level + 1, maxLevel);
    } else if (typeof value === 'function') {
      result[key] = '[Function]';
    } else {
      result[key] = value;
    }
  }
  return result;
}

// Run the test
async function runTest() {
  try {
    console.log('Testing consolidated file storage approach with direct GCS uploads...\n');
    
    // Step 1: Check GCS configuration
    console.log('[1] Checking Google Cloud Storage configuration...');
    const status = await googleCloudStorage.checkStatus();
    console.log('GCS Status:', status);
    
    if (!status.isConfigured) {
      throw new Error('Google Cloud Storage is not properly configured');
    }
    
    // Step 2: Test direct upload to bucket root
    console.log('\n[2] Testing direct upload to bucket root...');
    const testData = {
      test: true,
      timestamp: Date.now(),
      message: 'This is a test file for direct bucket root upload'
    };
    
    const testFilename = `direct_test_${Date.now()}.json`;
    const directUrl = await googleCloudStorage.uploadText(
      testFilename,
      JSON.stringify(testData, null, 2)
    );
    
    console.log('Direct upload successful, URL:', directUrl);
    
    // Check URL for folder structure
    if (directUrl.includes('/repair_data/') || 
        directUrl.includes('/diagnostics/') || 
        directUrl.includes('/sessions/')) {
      throw new Error(`ERROR: URL contains folder structure: ${directUrl}`);
    }
    
    // Step 3: Test consolidated session data
    console.log('\n[3] Testing consolidated session data storage...');
    const sessionId = Date.now(); // Use timestamp as fake session ID
    
    // Create test consolidated data
    const consolidatedData = {
      sessionId,
      timestamp: new Date().toISOString(),
      testData: {
        diagnostics: { result: 'Test diagnostic data' },
        issueConfirmation: { result: 'Test issue confirmation' },
        repairGuide: { result: 'Test repair guide' },
      }
    };
    
    console.log(`Creating consolidated file for test session #${sessionId}...`);
    const consolidatedUrl = await cloudDataSync.storeConsolidatedSessionData(sessionId, consolidatedData);
    
    console.log('Consolidated upload successful, URL:', consolidatedUrl);
    
    // Check URL for folder structure
    if (consolidatedUrl.includes('/repair_data/') || 
        consolidatedUrl.includes('/diagnostics/') || 
        consolidatedUrl.includes('/sessions/') ||
        consolidatedUrl.includes(`/session_${sessionId}/`)) {
      throw new Error(`ERROR: Consolidated URL contains folder structure: ${consolidatedUrl}`);
    }
    
    // Step 4: Verify both uploads
    console.log('\n[4] Verification results:');
    console.log('✓ Direct upload test:', directUrl);
    console.log('✓ Consolidated file test:', consolidatedUrl);
    
    console.log('\nTest PASSED: All files uploaded directly to bucket root');
    console.log('No folder structures detected in file URLs');
    
    return {
      success: true,
      directUrl,
      consolidatedUrl
    };
  } catch (error) {
    console.error('\nTest FAILED:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Run the test and exit with appropriate code
runTest()
  .then(result => {
    console.log('\nTest complete with result:', sanitizeForDisplay(result));
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unhandled error in test:', error);
    process.exit(1);
  });