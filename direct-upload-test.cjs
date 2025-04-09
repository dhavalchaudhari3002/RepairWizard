/**
 * Test script to verify files are uploaded directly to the bucket root
 * with no folder structure
 */
require('dotenv').config();
const { Storage } = require('@google-cloud/storage');
const fs = require('fs');
const path = require('path');

async function testDirectUpload() {
  try {
    console.log('Initializing GCS client for direct upload test...');
    
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
    
    // Create a test file with timestamp
    const timestamp = Date.now();
    const testData = {
      timestamp,
      message: "This is a test file to verify direct bucket upload",
      data: {
        sample: "data",
        number: 123,
        boolean: true
      }
    };
    
    // Save test data to a JSON file in memory
    const testFileName = `test-file-${timestamp}.json`;
    const testContent = JSON.stringify(testData, null, 2);
    
    console.log(`\nUploading test file: ${testFileName} directly to bucket root`);
    
    // Create the file in GCS
    const file = bucket.file(testFileName);
    await file.save(testContent, {
      contentType: 'application/json',
    });
    
    console.log(`Successfully uploaded test file to ${testFileName}`);
    
    // Get the file's metadata to verify it's stored correctly
    const [metadata] = await file.getMetadata();
    console.log(`\nFile metadata for verification:`);
    console.log(`Name: ${metadata.name}`);
    console.log(`Content-Type: ${metadata.contentType}`);
    console.log(`Size: ${metadata.size} bytes`);
    console.log(`Generation: ${metadata.generation}`);
    console.log(`Storage class: ${metadata.storageClass}`);
    
    // Verify the file name doesn't have any folder structure
    if (metadata.name.includes('/')) {
      console.error(`ERROR: File was uploaded with a folder structure: ${metadata.name}`);
    } else {
      console.log(`SUCCESS: File was uploaded directly to bucket root: ${metadata.name}`);
    }
    
    // Download the file to verify content
    console.log(`\nDownloading file to verify content...`);
    const [fileContent] = await file.download();
    
    console.log(`Downloaded file content (first 100 chars): ${fileContent.toString().substring(0, 100)}...`);
    
    // Write results to a JSON file for reference
    const results = {
      timestamp,
      fileName: testFileName,
      uploadedToRoot: !metadata.name.includes('/'),
      fileSize: metadata.size,
      contentVerified: fileContent.toString() === testContent
    };
    
    fs.writeFileSync(`direct-upload-test-results-${timestamp}.json`, JSON.stringify(results, null, 2));
    console.log(`\nTest results saved to direct-upload-test-results-${timestamp}.json`);
    
    // Now list all files in the bucket to verify
    console.log(`\nListing all files in bucket to verify file locations:`);
    const [files] = await bucket.getFiles();
    
    console.log(`Found ${files.length} files in bucket ${bucketName}:`);
    
    // Group files by "folder" (if any)
    const filesByFolder = {};
    
    files.forEach(file => {
      const name = file.name;
      if (name.includes('/')) {
        // This file has a folder structure
        const folder = name.split('/')[0];
        if (!filesByFolder[folder]) {
          filesByFolder[folder] = [];
        }
        filesByFolder[folder].push(name);
      } else {
        // This file is at root
        if (!filesByFolder['root']) {
          filesByFolder['root'] = [];
        }
        filesByFolder['root'].push(name);
      }
    });
    
    // Display files by folder
    for (const [folder, folderFiles] of Object.entries(filesByFolder)) {
      console.log(`\n${folder === 'root' ? 'Files at bucket root' : `Files in folder ${folder}`} (${folderFiles.length}):`);
      folderFiles.forEach(f => console.log(`  - ${f}`));
    }
    
    // Check specifically for the test/ folder
    const testFolderFiles = files.filter(file => file.name.startsWith('test/'));
    if (testFolderFiles.length > 0) {
      console.error(`\nWARNING: Found ${testFolderFiles.length} files in test/ folder:`);
      testFolderFiles.forEach(f => console.error(`  - ${f.name}`));
    } else {
      console.log(`\nSUCCESS: No files found in test/ folder`);
    }
    
    console.log(`\nDirect upload test completed successfully`);
    
  } catch (error) {
    console.error('Error in direct upload test:', error);
  }
}

// Run the test
testDirectUpload();