import express from 'express';
import { cloudDataSync } from '../services/cloud-data-sync';

/**
 * Test routes to verify the functionality of core components
 * IMPORTANT: These routes should be disabled in production
 */
const router = express.Router();

/**
 * Test the deduplication functionality of the cloud data sync service
 */
router.get('/test-deduplication', async (req, res) => {
  try {
    console.log('Starting deduplication test...');
    
    // Create test content
    const testContent = JSON.stringify({
      test: 'data',
      timestamp: new Date().toISOString(),
      testId: 'deduplication-test-api',
    }, null, 2);
    
    const buffer = Buffer.from(testContent);
    const contentHash = cloudDataSync.calculateContentHash(buffer);
    
    // First upload
    console.log('Performing first upload...');
    const firstUrl = await cloudDataSync.uploadBuffer(
      buffer,
      'test-deduplication',
      `api-test-1-${Date.now()}.json`,
      'application/json'
    );
    
    // Second upload with the exact same content
    console.log('Performing second upload with identical content...');
    const secondUrl = await cloudDataSync.uploadBuffer(
      buffer,
      'test-deduplication',
      `api-test-2-${Date.now()}.json`, // Different filename
      'application/json'
    );
    
    // Test with different content
    const differentContent = JSON.stringify({
      test: 'data',
      timestamp: new Date().toISOString(),
      testId: 'deduplication-test-api-different',
      random: Math.random()
    }, null, 2);
    
    const buffer2 = Buffer.from(differentContent);
    const contentHash2 = cloudDataSync.calculateContentHash(buffer2);
    
    // Upload different content
    console.log('Uploading different content...');
    const thirdUrl = await cloudDataSync.uploadBuffer(
      buffer2,
      'test-deduplication',
      `api-test-3-${Date.now()}.json`,
      'application/json'
    );
    
    // Results
    const deduplicationWorked = firstUrl === secondUrl;
    const differentContentWorked = firstUrl !== thirdUrl;
    
    res.json({
      success: true,
      contentHash,
      differentContentHash: contentHash2,
      firstUrl,
      secondUrl,
      thirdUrl,
      deduplicationWorked,
      differentContentWorked,
      message: deduplicationWorked 
        ? 'Deduplication is working correctly!' 
        : 'Deduplication failed - different URLs were generated for identical content',
      details: {
        'Same content, same URL': deduplicationWorked,
        'Different content, different URL': differentContentWorked
      }
    });
  } catch (error) {
    console.error('Error during deduplication test:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;