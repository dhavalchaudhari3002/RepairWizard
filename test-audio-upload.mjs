/**
 * Test script to verify audio file uploads work correctly with the deduplication system
 */
import fs from 'fs';
import path from 'path';
import { Storage } from '@google-cloud/storage';
import dotenv from 'dotenv';
import { createHash } from 'crypto';

// Load environment variables
dotenv.config();

// Configuration
const bucketName = process.env.GCS_BUCKET_NAME;

// Create a small test WAV buffer
function createTestAudioBuffer() {
  // This is a minimal valid WAV file header followed by silent audio data
  const buffer = Buffer.alloc(44 + 1000);
  
  // WAV header (44 bytes)
  buffer.write('RIFF', 0);                     // ChunkID
  buffer.writeUInt32LE(buffer.length - 8, 4);  // ChunkSize
  buffer.write('WAVE', 8);                     // Format
  buffer.write('fmt ', 12);                    // Subchunk1ID
  buffer.writeUInt32LE(16, 16);                // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20);                 // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(1, 22);                 // NumChannels (1 for mono)
  buffer.writeUInt32LE(8000, 24);              // SampleRate (8000 Hz)
  buffer.writeUInt32LE(8000 * 1 * 1, 28);      // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
  buffer.writeUInt16LE(1 * 1, 32);             // BlockAlign (NumChannels * BitsPerSample/8)
  buffer.writeUInt16LE(8, 34);                 // BitsPerSample (8 bits)
  buffer.write('data', 36);                    // Subchunk2ID
  buffer.writeUInt32LE(buffer.length - 44, 40);// Subchunk2Size
  
  // Fill the rest with silence (for 8-bit PCM, silence is 128)
  buffer.fill(128, 44);
  
  return buffer;
}

// Create a slightly modified version of the test audio to test deduplication
function createModifiedAudioBuffer(originalBuffer) {
  const modifiedBuffer = Buffer.from(originalBuffer);
  // Change a few bytes to make it different
  modifiedBuffer[100] = 150;
  modifiedBuffer[200] = 160;
  modifiedBuffer[300] = 170;
  return modifiedBuffer;
}

async function uploadAudioBuffer(audioBuffer, filename, contentType) {
  try {
    if (!process.env.GCS_CREDENTIALS || !process.env.GCS_PROJECT_ID) {
      console.error('Missing required GCS credentials or project ID');
      return null;
    }

    const credentials = JSON.parse(process.env.GCS_CREDENTIALS);
    const storage = new Storage({
      projectId: process.env.GCS_PROJECT_ID,
      credentials
    });

    // Calculate content hash for verification
    const contentHash = createHash('sha256').update(audioBuffer).digest('hex');
    console.log(`Content hash for ${filename}: ${contentHash.substring(0, 16)}...`);
    
    // Upload directly to GCS with explicit repair-session folder
    const folder = 'repair-session';
    const filePath = `${folder}/${filename}`;
    
    // Save file locally first
    fs.writeFileSync(filename, audioBuffer);
    
    // Upload to GCS
    console.log(`Uploading audio file to ${bucketName}/${filePath}`);
    await storage.bucket(bucketName).upload(filename, {
      destination: filePath,
      metadata: {
        contentType: contentType
      }
    });
    
    // Generate public URL
    const publicUrl = `https://storage.googleapis.com/${bucketName}/${filePath}`;
    console.log(`File uploaded successfully to: ${publicUrl}`);
    
    // Clean up local file
    fs.unlinkSync(filename);
    
    return {
      filename,
      filePath,
      contentType,
      contentHash,
      publicUrl
    };
  } catch (error) {
    console.error(`Error uploading audio file ${filename}:`, error);
    return null;
  }
}

