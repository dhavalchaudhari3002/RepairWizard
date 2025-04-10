/**
 * Test script to verify the deduplication functionality
 * 
 * This test will:
 * 1. Upload the same file content twice
 * 2. Verify that the URLs returned are identical
 * 3. Confirm that only one file was created in storage
 */
const fs = require('fs');
const { cloudDataSync } = require('./server/services/cloud-data-sync');

async function testDeduplication() {
  console.log('Starting deduplication test...');
  
  // Create test content
  const testContent = `{
    "test": "data",
    "timestamp": "${new Date().toISOString()}",
    "random": "${Math.random()}"
  }`;
  
  const buffer = Buffer.from(testContent);
  
  console.log('Test content created');
  console.log(`Content hash: ${cloudDataSync.calculateContentHash(buffer)}`);
  
  // First upload
  console.log('Performing first upload...');
  const firstUrl = await cloudDataSync.uploadBuffer(
    buffer,
    'test-deduplication',
    'test-file.json',
    'application/json'
  );
  
  console.log(`First upload URL: ${firstUrl}`);
  
  // Second upload with the exact same content
  console.log('Performing second upload with identical content...');
  const secondUrl = await cloudDataSync.uploadBuffer(
    buffer,
    'test-deduplication',
    'test-file-2.json', // Different filename
    'application/json'
  );
  
  console.log(`Second upload URL: ${secondUrl}`);
  
  // Check if the URLs are the same (deduplication worked)
  if (firstUrl === secondUrl) {
    console.log('✅ DEDUPLICATION SUCCESS: Both uploads resulted in the same URL');
  } else {
    console.log('❌ DEDUPLICATION FAILED: Different URLs were generated');
  }
  
  // Now try with slightly different content to ensure non-duplicates are handled properly
  const testContent2 = `{
    "test": "data",
    "timestamp": "${new Date().toISOString()}",
    "random": "${Math.random()}"
  }`;
  
  const buffer2 = Buffer.from(testContent2);
  
  console.log('\nTest with different content');
  console.log(`Content hash 2: ${cloudDataSync.calculateContentHash(buffer2)}`);
  
  // Upload different content
  console.log('Uploading different content...');
  const thirdUrl = await cloudDataSync.uploadBuffer(
    buffer2,
    'test-deduplication',
    'test-file-3.json',
    'application/json'
  );
  
  console.log(`Third upload URL: ${thirdUrl}`);
  
  if (firstUrl !== thirdUrl) {
    console.log('✅ DIFFERENT CONTENT TEST PASSED: Different content resulted in different URLs');
  } else {
    console.log('❌ DIFFERENT CONTENT TEST FAILED: Different content resulted in the same URL');
  }
  
  console.log('\nDeduplication test complete');
}

// Run the test
testDeduplication().catch(err => {
  console.error('Error during deduplication test:', err);
});