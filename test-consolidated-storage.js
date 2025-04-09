/**
 * Test script for verifying the consolidated storage approach
 * 
 * This script creates a test session and stores data in the consolidated JSON file
 * for each phase of the repair journey.
 */

// Import required modules
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const axios = require('axios');

// Define the test session data
const testData = {
  sessionId: Math.floor(Math.random() * 10000) + 1000, // Random session ID for testing
  userId: 1,
  deviceType: 'Laptop',
  deviceBrand: 'Test Brand',
  deviceModel: 'Test Model',
  issueDescription: 'Test issue for consolidated storage approach',
  symptoms: ['not powering on', 'battery issues'],
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Test diagnostic data
const diagnosticData = {
  sessionId: testData.sessionId,
  possibleCauses: ['Battery failure', 'Power adapter issue'],
  suggestedTests: ['Test with different power adapter', 'Check battery health'],
  confidence: 0.85,
};

// Test issue confirmation data
const issueData = {
  sessionId: testData.sessionId,
  confirmedIssue: 'Power adapter failure',
  severity: 'Medium',
  estimatedRepairTime: '1-2 hours',
};

// Test repair guide data
const repairGuideData = {
  sessionId: testData.sessionId,
  steps: [
    { step: 1, description: 'Replace power adapter', difficulty: 'Easy' },
    { step: 2, description: 'Test laptop with new adapter', difficulty: 'Easy' },
  ],
  tools: ['New power adapter', 'None'],
  estimatedCost: '$50-100',
};

// Run the test
async function runTest() {
  console.log('Starting consolidated storage test with random session ID:', testData.sessionId);
  
  try {
    // Make API requests to test each phase of data storage
    console.log('\n[1] Creating test repair session...');
    const sessionResponse = await axios.post('http://localhost:3000/api/repair-sessions', {
      ...testData,
      testMode: true, // Indicate this is a test request
    });
    
    if (sessionResponse.status !== 200) {
      throw new Error(`Failed to create test session: ${sessionResponse.status}`);
    }
    
    console.log('Session created successfully:', sessionResponse.data.id);
    
    // Small delay to ensure session is fully created
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('\n[2] Submitting diagnostic data...');
    const diagnosticResponse = await axios.post('http://localhost:3000/api/repair-diagnostics', {
      ...diagnosticData,
      repairRequestId: testData.sessionId,
      testMode: true,
    });
    
    if (diagnosticResponse.status !== 200) {
      throw new Error(`Failed to submit diagnostic data: ${diagnosticResponse.status}`);
    }
    
    console.log('Diagnostic data submitted successfully');
    
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('\n[3] Submitting issue confirmation data...');
    const issueResponse = await axios.post('http://localhost:3000/api/repair-issues', {
      ...issueData,
      repairRequestId: testData.sessionId,
      testMode: true,
    });
    
    if (issueResponse.status !== 200) {
      throw new Error(`Failed to submit issue data: ${issueResponse.status}`);
    }
    
    console.log('Issue confirmation data submitted successfully');
    
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('\n[4] Submitting repair guide data...');
    const guideResponse = await axios.post('http://localhost:3000/api/repair-guides', {
      ...repairGuideData,
      repairRequestId: testData.sessionId,
      testMode: true,
    });
    
    if (guideResponse.status !== 200) {
      throw new Error(`Failed to submit repair guide data: ${guideResponse.status}`);
    }
    
    console.log('Repair guide data submitted successfully');
    
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('\n[5] Verifying storage files in database...');
    // Get files from API
    const filesResponse = await axios.get(`http://localhost:3000/api/repair-sessions/${testData.sessionId}/files`);
    
    if (filesResponse.status !== 200) {
      throw new Error(`Failed to retrieve files: ${filesResponse.status}`);
    }
    
    const files = filesResponse.data;
    console.log(`Found ${files.length} files associated with session #${testData.sessionId}`);
    
    // Verify file URLs
    let hasErrors = false;
    for (const file of files) {
      console.log(`\nFile: ${file.fileName}`);
      console.log(`URL: ${file.fileUrl}`);
      console.log(`Type: ${file.contentType}`);
      
      // Check for folder structure in URL
      if (file.fileUrl && file.fileUrl.includes('/repair_data/')) {
        console.error('ERROR: File URL contains folder structure: /repair_data/');
        hasErrors = true;
      }
      
      // Other folder checks
      if (file.fileUrl && (
        file.fileUrl.includes(`/${testData.sessionId}/`) || 
        file.fileUrl.includes('/diagnostics/') ||
        file.fileUrl.includes('/issues/') ||
        file.fileUrl.includes('/guides/') ||
        file.fileUrl.includes('/submissions/')
      )) {
        console.error('ERROR: File URL contains folder structure:', file.fileUrl);
        hasErrors = true;
      }
      
      // Verify content type
      if (file.contentType !== 'application/json') {
        console.error('ERROR: File content type is not application/json:', file.contentType);
        hasErrors = true;
      }
    }
    
    if (hasErrors) {
      console.error('\nTest FAILED: Some files contain folder structures or other issues');
    } else {
      console.log('\nTest PASSED: All files stored directly in bucket root');
      console.log('No folder structures found in file URLs');
    }
    
    // Create a consolidated file with test results
    const testResults = {
      testId: `test-${Date.now()}`,
      sessionId: testData.sessionId,
      testTimestamp: new Date().toISOString(),
      results: {
        sessionCreated: true,
        diagnosticSubmitted: true,
        issueSubmitted: true,
        guideSubmitted: true,
        filesVerified: !hasErrors,
      },
      files: files,
    };
    
    fs.writeFileSync(
      `./test-results-${testData.sessionId}.json`, 
      JSON.stringify(testResults, null, 2)
    );
    
    console.log(`\nTest results saved to: ./test-results-${testData.sessionId}.json`);
    
    return {
      success: !hasErrors,
      sessionId: testData.sessionId,
      fileCount: files.length,
    };
  } catch (error) {
    console.error('Test error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    return {
      success: false,
      error: error.message,
    };
  }
}

// Run the test and exit with appropriate code
runTest()
  .then(result => {
    console.log('\nTest completed with result:', result);
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unhandled error in test:', error);
    process.exit(1);
  });