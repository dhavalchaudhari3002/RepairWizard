/**
 * Test script to verify cloud data sync uploads
 */
import { cloudDataSync } from './server/services/cloud-data-sync';

async function testCloudSync() {
  try {
    // Create a test object
    const testData = {
      id: 12345,
      name: 'Test Object',
      description: 'This is a test object for cloud sync',
      timestamp: new Date().toISOString()
    };
    
    console.log('Testing cloud data sync...');
    
    // First, sync a test file using the cloudDataSync service
    // This should use the updated uploadBuffer method
    const url = await cloudDataSync.syncGenericData('test-folder', 'test-file', testData);
    
    console.log('Sync completed. URL:', url);
    
    // Check if folder is in URL (it should NOT be)
    if (url.includes('/test-folder/')) {
      console.log('❌ FAILED: cloudDataSync still creating folders');
    } else {
      console.log('✅ SUCCESS: cloudDataSync correctly placing files in bucket root');
    }
  } catch (error) {
    console.error('Test error:', error);
  }
}

// Run the test
testCloudSync();