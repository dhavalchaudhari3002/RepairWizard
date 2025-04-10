/**
 * Test script that uses the GoogleCloudStorageService directly
 */
import { googleCloudStorage } from './server/services/google-cloud-storage.js';

// Use IIFE for top-level await in ES modules
(async () => {
  console.log('Starting service upload test...');
  
  try {
    // Check if Google Cloud Storage is configured
    const status = await googleCloudStorage.checkStatus();
    console.log('Storage status:', status);
    
    if (!status.isConfigured) {
      console.error('Error: Google Cloud Storage is not configured properly');
      process.exit(1);
    }
    
    // Test uploading to repair-session folder
    const repairSessionText = 'This is a test file for repair-session folder';
    const repairSessionFileName = `test-repair-${Date.now()}.txt`;
    
    console.log(`Uploading test file to repair-session folder: ${repairSessionFileName}`);
    const repairSessionUrl = await googleCloudStorage.uploadText(
      repairSessionFileName,
      repairSessionText,
      'text/plain',
      'repair-session'
    );
    
    console.log('✅ Successfully uploaded file to repair-session folder');
    console.log('URL:', repairSessionUrl);
    
    // Test uploading to user-data folder
    const userDataText = 'This is a test file for user-data folder';
    const userDataFileName = `test-user-${Date.now()}.txt`;
    
    console.log(`Uploading test file to user-data folder: ${userDataFileName}`);
    const userDataUrl = await googleCloudStorage.uploadText(
      userDataFileName,
      userDataText,
      'text/plain',
      'user-data'
    );
    
    console.log('✅ Successfully uploaded file to user-data folder');
    console.log('URL:', userDataUrl);
    
    // Verify by checking URLs
    console.log('Verifying URLs...');
    console.log(`Repair session URL contains 'repair-session': ${repairSessionUrl.includes('repair-session')}`);
    console.log(`User data URL contains 'user-data': ${userDataUrl.includes('user-data')}`);
    
    console.log('✅ Test completed successfully');
  } catch (error) {
    console.error('❌ Error during test:', error);
    process.exit(1);
  }
})();