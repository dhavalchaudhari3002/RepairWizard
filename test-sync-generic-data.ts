/**
 * Test script to verify deduplication in the syncGenericData method
 */
import { cloudDataSync } from './server/services/cloud-data-sync';

async function testSyncGenericDeduplication() {
  try {
    // Create test data for both uploads
    const testData = {
      id: 12345,
      name: 'Test Object',
      description: 'This is a test object for deduplication in syncGenericData',
      timestamp: new Date().toISOString()
    };
    
    console.log('Testing syncGenericData method with content-based deduplication...');
    
    // First upload - this should create a new file
    console.log('First upload - should create new file');
    const url1 = await cloudDataSync.syncGenericData('test-folder', 'generic-data-test', testData);
    console.log('URL 1:', url1);
    
    // Second upload with same content - should reuse the same file
    console.log('Second upload with identical content - should reuse first file');
    const url2 = await cloudDataSync.syncGenericData('test-folder', 'generic-data-test', testData);
    console.log('URL 2:', url2);
    
    // Verify deduplication worked
    console.log('Deduplication worked:', url1 === url2);
    
    // Third upload with different content - should create new file
    console.log('Third upload with different content - should create new file');
    const url3 = await cloudDataSync.syncGenericData('different-folder', 'different-file', {
      ...testData,
      id: 67890,
      differentField: 'This is different data'
    });
    console.log('URL 3:', url3);
    
    // Verify different content produced different URL
    console.log('Different content produced different URL:', url1 !== url3);
    
    console.log('Deduplication test complete!');
    
    return {
      success: true,
      firstUrl: url1,
      secondUrl: url2,
      thirdUrl: url3,
      deduplicationWorked: url1 === url2,
      differentContentWorked: url1 !== url3
    };
  } catch (error) {
    console.error('Test error:', error);
    return { success: false, error };
  }
}

// Run the test
testSyncGenericDeduplication();