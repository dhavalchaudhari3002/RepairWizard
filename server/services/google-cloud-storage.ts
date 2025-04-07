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
  private storage: Storage;
  private bucketName: string;
  private isReady: boolean = false;

  constructor() {
    this.bucketName = process.env.GCS_BUCKET_NAME || '';
    
    try {
      // Check if required environment variables are set
      if (!process.env.GCS_PROJECT_ID || !process.env.GCS_BUCKET_NAME) {
        console.warn('Google Cloud Storage is not configured: Missing project ID or bucket name');
        this.storage = new Storage();
        return;
      }

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
    
    // Generate file path
    const fileName = options.customName || this.generateFileName();
    const folderPrefix = options.folder ? `${options.folder}/` : '';
    const filePath = `${folderPrefix}${fileName}`;
    
    const file = bucket.file(filePath);
    
    // Set file metadata
    const metadata: Record<string, string> = {};
    if (options.contentType) {
      metadata.contentType = options.contentType;
    }
    
    // Upload the file
    try {
      await file.save(fileBuffer, {
        metadata: {
          contentType: options.contentType,
        },
      });
      
      // Make the file public if requested
      if (options.isPublic) {
        await file.makePublic();
      }
      
      // Return the public URL
      const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${filePath}`;
      return publicUrl;
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
   * Check if the service is properly configured
   * @returns Boolean indicating if the service is ready to use
   */
  isConfigured(): boolean {
    return this.isReady && !!this.bucketName;
  }
}

export const googleCloudStorage = new GoogleCloudStorageService();