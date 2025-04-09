/**
 * This script tests direct upload of a real repair session file
 * to verify that we can properly store session data in Google Cloud Storage
 */
require('dotenv').config();
const { Storage } = require('@google-cloud/storage');

async function testUploadRealSessionFile() {
  try {
    console.log('Initializing GCS client for repair session upload test...');
    
    let credentials;
    try {
      credentials = JSON.parse(process.env.GCS_CREDENTIALS || '{}');
      console.log('Successfully parsed GCS credentials');
    } catch (error) {
      console.error('Error parsing GCS credentials:', error);
      return;
    }
    
    const projectId = process.env.GCS_PROJECT_ID;
    const bucketName = process.env.GCS_BUCKET_NAME;
    
    if (!projectId || !bucketName) {
      console.error('Missing required environment variables: GCS_PROJECT_ID or GCS_BUCKET_NAME');
      return;
    }
    
    console.log(`Using bucket: ${bucketName}`);
    
    // Initialize the Google Cloud Storage client
    const storage = new Storage({
      projectId,
      credentials
    });
    
    const bucket = storage.bucket(bucketName);
    
    // Create a mock repair session with realistic data
    const sessionId = 139; // Using the real session ID from the user
    const timestamp = Date.now();
    
    // Create sample diagnostic data that resembles real data
    const diagnosticData = {
      sessionId: sessionId,
      userId: 26,
      timestamp: timestamp,
      symptomInterpretation: "The chair has a broken leg but it does not affect stability or cause wobbling.",
      possibleCauses: [
        "Manufacturing defect in the leg material",
        "Previous damage that weakened the structural integrity",
      ],
      informationGaps: [
        "Age of the chair and usage patterns"
      ],
      diagnosticSteps: [
        "Visually inspect the broken leg to identify the break pattern",
        "Check for any signs of stress or fatigue in the material"
      ],
      likelySolutions: [
        "Reinforce the broken leg with appropriate adhesive",
        "Replace the leg if the damage is beyond repair"
      ],
      safetyWarnings: [
        "Ensure the chair is properly supported during repair",
        "Follow proper safety procedures when using adhesives or tools"
      ]
    };
    
    // Create a consolidated repair session file
    const consolidatedData = {
      sessionId,
      timestamp: new Date().toISOString(),
      initialSubmission: {
        deviceType: "chair",
        deviceBrand: "",
        deviceModel: "",
        issueDescription: "broken leg",
        symptoms: ["broken"],
        timestamp: new Date().toISOString(),
        userId: 26
      },
      diagnostics: [diagnosticData],
      repairGuide: {},
      interactions: [],
      analytics: [],
      metadata: {
        version: '1.0',
        source: 'repair-ai-assistant-test',
        syncTimestamp: new Date().toISOString(),
        aiTrainingReady: true
      }
    };
    
    // Generate a unique filename with timestamp and session ID
    const randomId = Math.floor(Math.random() * 10000);
    const filename = `test_session_${sessionId}_${timestamp}.json`;
    
    // Convert data to JSON string
    const fileContent = JSON.stringify(consolidatedData, null, 2);
    
    console.log(`\nUploading test session file: ${filename} directly to bucket root`);
    
    // Upload the file
    const file = bucket.file(filename);
    await file.save(fileContent, {
      contentType: 'application/json',
    });
    
    console.log(`Successfully uploaded test session file to ${filename}`);
    
    // Get the file's metadata to verify it's stored correctly
    const [metadata] = await file.getMetadata();
    console.log(`\nFile metadata for verification:`);
    console.log(`Name: ${metadata.name}`);
    console.log(`Content-Type: ${metadata.contentType}`);
    console.log(`Size: ${metadata.size} bytes`);
    console.log(`Storage class: ${metadata.storageClass}`);
    
    // Verify the file name doesn't have any folder structure
    if (metadata.name.includes('/')) {
      console.error(`ERROR: File was uploaded with a folder structure: ${metadata.name}`);
    } else {
      console.log(`SUCCESS: File was uploaded directly to bucket root: ${metadata.name}`);
    }
    
    // Get all files in the bucket again to verify what's there
    console.log(`\nListing all files in bucket to verify:`);
    const [files] = await bucket.getFiles();
    
    console.log(`Found ${files.length} files in bucket ${bucketName}:`);
    files.forEach(file => console.log(`- ${file.name}`));
    
    // Now looking specifically for files with the session ID
    const sessionFiles = files.filter(file => 
      file.name.includes(`_${sessionId}_`) || 
      file.name.includes(`session_${sessionId}`)
    );
    
    if (sessionFiles.length > 0) {
      console.log(`\nFound ${sessionFiles.length} files for session #${sessionId}:`);
      sessionFiles.forEach(file => console.log(`- ${file.name}`));
    } else {
      console.log(`\nNo other files found specifically for session #${sessionId}`);
    }
    
    console.log(`\nSuccessfully completed test repair session upload`);
    
  } catch (error) {
    console.error('Error in repair session upload test:', error);
  }
}

// Run the test
testUploadRealSessionFile();