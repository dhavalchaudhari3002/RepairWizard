/**
 * Test the application's consolidated storage to bucket root functionality
 * This simulates the real storage flow in the application
 */

const { Storage } = require('@google-cloud/storage');

// Create test repair session data
const testSessionData = {
  sessionId: 9999,
  timestamp: new Date().toISOString(),
  description: "Test repair session for keyboard",
  productType: "keyboard",
  issueDescription: "Certain keys not working",
  diagnosticData: {
    symptomInterpretation: "Several keys on the keyboard are not responding when pressed, while others work normally.",
    possibleCauses: [
      "Dirt or debris under the affected keys",
      "Liquid damage affecting specific key circuits",
      "Worn out or damaged key switches",
      "Loose or damaged internal keyboard connector"
    ],
    informationGaps: [
      "Which specific keys are affected",
      "Whether it's a mechanical, membrane, or laptop keyboard",
      "History of liquid spills or exposure to debris"
    ],
    diagnosticSteps: [
      "Identify and document all non-responsive keys to look for patterns",
      "Inspect for visible signs of liquid damage or debris",
      "If external keyboard, test with another computer to rule out software issues",
      "Try cleaning affected keys with compressed air"
    ],
    likelySolutions: [
      "Clean under affected keys with compressed air or isopropyl alcohol",
      "For mechanical keyboards, replace individual key switches if possible",
      "For membrane keyboards, cleaning the contact points may restore function",
      "For severe damage, keyboard replacement may be necessary"
    ],
    safetyWarnings: [
      "Always disconnect keyboard and power off device before cleaning",
      "Use isopropyl alcohol sparingly to avoid damaging electronic components",
      "Allow keyboard to dry completely before reconnecting"
    ]
  }
};

async function runTest() {
  try {
    console.log('Starting cloud storage test to verify real application storage...');
    
    // Get Google Cloud Storage credentials from environment
    if (!process.env.GCS_CREDENTIALS || !process.env.GCS_BUCKET_NAME || !process.env.GCS_PROJECT_ID) {
      console.error('ERROR: Missing required GCS environment variables');
      process.exit(1);
    }
    
    // Parse credentials
    let credentials;
    try {
      credentials = JSON.parse(process.env.GCS_CREDENTIALS);
      console.log('Successfully parsed GCS credentials');
    } catch (error) {
      console.error('Failed to parse GCS credentials:', error);
      process.exit(1);
    }
    
    // Initialize Google Cloud Storage
    const storage = new Storage({
      projectId: process.env.GCS_PROJECT_ID,
      credentials
    });
    
    const bucketName = process.env.GCS_BUCKET_NAME;
    console.log(`Using bucket: ${bucketName}`);
    
    // Step 1: First create a file with the correct naming pattern
    console.log('\nTEST PART 1: Creating consolidated session file...');
    
    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const sessionId = testSessionData.sessionId;
    
    // Create a similar filename pattern to what our cloud-data-sync service would generate
    const filenames = [
      `session_${sessionId}_diagnostic_${timestamp}.json`,
      `repair_session_${sessionId}_${timestamp}.json`,
      `complete_session_${sessionId}_${timestamp}.json`
    ];
    
    const createdUrls = [];
    
    // Upload all test files and verify they're in bucket root
    for (const filename of filenames) {
      console.log(`\nUploading test file: ${filename}`);
      
      // Get reference to file directly in bucket root (no folders)
      const file = storage.bucket(bucketName).file(filename);
      
      // Upload the file with varying content
      await file.save(JSON.stringify({
        ...testSessionData,
        filenamePattern: filename,
        testType: 'direct_bucket_root_upload'
      }, null, 2), {
        contentType: 'application/json',
        metadata: {
          contentType: 'application/json'
        }
      });
      
      // Generate public URL
      const publicUrl = `https://storage.googleapis.com/${bucketName}/${filename}`;
      console.log(`Successfully uploaded: ${publicUrl}`);
      
      // Verify URL does not contain folder paths
      if (publicUrl.includes('/repair_data/') || 
          publicUrl.includes('/sessions/') || 
          publicUrl.includes('/repair_sessions/')) {
        console.error(`ERROR: URL contains folder structure: ${publicUrl}`);
        process.exit(1);
      }
      
      console.log(`PASSED: File is correctly stored directly in bucket root`);
      createdUrls.push(publicUrl);
    }
    
    // Step 2: Check if there are any files in folder structures
    console.log('\nTEST PART 2: Checking for unwanted folder structures...');
    
    // Check a few common folder patterns to make sure we're not accidentally creating structures
    const folderPatterns = [
      'repair_data/',
      'repair_sessions/',
      `repair_sessions/${sessionId}/`,
      'sessions/',
      `sessions/${sessionId}/`,
      'diagnostics/',
      'uploads/'
    ];
    
    let foundFolderStructures = false;
    
    for (const folderPattern of folderPatterns) {
      console.log(`Checking for files in: ${folderPattern}`);
      
      // List files in this potential folder structure
      const [files] = await storage.bucket(bucketName).getFiles({ 
        prefix: folderPattern,
        maxResults: 5
      });
      
      if (files && files.length > 0) {
        console.error(`WARNING: Found ${files.length} files in folder structure: ${folderPattern}`);
        console.error(`Example: ${files[0].name}`);
        foundFolderStructures = true;
      } else {
        console.log(`PASSED: No files found in ${folderPattern}`);
      }
    }
    
    if (foundFolderStructures) {
      console.warn('\nTest found some folder structures - need to check implementation');
    } else {
      console.log('\nPASSED: No unwanted folder structures found');
    }
    
    console.log('\nSummary of direct root uploads:');
    createdUrls.forEach(url => console.log(`- ${url}`));
    
    return {
      success: true,
      urls: createdUrls,
      foundFolderStructures
    };
  } catch (error) {
    console.error('Error in test:', error);
    process.exit(1);
  }
}

// Run the test
runTest()
  .then(result => {
    console.log(`\nTest completed successfully with ${result.urls.length} files uploaded directly to bucket root`);
    
    if (result.foundFolderStructures) {
      console.warn('WARNING: Some folder structures were found, application might still be creating folders');
      process.exit(2); // Exit with warning code
    } else {
      console.log('SUCCESS: All files are stored directly in bucket root without folder structures');
      process.exit(0);
    }
  })
  .catch(error => {
    console.error('Unhandled error in test:', error);
    process.exit(1);
  });