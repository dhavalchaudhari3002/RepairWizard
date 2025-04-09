// Test script to verify Google Cloud Storage connection and file creation
import { googleCloudStorage } from './services/google-cloud-storage';
import { cloudDataSync } from './services/cloud-data-sync';

async function testGCSConnection() {
  try {
    console.log('Testing Google Cloud Storage connection...');
    
    // Check the status of Google Cloud Storage
    const status = await googleCloudStorage.checkStatus();
    console.log('GCS Status:', status);
    
    if (!status.isConfigured) {
      console.error('Google Cloud Storage is not properly configured!');
      console.log('Check your environment variables: GCS_PROJECT_ID, GCS_BUCKET_NAME, GCS_CREDENTIALS');
      return;
    }
    
    console.log('✅ Google Cloud Storage is properly configured!');
    
    // Create a test file
    const testContent = {
      timestamp: new Date().toISOString(),
      message: 'This is a test file to verify Google Cloud Storage connection',
      test: true
    };
    
    // Upload the test file
    console.log('Uploading test file to Google Cloud Storage...');
    const testFilePath = `test/connection_test_${Date.now()}.json`;
    const url = await googleCloudStorage.uploadText(
      testFilePath,
      JSON.stringify(testContent, null, 2)
    );
    
    console.log('✅ Test file uploaded successfully!');
    console.log('File URL:', url);
    
    // Test creating a folder
    console.log('Creating test folder in Google Cloud Storage...');
    const testFolderPath = `test/folder_${Date.now()}`;
    await googleCloudStorage.createFolder(testFolderPath);
    console.log('✅ Test folder created successfully!');
    
    // Now test the consolidated data sync functionality
    console.log('\nTesting session data storage with a mock session...');
    const mockSessionId = Date.now();
    const mockSessionData = {
      deviceType: 'Smartphone',
      deviceBrand: 'Test Brand',
      deviceModel: 'Test Model',
      issueDescription: 'This is a test session',
      timestamp: new Date().toISOString()
    };
    
    console.log(`Creating mock session data for session ID: ${mockSessionId}`);
    const sessionDataUrl = await cloudDataSync.storeInitialSubmissionData(
      mockSessionId,
      mockSessionData
    );
    
    console.log('✅ Mock session data stored successfully!');
    console.log('Session data URL:', sessionDataUrl);
    
    console.log('\nAll tests completed successfully! Google Cloud Storage is properly configured and working.');
  } catch (error) {
    console.error('❌ Error testing Google Cloud Storage:', error);
  }
}

// Run the test
testGCSConnection();