async function verifyBucketContents() {
  try {
    if (!process.env.GCS_CREDENTIALS || !process.env.GCS_PROJECT_ID) {
      console.error('Missing required GCS credentials or project ID');
      return;
    }

    const credentials = JSON.parse(process.env.GCS_CREDENTIALS);
    const storage = new Storage({
      projectId: process.env.GCS_PROJECT_ID,
      credentials
    });

    console.log(`Listing files in bucket: ${bucketName}`);
    const [files] = await storage.bucket(bucketName).getFiles();
    
    // Sort files by name for easier reading
    files.sort((a, b) => a.name.localeCompare(b.name));
    
    console.log('Files in bucket:');
    files.forEach(file => {
      console.log(`- ${file.name}`);
    });

    // Check for audio test files
    const audioFiles = files.filter(file => file.name.includes('test_audio_'));
    
    if (audioFiles.length > 0) {
      console.log('\nAudio test files found:');
      audioFiles.forEach(file => {
        console.log(`- ${file.name}`);
      });
      return audioFiles.length;
    } else {
      console.log('No audio test files found in bucket');
      return 0;
    }
  } catch (error) {
    console.error('Error verifying bucket contents:', error);
    return 0;
  }
}

async function runTests() {
  console.log('Starting audio upload tests...');
  console.log('------------------------------');
  
  const timestamp = Date.now();
  const results = {
    timestamp: new Date().toISOString(),
    testId: `audio-upload-test-${timestamp}`,
    uploads: []
  };
  
  // Check initial bucket state
  console.log('\n1. Checking current bucket contents:');
  await verifyBucketContents();
  
  // Upload original test audio file
  console.log('\n2. Testing original audio file upload:');
  const audioBuffer = createTestAudioBuffer();
  const originalFilename = `test_audio_original_${timestamp}.wav`;
  const originalUpload = await uploadAudioBuffer(audioBuffer, originalFilename, 'audio/wav');
  
  if (originalUpload) {
    results.uploads.push(originalUpload);
    results.originalUploadSuccess = true;
  } else {
    results.originalUploadSuccess = false;
  }
  
  // Upload different audio file to verify two different files are stored
  console.log('\n3. Testing different audio file upload:');
  const modifiedAudioBuffer = createModifiedAudioBuffer(audioBuffer);
  const modifiedFilename = `test_audio_modified_${timestamp}.wav`;
  const modifiedUpload = await uploadAudioBuffer(modifiedAudioBuffer, modifiedFilename, 'audio/wav');
  
  if (modifiedUpload) {
    results.uploads.push(modifiedUpload);
    results.modifiedUploadSuccess = true;
    
    // Verify the hashes are different
    const hashesAreDifferent = originalUpload.contentHash !== modifiedUpload.contentHash;
    console.log(`Hashes are different: ${hashesAreDifferent ? 'Yes ✓' : 'No ✗'}`);
    results.hashesAreDifferent = hashesAreDifferent;
  } else {
    results.modifiedUploadSuccess = false;
  }
  
  // Upload duplicate of the original file to test deduplication 
  // (Note: this test won't work fully here since our deduplication is in the cloud-data-sync service)
  console.log('\n4. Testing audio deduplication (should be handled by cloud-data-sync.ts in the app):');
  const duplicateFilename = `test_audio_duplicate_${timestamp}.wav`;
  const duplicateUpload = await uploadAudioBuffer(audioBuffer, duplicateFilename, 'audio/wav');
  
  if (duplicateUpload) {
    results.uploads.push(duplicateUpload);
    results.duplicateUploadSuccess = true;
    
    // Verify the duplicate has same hash as original
    const hashesMatch = originalUpload.contentHash === duplicateUpload.contentHash;
    console.log(`Original and duplicate hashes match: ${hashesMatch ? 'Yes ✓' : 'No ✗'}`);
    results.hashesMatch = hashesMatch;
  } else {
    results.duplicateUploadSuccess = false;
  }
  
  // Final check of bucket contents
  console.log('\n5. Checking final bucket contents:');
  const finalAudioCount = await verifyBucketContents();
  results.finalAudioCount = finalAudioCount;
  
  // Save test results
  console.log('\nTests completed!');
  const resultsFilename = `audio-upload-test-results-${timestamp}.json`;
  fs.writeFileSync(resultsFilename, JSON.stringify(results, null, 2));
  console.log(`Results saved to ${resultsFilename}`);
}

// Run the tests
runTests().catch(console.error);