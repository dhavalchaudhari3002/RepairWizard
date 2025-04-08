import { googleCloudStorage } from '../services/google-cloud-storage';

/**
 * This utility script deletes a specific folder from Google Cloud Storage
 * It's useful for cleaning up duplicate/unwanted folders
 */
async function cleanupFolders() {
  try {
    // Delete the specified folder and all its contents
    console.log('Deleting folder: repair_sessions/115');
    await googleCloudStorage.deleteFolder('repair_sessions/115');
    console.log('Successfully deleted folder: repair_sessions/115');
  } catch (error) {
    console.error('Error deleting folder:', error);
  }
}

// Run the cleanup operation
cleanupFolders();