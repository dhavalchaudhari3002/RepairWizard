import { Storage } from '@google-cloud/storage';
import { randomUUID } from 'crypto';

interface UploadOptions {
  folder?: string;
  customName?: string;
  contentType?: string;
  isPublic?: boolean;
}

/**
 * A service for interacting with Google Cloud Storage
 * This service handles file uploads, retrievals, and deletions
 */
class GoogleCloudStorageService {
  public storage: Storage;
  public bucketName: string;
  private isReady: boolean = false;
  // Add static properties to track which folder IDs have been processed and are currently being processed
  private static processedFolderIds = new Set<number>();
  private static folderCreationInProgress = new Map<number, Promise<string>>();
  private static sequenceLock = false;
  private static lastProcessedId = 0;
  
  /**
   * Check if Google Cloud Storage is properly configured and accessible
   * @returns An object with the status of the GCS configuration
   */
  public async checkStatus(): Promise<{
    isConfigured: boolean;
    bucketName: string;
    message?: string;
  }> {
    try {
      if (!this.isReady || !this.bucketName) {
        return {
          isConfigured: false,
          bucketName: this.bucketName || 'not-configured',
          message: 'Google Cloud Storage is not properly configured'
        };
      }
      
      // Try to get bucket metadata to verify access
      const [exists] = await this.storage.bucket(this.bucketName).exists();
      
      if (!exists) {
        return {
          isConfigured: false,
          bucketName: this.bucketName,
          message: `Bucket "${this.bucketName}" does not exist`
        };
      }
      
      return {
        isConfigured: true,
        bucketName: this.bucketName
      };
    } catch (error) {
      console.error('Error checking GCS status:', error);
      return {
        isConfigured: false,
        bucketName: this.bucketName || 'error',
        message: error instanceof Error ? error.message : 'Unknown error checking GCS configuration'
      };
    }
  }
  
