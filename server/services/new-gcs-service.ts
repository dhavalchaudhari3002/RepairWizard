import { Storage } from '@google-cloud/storage';
import { randomUUID } from 'crypto';

/**
 * A simplified service for interacting with Google Cloud Storage
 * This service handles direct file uploads to bucket root, with no folder creation
 */
class SimpleGoogleCloudStorageService {
  private storage: Storage;
  private bucketName: string;
  private isReady: boolean = false;
  
  constructor() {
    this.bucketName = process.env.GCS_BUCKET_NAME || '';
    console.log(`New Google Cloud Storage service initializing with bucket: ${this.bucketName}`);
    
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
          console.log('New Google Cloud Storage service initialized with credentials from environment');
        } catch (error) {
          console.error('Failed to parse GCS credentials:', error);
          this.storage = new Storage();
        }
      } else {
        // Use default authentication
        this.storage = new Storage({
          projectId: process.env.GCS_PROJECT_ID
        });
        
        // Verify we can authenticate
        this.storage.getBuckets()
          .then(() => {
            this.isReady = true;
            console.log('New Google Cloud Storage service initialized with application default credentials');
          })
          .catch(error => {
            console.error('Failed to authenticate with Google Cloud Storage:', error);
            this.isReady = false;
          });
      }
    } catch (error) {
      console.error('Error initializing new Google Cloud Storage service:', error);
      this.storage = new Storage();
    }
  }
  
  /**
   * Check if Google Cloud Storage is properly configured and accessible
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
   * Uploads JSON data directly to bucket root (no folders)
   */
  public async uploadJson(data: any, prefix = ''): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('Google Cloud Storage is not configured');
    }
    
    try {
      // Generate a unique and descriptive filename
      const timestamp = Date.now();
      const uuid = randomUUID().substring(0, 8); // Use first 8 chars to keep filenames shorter
      const filename = prefix 
        ? `${prefix}_${timestamp}_${uuid}.json`
        : `file_${timestamp}_${uuid}.json`;
      
      // Convert data to JSON
      const jsonContent = JSON.stringify(data, null, 2);
      const fileBuffer = Buffer.from(jsonContent, 'utf-8');
      
      console.log(`Uploading JSON file directly to bucket root: ${filename}`);
      
      // Get reference to the file (directly in bucket root)
      const file = this.storage.bucket(this.bucketName).file(filename);
      
      // Upload the file
      await file.save(fileBuffer, {
        contentType: 'application/json',
        metadata: {
          contentType: 'application/json'
        }
      });
      
      // Return the public URL
      const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${filename}`;
      console.log(`File uploaded successfully to bucket root: ${publicUrl}`);
      
      return publicUrl;
    } catch (error) {
      console.error('Error uploading JSON file to GCS:', error);
      throw error;
    }
  }
  
  /**
   * Uploads session data directly to bucket root with a descriptive filename
   */
  public async uploadSessionData(sessionId: number, data: any): Promise<string> {
    return this.uploadJson(data, `session_${sessionId}`);
  }
  
  /**
   * Uploads an interaction directly to bucket root with a descriptive filename
   */
  public async uploadInteractionData(sessionId: number, interactionId: number, interactionType: string, data: any): Promise<string> {
    return this.uploadJson(data, `interaction_${sessionId}_${interactionId}_${interactionType}`);
  }
  
  /**
   * Determines if the service is properly configured
   */
  private isConfigured(): boolean {
    return this.isReady && !!this.bucketName;
  }
  
  /**
   * Uploads raw text content directly to bucket root
   */
  public async uploadText(content: string, prefix = ''): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('Google Cloud Storage is not configured');
    }
    
    try {
      // Generate a unique and descriptive filename
      const timestamp = Date.now();
      const uuid = randomUUID().substring(0, 8);
      const filename = prefix 
        ? `${prefix}_${timestamp}_${uuid}.txt`
        : `text_${timestamp}_${uuid}.txt`;
      
      // Convert content to buffer
      const fileBuffer = Buffer.from(content, 'utf-8');
      
      console.log(`Uploading text file directly to bucket root: ${filename}`);
      
      // Get reference to the file (directly in bucket root)
      const file = this.storage.bucket(this.bucketName).file(filename);
      
      // Upload the file
      await file.save(fileBuffer, {
        contentType: 'text/plain',
        metadata: {
          contentType: 'text/plain'
        }
      });
      
      // Return the public URL
      const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${filename}`;
      console.log(`File uploaded successfully to bucket root: ${publicUrl}`);
      
      return publicUrl;
    } catch (error) {
      console.error('Error uploading text file to GCS:', error);
      throw error;
    }
  }
}

// Create a singleton instance
export const simpleGoogleCloudStorage = new SimpleGoogleCloudStorageService();