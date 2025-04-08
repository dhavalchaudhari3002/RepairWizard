import { Router } from 'express';
import { googleCloudStorage } from '../services/google-cloud-storage';
import { cloudDataSync } from '../services/cloud-data-sync';
import { storage } from '../storage';
import multer from 'multer';
import { randomUUID } from 'crypto';
import * as z from 'zod';

const router = Router();

// Configure multer for in-memory storage
const memoryStorage = multer.memoryStorage();
const upload = multer({ 
  storage: memoryStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  }
});

// Schema for sync configuration
const syncConfigSchema = z.object({
  autoSync: z.boolean(),
  syncFrequency: z.enum(['realtime', 'hourly', 'daily'])
});

// Default sync settings
const DEFAULT_SYNC_CONFIG = {
  autoSync: true,
  syncFrequency: 'realtime' as 'realtime' | 'hourly' | 'daily',
  lastSyncTime: undefined
};

// In-memory cache for user-specific settings
// In a real app, this would be stored in the database
const userSyncSettings = new Map<number, {
  autoSync: boolean;
  syncFrequency: 'realtime' | 'hourly' | 'daily';
  lastSyncTime?: string;
}>();

/**
 * Check if Google Cloud Storage is configured and accessible
 */
router.get('/status', async (req, res) => {
  try {
    const status = await googleCloudStorage.checkStatus();
    res.json({
      configured: status.isConfigured,
      message: status.isConfigured 
        ? `Connected to bucket: ${status.bucketName}` 
        : 'Google Cloud Storage is not properly configured',
      bucketName: status.bucketName
    });
  } catch (error) {
    console.error('Error checking cloud storage status:', error);
    res.status(500).json({ 
      configured: false, 
      message: 'Error checking Google Cloud Storage configuration' 
    });
  }
});

/**
 * Fetch user's data sync configuration
 */
router.get('/sync-config', (req, res) => {
  try {
    // Get user ID from session
    const userId = req.session?.passport?.user;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get user's sync settings or return defaults
    const userSettings = userSyncSettings.get(userId) || DEFAULT_SYNC_CONFIG;
    
    res.json(userSettings);
  } catch (error) {
    console.error('Error fetching sync configuration:', error);
    res.status(500).json({ error: 'Failed to fetch sync configuration' });
  }
});

/**
 * Update user's data sync configuration
 */
router.post('/sync-config', async (req, res) => {
  try {
    // Get user ID from session
    const userId = req.session?.passport?.user;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Validate input
    const result = syncConfigSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid sync configuration' });
    }

    // Get current settings or default
    const currentSettings = userSyncSettings.get(userId) || DEFAULT_SYNC_CONFIG;
    
    // Update settings
    const updatedSettings = {
      ...currentSettings,
      autoSync: result.data.autoSync,
      syncFrequency: result.data.syncFrequency
    };
    
    // Save settings
    userSyncSettings.set(userId, updatedSettings);
    
    res.json({ 
      success: true,
      config: updatedSettings
    });
  } catch (error) {
    console.error('Error updating sync configuration:', error);
    res.status(500).json({ error: 'Failed to update sync configuration' });
  }
});

/**
 * Trigger a manual sync of all user data to Google Cloud Storage
 */
router.post('/manual-sync', async (req, res) => {
  try {
    // Get user ID from session
    const userId = req.session?.passport?.user;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get user's repair sessions
    const repairSessions = await storage.getRepairSessionsByUserId(userId);
    
    if (repairSessions.length === 0) {
      return res.json({
        success: true,
        message: 'No repair sessions found to sync',
        syncedItems: 0,
        syncTime: new Date().toISOString()
      });
    }
    
    let successCount = 0;
    const errors: string[] = [];
    
    // Sync each repair session
    for (const session of repairSessions) {
      try {
        await cloudDataSync.syncRepairSession(session.id);
        successCount++;
      } catch (error) {
        errors.push(`Failed to sync session #${session.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    // Sync all diagnostic trees
    try {
      await cloudDataSync.syncAllDiagnosticTrees();
    } catch (error) {
      errors.push(`Failed to sync diagnostic trees: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // Update last sync time
    const syncTime = new Date().toISOString();
    const currentSettings = userSyncSettings.get(userId) || DEFAULT_SYNC_CONFIG;
    userSyncSettings.set(userId, {
      ...currentSettings,
      lastSyncTime: syncTime
    });
    
    if (errors.length > 0) {
      return res.status(207).json({
        success: successCount > 0,
        message: `Synced ${successCount} of ${repairSessions.length} repair sessions with ${errors.length} errors`,
        syncedItems: successCount,
        syncTime,
        errors
      });
    }
    
    return res.json({
      success: true,
      message: `Successfully synced ${successCount} repair sessions`,
      syncedItems: successCount,
      syncTime
    });
  } catch (error) {
    console.error('Error triggering manual sync:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to sync data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Upload a file to Google Cloud Storage
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    // Get user ID from session
    const userId = req.session?.passport?.user;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Get file details
    const file = req.file;
    const folder = req.body.folder || 'uploads';
    
    // Generate a unique filename
    const filename = `${randomUUID()}_${file.originalname}`;
    
    // Upload to Google Cloud Storage
    const url = await googleCloudStorage.uploadBuffer(
      file.buffer, 
      {
        folder,
        customName: filename,
        contentType: file.mimetype,
        isPublic: true
      }
    );
    
    // Store file metadata in database
    const storedFile = await storage.createStorageFile({
      userId,
      fileUrl: url,
      fileName: file.originalname,
      originalName: file.originalname,
      contentType: file.mimetype,
      fileSize: file.size,
      folder,
      metadata: {
        encoding: file.encoding,
        uploadedBy: 'cloud-storage-ui'
      }
    });
    
    res.json({
      url,
      name: file.originalname,
      id: storedFile.id
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

/**
 * Delete a folder and all its contents from Google Cloud Storage
 */
router.delete('/delete-folder', async (req, res) => {
  try {
    // Get user ID from session
    const userId = req.session?.passport?.user;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Validate input
    const { folderPath } = req.body;
    if (!folderPath) {
      return res.status(400).json({ error: 'Folder path is required' });
    }
    
    // Only allow admins or users with special permissions to delete folders
    // In a real system, you'd check user roles from the database
    
    console.log(`Attempting to delete folder: ${folderPath}`);
    
    // Delete the folder from Google Cloud Storage
    await googleCloudStorage.deleteFolder(folderPath);
    
    res.json({
      success: true,
      message: `Folder ${folderPath} deleted successfully`
    });
  } catch (error) {
    console.error('Error deleting folder:', error);
    res.status(500).json({ 
      error: 'Failed to delete folder',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Delete a file from Google Cloud Storage
 */
router.delete('/delete', async (req, res) => {
  try {
    // Get user ID from session
    const userId = req.session?.passport?.user;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Validate input
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    // Verify file belongs to the user
    const file = await storage.getStorageFileByUrl(url);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    if (file.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Delete from Google Cloud Storage
    await googleCloudStorage.deleteFile(url);
    
    // Delete from database
    await storage.deleteStorageFileByUrl(url);
    
    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

export default router;