  /**
   * Upload a buffer to Google Cloud Storage
   * @param buffer The buffer to upload
   * @param options Upload options
   * @returns The public URL of the uploaded file
   */
  public async uploadBuffer(
    buffer: Buffer,
    options: UploadOptions = {}
  ): Promise<string> {
    if (!this.isReady) {
      throw new Error('Google Cloud Storage is not configured');
    }
    
    try {
      // IMPORTANT: Direct upload to bucket root, no folders
      const filename = options.customName || `${randomUUID()}`;
      
      // IMPORTANT: Warn if folder was provided but ignore it to prevent folder creation
      if (options.folder) {
        console.log(`WARNING: Folder option "${options.folder}" specified in uploadBuffer but ignoring it to avoid folder creation. Uploading directly to bucket root.`);
      }
      
      // Always use just the filename with no folder prefix
      const filePath = filename;
      
      const file = this.storage.bucket(this.bucketName).file(filePath);
      
      // Upload the buffer
      await file.save(buffer, {
        contentType: options.contentType || 'application/octet-stream',
        public: options.isPublic || false,
        metadata: {
          contentType: options.contentType || 'application/octet-stream'
        }
      });
      
      // Make the file public if requested
      if (options.isPublic) {
        await file.makePublic();
      }
      
      // Get the public URL
      const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${filePath}`;
      console.log(`Generated public URL (NO FOLDERS): ${publicUrl}`);
      return publicUrl;
    } catch (error) {
      console.error('Error uploading buffer to GCS:', error);
      throw error;
    }
  }

  constructor() {
    this.bucketName = process.env.GCS_BUCKET_NAME || '';
    console.log(`Google Cloud Storage initializing with bucket: ${this.bucketName}`);
    
    try {
      // Check if required environment variables are set
      if (!process.env.GCS_PROJECT_ID || !process.env.GCS_BUCKET_NAME) {
        console.warn('Google Cloud Storage is not configured: Missing project ID or bucket name');
        this.storage = new Storage();
        return;
      }
      
      console.log(`GCS_PROJECT_ID exists: ${!!process.env.GCS_PROJECT_ID}`);
      console.log(`GCS_BUCKET_NAME exists: ${!!process.env.GCS_BUCKET_NAME}`);
      console.log(`GCS_CREDENTIALS exists: ${!!process.env.GCS_CREDENTIALS}`);
      

      // Initialize Google Cloud Storage client
      if (process.env.GCS_CREDENTIALS) {
        // Use credentials from environment variable
        try {
          const credentials = JSON.parse(process.env.GCS_CREDENTIALS);
          this.storage = new Storage({
            projectId: process.env.GCS_PROJECT_ID,
            credentials
          });
          this.isReady = true;
          console.log('Google Cloud Storage initialized with credentials from environment');
        } catch (error) {
          console.error('Failed to parse GCS credentials:', error);
          this.storage = new Storage();
        }
      } else if (process.env.GCS_KEY_FILENAME) {
        // Use credentials from key file
        this.storage = new Storage({
          projectId: process.env.GCS_PROJECT_ID,
          keyFilename: process.env.GCS_KEY_FILENAME
        });
        this.isReady = true;
        console.log('Google Cloud Storage initialized with key file');
      } else {
        // Use default authentication (service account or application default credentials)
        this.storage = new Storage({
          projectId: process.env.GCS_PROJECT_ID
        });
        
        // Verify we can authenticate
        this.storage.getBuckets()
          .then(() => {
            this.isReady = true;
            console.log('Google Cloud Storage initialized with application default credentials');
          })
          .catch(error => {
            console.error('Failed to authenticate with Google Cloud Storage:', error);
            this.isReady = false;
          });
      }
    } catch (error) {
      console.error('Error initializing Google Cloud Storage:', error);
      this.storage = new Storage();
    }
  }

  /**
   * Upload a file to Google Cloud Storage
   * @param fileBuffer - The file buffer to upload
   * @param options - Upload options like folder, custom name, etc.
   * @returns The public URL of the uploaded file
   */
  async uploadFile(fileBuffer: Buffer, options: UploadOptions = {}): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('Google Cloud Storage is not configured');
    }

    const bucket = this.storage.bucket(this.bucketName);
    
    // Generate file path - ALWAYS USE DIRECT BUCKET ROOT, NO FOLDERS
    const fileName = options.customName || this.generateFileName();
    
    // IMPORTANT: Warn if folder was provided but ignore it to prevent folder creation
    if (options.folder) {
      console.log(`WARNING: Folder option "${options.folder}" specified but ignoring it to avoid folder creation. Uploading directly to bucket root.`);
    }
    
    // Always use just the filename with no folder prefix
    const filePath = fileName;
    
    const file = bucket.file(filePath);
    
    // Set file metadata
    const metadata: Record<string, string> = {};
    if (options.contentType) {
      metadata.contentType = options.contentType;
    }
    
    // Upload the file
    try {
      console.log(`Uploading file directly to bucket root: ${filePath}, bucket: ${this.bucketName}, size: ${fileBuffer.length} bytes`);
      try {
        await file.save(fileBuffer, {
          metadata: {
            contentType: options.contentType,
          },
          // Note: We're not attempting to set per-object ACLs since the bucket uses uniform access control
          // The bucket's permissions will apply to all objects
        });
        console.log(`File saved successfully to bucket root: ${filePath}`);
        
        // With uniform bucket-level access enabled, we don't need to call makePublic()
        // as it would cause an error. The bucket's IAM permissions apply to all objects.
        
        // Return the public URL (directly in bucket root, no folders)
        const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${filePath}`;
        console.log(`Generated public URL (NO FOLDERS): ${publicUrl}`);
        return publicUrl;
      } catch (uploadError) {
        console.error('Detailed upload error:', uploadError);
        throw uploadError;
      }
    } catch (error) {
      console.error('Error uploading file to Google Cloud Storage:', error);
      throw error;
    }
  }

  /**
   * Generate a random file name with timestamp to avoid collisions
   */
  private generateFileName(): string {
    const timestamp = Date.now();
    const uuid = randomUUID();
    return `${timestamp}-${uuid}`;
  }

  /**
   * Delete a file from Google Cloud Storage
   * @param fileUrl - The full URL or path of the file to delete
   */
  async deleteFile(fileUrl: string): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('Google Cloud Storage is not configured');
    }

    const bucket = this.storage.bucket(this.bucketName);
    
    try {
      // Extract file path from URL
      let filePath: string;
      
      if (fileUrl.includes(`storage.googleapis.com/${this.bucketName}/`)) {
        // If it's a full GCS URL
        filePath = fileUrl.split(`storage.googleapis.com/${this.bucketName}/`)[1];
      } else if (fileUrl.startsWith('/')) {
        // If it's a path starting with /
        filePath = fileUrl.substring(1);
      } else {
        // Assume it's already the correct path
        filePath = fileUrl;
      }
      
      // Delete the file
      const file = bucket.file(filePath);
      await file.delete();
    } catch (error) {
      console.error('Error deleting file from Google Cloud Storage:', error);
      throw error;
    }
  }

  /**
   * Delete a folder and all its contents from Google Cloud Storage
   * @param folderPath - The path of the folder to delete
   */
  async deleteFolder(folderPath: string): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('Google Cloud Storage is not configured');
    }

    // Ensure path ends with a slash to indicate a folder
    const normalizedFolderPath = folderPath.endsWith('/') ? folderPath : `${folderPath}/`;
    
    const bucket = this.storage.bucket(this.bucketName);
    
    try {
      console.log(`Attempting to delete folder: ${normalizedFolderPath}`);
      
      // List all files in the folder
      const [files] = await bucket.getFiles({
        prefix: normalizedFolderPath
      });
      
      console.log(`Found ${files.length} files/objects to delete in the folder ${normalizedFolderPath}`);
      
      // Delete each file
      const deletePromises = files.map(file => {
        console.log(`Deleting file: ${file.name}`);
        return file.delete();
      });
      
      await Promise.all(deletePromises);
      
      console.log(`Successfully deleted folder: ${normalizedFolderPath} with all its contents`);
    } catch (error) {
      console.error(`Error deleting folder ${normalizedFolderPath} from Google Cloud Storage:`, error);
      throw error;
    }
  }

  /**
   * Get the signed URL for a file (for temporary access to private files)
   * @param filePath - The path of the file in the bucket
   * @param expiresInMinutes - How long the URL should be valid for (in minutes)
   */
  async getSignedUrl(filePath: string, expiresInMinutes = 60): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('Google Cloud Storage is not configured');
    }

    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(filePath);
    
    // Calculate expiration time
    const expiresAt = Date.now() + expiresInMinutes * 60 * 1000;
    
    try {
      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: expiresAt,
      });
      
      return url;
    } catch (error) {
      console.error('Error generating signed URL:', error);
      throw error;
    }
  }

  /**
   * Save JSON data to Google Cloud Storage
   * @param data - The data to save
   * @param options - Upload options like folder, custom name, etc.
   * @returns The public URL of the saved JSON file
   */
  async saveJsonData(data: any, options: UploadOptions = {}): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('Google Cloud Storage is not configured');
    }

    // Convert data to JSON string and then to buffer
    const jsonString = JSON.stringify(data, null, 2);
    const fileBuffer = Buffer.from(jsonString, 'utf-8');
    
    // Default content type for JSON
    const contentType = options.contentType || 'application/json';
    
    // Default file extension for JSON
    let customName = options.customName || this.generateFileName();
    if (!customName.endsWith('.json')) {
      customName += '.json';
    }
    
    // Upload with modified options
    return this.uploadFile(fileBuffer, {
      ...options,
      contentType,
      customName
    });
  }

  /**
   * Check if the service is properly configured
   * @returns Boolean indicating if the service is ready to use
   */
  isConfigured(): boolean {
    return this.isReady && !!this.bucketName;
  }
  
  /**
   * Upload a base64 encoded image to Google Cloud Storage
   * @param base64Data - The base64 encoded image data
   * @param options - Upload options like folder, custom name, etc.
   * @returns The public URL of the uploaded image
   */
  async uploadBase64Image(base64Data: string, options: UploadOptions = {}): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('Google Cloud Storage is not configured');
    }
    
    // Remove data URL prefix if present (e.g., "data:image/jpeg;base64,")
    let actualBase64Data = base64Data;
    if (base64Data.includes(';base64,')) {
      const contentType = base64Data.split(';')[0].split(':')[1];
      actualBase64Data = base64Data.split(',')[1];
      options.contentType = options.contentType || contentType;
    }
    
    // Convert base64 to buffer
    const fileBuffer = Buffer.from(actualBase64Data, 'base64');
    
    // Determine file extension based on content type if not specified
    if (options.contentType && !options.customName) {
      const extension = this.getExtensionFromContentType(options.contentType);
      const generatedName = this.generateFileName();
      options.customName = `${generatedName}${extension}`;
    }
    
    // Upload the file
    return this.uploadFile(fileBuffer, options);
  }
  
  /**
   * Get file extension from content type
   * @param contentType - The content type (MIME type)
   * @returns Appropriate file extension including the dot
   */
  private getExtensionFromContentType(contentType: string): string {
    const extensionMap: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/svg+xml': '.svg',
      'application/pdf': '.pdf',
      'application/json': '.json',
      'text/plain': '.txt',
      'text/html': '.html',
      'text/css': '.css',
      'text/javascript': '.js',
    };
    
    return extensionMap[contentType] || '.bin';
  }
  
  /**
   * Check if a folder exists in Google Cloud Storage
   * @param folderPath The path of the folder to check
   * @returns Boolean indicating if the folder exists
   */
  async checkIfFolderExists(folderPath: string): Promise<boolean> {
    if (!this.isConfigured()) {
      throw new Error('Google Cloud Storage is not configured');
    }
    
    // Ensure path ends with a slash to indicate a folder
    const normalizedFolderPath = folderPath.endsWith('/') ? folderPath : `${folderPath}/`;
    
    try {
      // Try to list files in the folder with a limit of 1
      const [files] = await this.storage.bucket(this.bucketName).getFiles({
        prefix: normalizedFolderPath,
        maxResults: 1
      });
      
      // If we got any results, the folder exists
      return files.length > 0;
    } catch (error) {
      console.error(`Error checking if folder ${normalizedFolderPath} exists:`, error);
      return false;
    }
  }
  
  /**
   * Create a folder in Google Cloud Storage
   * Google Cloud Storage doesn't have actual folders, so we create an empty file with a trailing slash
   * @param folderPath The path of the folder to create
   * @returns The full path of the created folder
   */
  async createFolder(folderPath: string): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('Google Cloud Storage is not configured');
    }
    
    // Ensure path ends with a slash to indicate a folder
    const normalizedFolderPath = folderPath.endsWith('/') ? folderPath : `${folderPath}/`;
    
    try {
      // Create an empty file with the folder path
      const file = this.storage.bucket(this.bucketName).file(`${normalizedFolderPath}.keep`);
      await file.save('', { contentType: 'text/plain' });
      
      console.log(`Created folder: ${normalizedFolderPath}`);
      return normalizedFolderPath;
    } catch (error) {
      console.error(`Error creating folder ${normalizedFolderPath}:`, error);
      throw error;
    }
  }
  
  /**
   * Upload a string directly to Google Cloud Storage
   * @param filePath The full path of the file to create
   * @param content The string content to upload
   * @param contentType The content type of the file
   * @returns The public URL of the uploaded file
   */
  async uploadText(filePath: string, content: string, contentType: string = 'application/json'): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('Google Cloud Storage is not configured');
    }
    
    // IMPORTANT: Ensure we're not creating any folder structure
    // Extract just the filename without any path segments
    let filename = filePath;
    
    // Always check for folder paths in the filePath and extract just the filename
    if (filePath.includes('/')) {
      // Get just the filename part, stripping any folder structure
      filename = filePath.split('/').pop() || filePath;
      console.log(`WARNING: Attempted to create folder structure in path: ${filePath}. Using filename directly: ${filename}`);
    }
    
    // Second check - ensure no test/ prefix gets added
    if (filename.startsWith('test/')) {
      filename = filename.substring(5); // Remove 'test/' prefix
      console.log(`WARNING: Found test/ prefix in: ${filename}. Removing prefix.`);
    }
    
    console.log(`Using final filename (NO FOLDERS): ${filename}`);
    
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(filename); // Use filename directly, not path
    const fileBuffer = Buffer.from(content, 'utf-8');
    
    try {
      console.log(`Uploading directly to bucket root: ${filename}, bucket: ${this.bucketName}, size: ${fileBuffer.length} bytes`);
      
      // Create a write stream for the file
      const writeStream = file.createWriteStream({
        metadata: {
          contentType: contentType,
        },
        resumable: false // For small files, non-resumable is faster
      });
      
      // Return a promise that resolves when the upload is complete
      return new Promise((resolve, reject) => {
        writeStream.on('error', (error) => {
          console.error(`Error uploading to GCS: ${error}`);
          reject(error);
        });
        
        writeStream.on('finish', () => {
          console.log(`File saved successfully to bucket root: ${filename}`);
          // Return the public URL (directly in bucket root, no folders)
          const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${filename}`;
          console.log(`Generated public URL (NO FOLDERS): ${publicUrl}`);
          resolve(publicUrl);
        });
        
        // Write the content to the stream and end it
        writeStream.end(fileBuffer);
      });
    } catch (error) {
      console.error(`Error uploading file to Google Cloud Storage: ${filename}`, error);
      throw error;
    }
  }
  
  /**
   * Creates the necessary folder structure for a repair journey
   * @param sessionId - The ID of the repair session
   * @returns The folder path created
   */
  async createRepairJourneyFolderStructure(sessionId: number): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('Google Cloud Storage is not configured');
    }

    // Wait until we acquire the sequence lock
    while (GoogleCloudStorageService.sequenceLock) {
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms
    }
    
    try {
      // Acquire sequence lock
      GoogleCloudStorageService.sequenceLock = true;

      // Check if we need to maintain sequential IDs - only process the next ID in sequence
      if (GoogleCloudStorageService.lastProcessedId > 0 && sessionId !== GoogleCloudStorageService.lastProcessedId + 1 && sessionId !== GoogleCloudStorageService.lastProcessedId) {
        console.log(`Warning: Session ID ${sessionId} is not sequential after ${GoogleCloudStorageService.lastProcessedId}`);
        
        // Only allow sequential processing if it's the next ID or we're reprocessing the same ID
        if (sessionId > GoogleCloudStorageService.lastProcessedId + 1) {
          console.log(`Skipping non-sequential session ID ${sessionId} to prevent duplicate folders`);
          return `repair_sessions/${sessionId}`;
        }
      }
      
      // If this session has already been processed, skip folder creation
      if (GoogleCloudStorageService.processedFolderIds.has(sessionId)) {
        console.log(`Folder structure for session #${sessionId} was already created in this server process, skipping repeated creation`);
        return `repair_sessions/${sessionId}`;
      }
      
      // Critical section: check if there's already a folder creation in progress for this session ID
      if (GoogleCloudStorageService.folderCreationInProgress.has(sessionId)) {
        console.log(`Folder creation for session #${sessionId} is already in progress, reusing the existing promise`);
        // Reuse the existing promise to avoid duplicate creation
        return GoogleCloudStorageService.folderCreationInProgress.get(sessionId) as Promise<string>;
      }
      
      // Create a new promise for this folder creation and track it
      const folderCreationPromise = this._createFolderStructure(sessionId);
      
      // Store the promise so concurrent requests can reuse it
      GoogleCloudStorageService.folderCreationInProgress.set(sessionId, folderCreationPromise);
      
      try {
        // Wait for the folder creation to complete
        const result = await folderCreationPromise;
        
        // Update the last processed ID
        GoogleCloudStorageService.lastProcessedId = sessionId;
        console.log(`Updated last processed session ID to ${sessionId}`);
        
        return result;
      } finally {
        // Clean up the promise from the map once it's done (success or failure)
        GoogleCloudStorageService.folderCreationInProgress.delete(sessionId);
      }
    } finally {
      // Release sequence lock
      GoogleCloudStorageService.sequenceLock = false;
    }
  }
  
  // Private method to do the actual folder creation work
  private async _createFolderStructure(sessionId: number): Promise<string> {
    const baseFolder = `repair_sessions/${sessionId}`;
    const subFolders = [
      'submission',         // Initial repair request submission
      'diagnostics',        // Diagnostic analysis data
      'questions',          // Question-answer interactions
      'issue_confirmation', // Confirmed issue data
      'repair_guide',       // Repair guide data
      'interactions',       // User interactions
      'uploads',            // User uploaded files
      'complete_journey'    // Complete journey data
    ];
    
    try {
      // Get all existing base folders in the repair_sessions directory
      const bucket = this.storage.bucket(this.bucketName);
      
      console.log(`Checking if folder structure for repair session #${sessionId} already exists...`);
      
      // Check if the base folder exists by checking for at least one file/folder in the structure
      try {
        const [existingFiles] = await bucket.getFiles({
          prefix: `${baseFolder}/`,
          maxResults: 5 // Check a few files to be sure
        });
        
        // If we found files in the base folder, assume the structure exists
        if (existingFiles && existingFiles.length > 0) {
          console.log(`Folder structure for repair session #${sessionId} already exists with ${existingFiles.length} files, skipping creation`);
          
          // Mark this session as processed
          GoogleCloudStorageService.processedFolderIds.add(sessionId);
          
          return baseFolder;
        }
      } catch (checkError: any) {
        // If the check fails, we'll assume the folder doesn't exist and try to create it
        console.log(`Folder check failed for session #${sessionId}, will attempt creation: ${checkError?.message || 'Unknown error'}`);
      }
      
      console.log(`Creating folder structure for repair session #${sessionId}`);
      
      // Creating an empty file in each folder to ensure the folder structure exists
      // Using a separate try/catch for each folder to ensure partial success if one fails
      for (const subFolder of subFolders) {
        try {
          const folderPath = `${baseFolder}/${subFolder}`;
          
          // Double-check if this specific subfolder exists to avoid duplicate creation
          const [subFolderFiles] = await bucket.getFiles({
            prefix: `${folderPath}/`,
            maxResults: 1
          });
          
          if (subFolderFiles && subFolderFiles.length > 0) {
            console.log(`Subfolder ${folderPath} already exists, skipping`);
            continue;
          }
          
          // Create placeholder file to establish folder
          const emptyBuffer = Buffer.from('');
          await this.uploadFile(emptyBuffer, {
            folder: folderPath,
            customName: '.folder',
            contentType: 'application/x-empty'
          });
          
          console.log(`Created folder structure: ${folderPath}`);
        } catch (subFolderError: any) {
          console.warn(`Error creating subfolder for session #${sessionId}, continuing with others: ${subFolderError?.message || 'Unknown error'}`);
          // Continue with other folders rather than aborting completely
        }
      }
      
      // Mark this session as processed to avoid duplicate folder creation in the same server process
      GoogleCloudStorageService.processedFolderIds.add(sessionId);
      console.log(`Marked session #${sessionId} as processed to prevent duplicate folder creation`);
      
      return baseFolder;
    } catch (error) {
      console.error('Error creating repair journey folder structure:', error);
      throw error;
    }
  }
  
  /**
   * Save repair journey data, organizing it by stage
   * @param sessionId - The ID of the repair session
   * @param stage - The stage of the repair journey (diagnostics, issue_confirmation, repair_guide)
   * @param data - The data to save
   * @param customFileName - Optional custom file name (default is based on timestamp)
   * @returns The URL of the saved data
   */
  async saveRepairJourneyData(
    sessionId: number, 
    stage: string, 
    data: any, 
    customFileName?: string
  ): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('Google Cloud Storage is not configured');
    }
    
    // Validate stage name
    const validStages = [
      'submission',
      'diagnostics',
      'questions',
      'issue_confirmation',
      'repair_guide',
      'interactions',
      'uploads',
      'complete_journey'
    ];
    if (!validStages.includes(stage)) {
      throw new Error(`Invalid stage: ${stage}. Must be one of: ${validStages.join(', ')}`);
    }
    
    // Skip folder structure creation
    console.log(`Direct upload without folders for session #${sessionId} stage ${stage}`);
    
    // Add metadata to the data object
    const dataWithMetadata = {
      ...data,
      _metadata: {
        sessionId,
        stage,
        timestamp: new Date().toISOString(),
      }
    };
    
    // Generate a descriptive file name that contains session ID and stage information
    // Use timestamp in the filename to ensure uniqueness
    const timestamp = Date.now();
    const fileName = customFileName || `session_${sessionId}_${stage}_${timestamp}.json`;
    
    // Save the data directly to bucket root (no folder)
    console.log(`Saving repair journey data directly to bucket root: ${fileName}`);
    return this.saveJsonData(dataWithMetadata, {
      folder: '', // No folder, directly in root
      customName: fileName,
      isPublic: false
    });
  }
}

export const googleCloudStorage = new GoogleCloudStorageService();