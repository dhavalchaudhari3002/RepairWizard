/**
 * Test consolidated file creation directly to bucket root
 * This simulates the repair session data storage flow
 */

const { Storage } = require('@google-cloud/storage');

// Create test repair session data
const testSessionData = {
  sessionId: 999,
  timestamp: new Date().toISOString(),
  description: "Test repair session for chair",
  productType: "chair",
  issueDescription: "Broken leg",
  diagnosticData: {
    symptomInterpretation: "The chair leg appears to be fully detached or broken off at the joint.",
    possibleCauses: [
      "Stress fracture at the joint from repeated use",
      "Impact damage from dropping or sudden force",
      "Manufacturing defect in the joint connection",
      "Wood degradation due to moisture or insect damage"
    ],
    informationGaps: [
      "Exact location of the break",
      "Chair material (wood type, metal, plastic)",
      "Chair age and usage history"
    ],
    diagnosticSteps: [
      "Examine the broken area closely to determine if it's a clean break or splintered",
      "Check for any signs of rot, rust, or material degradation",
      "Inspect other legs for similar weakness or damage",
      "Assess if the break is at a joint or in the middle of the leg"
    ],
    likelySolutions: [
      "For wooden chairs, wood glue and clamps may repair a clean break",
      "Metal brackets can reinforce the joint after gluing",
      "Replace the leg entirely if available",
      "For antique or valuable chairs, professional restoration is recommended"
    ],
    safetyWarnings: [
      "Do not sit on the chair until repairs are complete and tested",
      "Wear gloves when handling splintered wooden parts",
      "Keep wood glue and repair materials away from children"
    ]
  }
};

// Helper to ensure good display of objects for debugging
function sanitizeForDisplay(obj, level = 0, maxLevel = 2) {
  if (level >= maxLevel) return "[Object]";
  if (typeof obj !== 'object' || obj === null) return obj;
  
  const result = Array.isArray(obj) ? [] : {};
  
  for (const key in obj) {
    const value = obj[key];
    if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeForDisplay(value, level + 1, maxLevel);
    } else if (typeof value === 'function') {
      result[key] = '[Function]';
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

async function runTest() {
  try {
    console.log('Starting consolidated file test...');
    
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
    
    // Create a direct upload to bucket root
    console.log('Creating consolidated session file directly in bucket root...');
    
    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const filename = `test_session_${testSessionData.sessionId}_${timestamp}.json`;
    
    // Get reference to file directly in bucket root (no folders)
    const file = storage.bucket(bucketName).file(filename);
    
    // Upload the file
    await file.save(JSON.stringify(testSessionData, null, 2), {
      contentType: 'application/json',
      metadata: {
        contentType: 'application/json'
      }
    });
    
    // Generate public URL
    const publicUrl = `https://storage.googleapis.com/${bucketName}/${filename}`;
    console.log(`Successfully created consolidated file: ${publicUrl}`);
    
    // Verify URL does not contain folder paths
    if (publicUrl.includes('/repair_data/') || 
        publicUrl.includes('/sessions/') || 
        publicUrl.includes('/repair_sessions/')) {
      console.error(`ERROR: URL contains folder structure: ${publicUrl}`);
      process.exit(1);
    }
    
    console.log('TEST PASSED: File is properly stored directly in bucket root');
    
    // Download the file to verify content
    const [fileContent] = await file.download();
    const data = JSON.parse(fileContent.toString());
    
    console.log('File content verification:', {
      sessionId: data.sessionId,
      productType: data.productType,
      timestamp: data.timestamp,
      // Show truncated diagnosticData for readability
      diagnosticDataSummary: sanitizeForDisplay(data.diagnosticData, 0, 1)
    });
    
    return {
      success: true,
      url: publicUrl,
      data: data
    };
  } catch (error) {
    console.error('Error in test:', error);
    process.exit(1);
  }
}

// Run the test
runTest()
  .then(result => {
    console.log(`\nTest completed successfully: ${result.url}`);
    process.exit(0);
  })
  .catch(error => {
    console.error('Unhandled error in test:', error);
    process.exit(1);
  });