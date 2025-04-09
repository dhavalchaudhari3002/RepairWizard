/**
 * This script investigates why the test/ folder keeps reappearing in the GCS console
 * by directly examining all objects in the bucket and their metadata.
 */
require('dotenv').config();
const { Storage } = require('@google-cloud/storage');

async function investigateGCSFolderIssue() {
  try {
    console.log('Initializing GCS client for investigation...');
    
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
    
    // Step 1: List all files but include full metadata
    console.log('\n=== STEP 1: Listing all files with metadata ===');
    const [files] = await bucket.getFiles();
    
    console.log(`Found ${files.length} total objects in the bucket`);
    
    // Show full details of suspicious objects
    const suspiciousObjects = files.filter(file => 
      file.name === 'test' || 
      file.name === 'test/' || 
      file.name.startsWith('test/') ||
      file.name.includes('/') // Any file that has a path separator
    );
    
    if (suspiciousObjects.length > 0) {
      console.log(`\nFound ${suspiciousObjects.length} suspicious objects (with folder-like paths):`);
      
      for (const obj of suspiciousObjects) {
        // Get detailed metadata for this object
        const [metadata] = await obj.getMetadata();
        console.log(`\nObject name: ${obj.name}`);
        console.log(`ID: ${metadata.id}`);
        console.log(`Kind: ${metadata.kind}`);
        console.log(`Size: ${metadata.size}`);
        console.log(`Storage class: ${metadata.storageClass}`);
        console.log(`Content type: ${metadata.contentType}`);
        console.log(`Time created: ${metadata.timeCreated}`);
        console.log(`Updated: ${metadata.updated}`);
        console.log(`Generation: ${metadata.generation}`);
        console.log(`Metageneration: ${metadata.metageneration}`);
        console.log(`ETag: ${metadata.etag}`);
        console.log(`Metadata:`, metadata.metadata || {});
        
        // Try to delete it
        try {
          console.log(`Attempting to delete: ${obj.name}`);
          await obj.delete();
          console.log(`Successfully deleted: ${obj.name}`);
        } catch (err) {
          console.error(`Failed to delete ${obj.name}: ${err.message}`);
        }
      }
    } else {
      console.log('No suspicious objects found in the bucket.');
    }
    
    // Step 2: Check bucket metadata
    console.log('\n=== STEP 2: Checking bucket metadata ===');
    const [bucketMetadata] = await bucket.getMetadata();
    console.log('Bucket metadata:', JSON.stringify(bucketMetadata, null, 2));
    
    // Step 3: Try to check for any potential ghost folders in GCS navigation structure
    console.log('\n=== STEP 3: Checking for ghost folders ===');
    
    // Use the special prefix+delimiter API to see how GCS views the folder structure
    // This is what the GCS console uses to display folders
    const [prefixes] = await bucket.getFiles({
      delimiter: '/',
      autoPaginate: false
    });
    
    const [_, folders] = prefixes;
    if (folders && folders.length > 0) {
      console.log(`GCS reports these as folders: ${JSON.stringify(folders)}`);
      
      // Try to delete each ghost folder
      for (const folder of folders) {
        // Add an empty marker file to each folder then delete it
        // This sometimes helps with ghost folder issues
        try {
          console.log(`Trying to fix ghost folder: ${folder}`);
          const file = bucket.file(`${folder}.ghostfix`);
          await file.save('', { contentType: 'text/plain' });
          await file.delete();
          console.log(`Applied ghost folder fix to: ${folder}`);
        } catch (err) {
          console.error(`Error fixing ghost folder ${folder}: ${err.message}`);
        }
      }
    } else {
      console.log('GCS does not report any folders using the prefix/delimiter API');
    }
    
    // Step 4: Try GCS low-level directory marker approach
    console.log('\n=== STEP 4: Deep clean using directory marker approach ===');
    
    // All possible permutations of the test folder name
    const testFolderPermutations = [
      'test',
      'test/',
      'test/.',
      'test//',
      'test#',
      'test_',
      'test.',
      'test%',
      'test?',
      'test/something',
      '.test/',
      'test.dir',
      'test.folder',
      'test$folder$',
      '' // Also check for an empty object which can sometimes cause issues
    ];
    
    for (const perm of testFolderPermutations) {
      try {
        console.log(`Checking for test folder permutation: ${perm}`);
        const testObj = bucket.file(perm);
        
        try {
          const [exists] = await testObj.exists();
          if (exists) {
            console.log(`Found object with name: ${perm}`);
            await testObj.delete();
            console.log(`Deleted object: ${perm}`);
          }
        } catch (err) {
          console.log(`Could not check/delete ${perm}: ${err.message}`);
        }
      } catch (err) {
        console.error(`Error processing ${perm}: ${err.message}`);
      }
    }
    
    // Step 5: Do a refresh check to see if any folders remain
    console.log('\n=== STEP 5: Final check ===');
    const [remainingFiles] = await bucket.getFiles();
    
    const remainingFolders = remainingFiles.filter(file => 
      file.name.includes('/') || 
      file.name === 'test' || 
      file.name === 'test/'
    );
    
    if (remainingFolders.length > 0) {
      console.log(`WARNING: There are still ${remainingFolders.length} folder-like objects:`);
      remainingFolders.forEach(f => console.log(`- ${f.name}`));
    } else {
      console.log('SUCCESS: No folder-like objects remain in the bucket');
    }
    
    // Step 6: Get GCS console URLs to help debug
    console.log('\n=== STEP 6: GCS console debug information ===');
    console.log(`GCS console URL: https://console.cloud.google.com/storage/browser/${bucketName}`);
    console.log(`Direct API URL: https://storage.googleapis.com/${bucketName}/`);
    
    // Step 7: Suggest cache clearing
    console.log('\n=== STEP 7: Next steps ===');
    console.log('1. Try clearing your browser cache - GCS console may be showing cached information');
    console.log('2. Try accessing the bucket from a different browser or incognito mode');
    console.log('3. Try the direct API URL to see if the folder shows up there');
    console.log('4. If the issue persists, try contacting GCS support as this may be a UI issue in the console');
    
  } catch (error) {
    console.error('Error investigating GCS folder issue:', error);
  }
}

// Run the investigation
investigateGCSFolderIssue();