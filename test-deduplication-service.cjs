/**
 * Test script to verify the deduplication service
 * This test directly uses our cloud-data-sync service to confirm
 * that duplicate content is stored only once
 */
const { CloudDataSyncService } = require('./server/services/cloud-data-sync');

// Create a test instance
const cloudDataSync = new CloudDataSyncService();

async function testDedupService() {
  try {
    console.log('Starting deduplication service test...');
    
    // Create test content
    const testContent = JSON.stringify({
      test: 'data',
      timestamp: new Date().toISOString(),
      testId: 'deduplication-service-test',
    }, null, 2);
    
    const buffer = Buffer.from(testContent);
    const contentHash = cloudDataSync.calculateContentHash(buffer);
    console.log(`Content hash: ${contentHash}`);
    
    // First upload
    console.log('Performing first upload...');
    const firstUrl = await cloudDataSync.uploadBuffer(
      buffer,
      'test-deduplication',
      `dedup-service-test-1-${Date.now()}.json`,
      'application/json'
    );
    
    console.log(`First upload URL: ${firstUrl}`);
    
    // Second upload with the exact same content but different filename
    console.log('Performing second upload with identical content...');
    const secondUrl = await cloudDataSync.uploadBuffer(
      buffer,
      'test-deduplication',
      `dedup-service-test-2-${Date.now()}.json`,
      'application/json'
    );
    
    console.log(`Second upload URL: ${secondUrl}`);
    
    // Check if the URLs are the same (deduplication worked)
    if (firstUrl === secondUrl) {
      console.log('✅ DEDUPLICATION SUCCESS: Both uploads resulted in the same URL');
      console.log('This confirms our deduplication service is working correctly');
    } else {
      console.log('❌ DEDUPLICATION FAILED: Different URLs were generated');
      console.log('This indicates a problem with our deduplication service');
    }
    
    // Test with different content
    const differentContent = JSON.stringify({
      test: 'data',
      timestamp: new Date().toISOString(),
      testId: 'deduplication-service-test-different',
      random: Math.random()
    }, null, 2);
    
    const buffer2 = Buffer.from(differentContent);
    const contentHash2 = cloudDataSync.calculateContentHash(buffer2);
    console.log(`\nDifferent content hash: ${contentHash2}`);
    
    // Upload different content
    console.log('Uploading different content...');
    const thirdUrl = await cloudDataSync.uploadBuffer(
      buffer2,
      'test-deduplication',
      `dedup-service-test-3-${Date.now()}.json`,
      'application/json'
    );
    
    console.log(`Different content upload URL: ${thirdUrl}`);
    
    // Check that different content gets different URLs
    if (firstUrl !== thirdUrl) {
      console.log('✅ DIFFERENT CONTENT TEST PASSED: Different content resulted in different URLs');
    } else {
      console.log('❌ DIFFERENT CONTENT TEST FAILED: Different content resulted in the same URL');
    }
    
    console.log('\nDeduplication service test complete');
  } catch (error) {
    console.error('Error during test:', error);
  }
}

// Run the test
testDedupService();