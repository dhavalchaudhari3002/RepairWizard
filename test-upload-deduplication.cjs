// Command line script to test deduplication in Google Cloud Storage uploads
// We use CommonJS for this script for simplicity, as it's a standalone test script

const crypto = require('crypto');
const { Storage } = require('@google-cloud/storage');

// Config 
const bucketName = process.env.GCS_BUCKET_NAME || 'reusehub-repaire-data';

// Initialize Google Cloud Storage with credentials
let storage;
try {
  // Initialize from environment
  if (process.env.GCS_CREDENTIALS) {
    const credentials = JSON.parse(process.env.GCS_CREDENTIALS);
    storage = new Storage({ credentials });
    console.log('Using credentials from environment');
  } else {
    // Default initialization
    storage = new Storage();
    console.log('Using default credentials');
  }
  
  console.log(`Using bucket: ${bucketName}`);
} catch (error) {
  console.error('Error initializing Google Cloud Storage:', error);
  process.exit(1);
}

// Utility to calculate content hash
function calculateContentHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

// Main test
async function testDeduplication() {
  try {
    console.log('Starting deduplication test...');
    
    // Create same test data for both uploads
    const testContent = JSON.stringify({
      test: 'data',
      timestamp: new Date().toISOString(),
      testId: 'deduplication-test',
    }, null, 2);
    
    const buffer = Buffer.from(testContent);
    const contentHash = calculateContentHash(buffer);
    console.log(`Content hash: ${contentHash}`);
    
    // First upload
    console.log('Uploading first file...');
    const filename1 = `dedup-test-1-${Date.now()}.json`;
    const file1 = storage.bucket(bucketName).file(filename1);
    await file1.save(buffer, {
      metadata: {
        contentType: 'application/json',
        metadata: {
          contentHash,
          testType: 'deduplication'
        }
      }
    });
    console.log(`First file uploaded: ${filename1}`);
    
    // Second upload - same content but different filename
    console.log('Uploading second file with identical content...');
    const filename2 = `dedup-test-2-${Date.now()}.json`;
    const file2 = storage.bucket(bucketName).file(filename2);
    await file2.save(buffer, {
      metadata: {
        contentType: 'application/json',
        metadata: {
          contentHash,
          testType: 'deduplication'
        }
      }
    });
    console.log(`Second file uploaded: ${filename2}`);
    
    // Verify both files exist - this confirms the need for our deduplication system
    const [file1Exists] = await file1.exists();
    const [file2Exists] = await file2.exists();
    
    console.log(`File 1 exists: ${file1Exists}`);
    console.log(`File 2 exists: ${file2Exists}`);
    
    if (file1Exists && file2Exists) {
      console.log('CONFIRMATION: Without deduplication, duplicates are created in Google Cloud Storage');
      console.log('This confirms that our custom deduplication service is necessary');
    }
    
    // Clean up test files
    console.log('Cleaning up test files...');
    await file1.delete();
    await file2.delete();
    console.log('Test files deleted');
    
    console.log('\nDeduplication test complete');
  } catch (error) {
    console.error('Error during test:', error);
  }
}

// Run the test
testDeduplication();