import { randomUUID } from 'crypto';
import { googleCloudStorage } from './google-cloud-storage';
import { simpleGoogleCloudStorage } from './new-gcs-service';
import * as bcrypt from 'bcrypt';

/**
 * Service for directly storing user data in Google Cloud Storage
 * without storing sensitive information in the local database
 */
class DirectUserStorageService {
  // Track active users in memory
  private activeUsers = new Map<string, any>();
  
  /**
   * Store user registration data directly in Google Cloud Storage
   * @param userData User registration data
   * @returns Object with user ID, email, and cloud storage URL
   */
  public async createUser(userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role?: string;
    tosAccepted: boolean;
  }): Promise<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    cloudStorageUrl: string;
  }> {
    try {
      // Generate unique user ID (using UUID instead of sequential IDs)
      const userId = randomUUID();
      
      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);
      
      // Create the user object with additional fields
      const user = {
        id: userId,
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email.toLowerCase(),
        password: hashedPassword, // Store hashed password
        role: userData.role || 'customer',
        tosAccepted: userData.tosAccepted,
        emailVerified: false,
        createdAt: new Date().toISOString(),
        // Add metadata fields for easier searching/filtering in cloud storage
        _metadata: {
          dataType: 'user',
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
      };
      
      // Upload directly to Google Cloud Storage in the 'user-data' folder
      const cloudStorageUrl = await googleCloudStorage.uploadBuffer(
        Buffer.from(JSON.stringify(user, null, 2)),
        {
          customName: `user-${userId}.json`,
          contentType: 'application/json',
          folder: 'user-data', // Explicitly using user-data folder
          isPublic: false
        }
      );
      
      console.log(`User data stored directly in cloud storage at: ${cloudStorageUrl}`);
      
      // Store in memory cache (without password)
      const { password, ...safeUser } = user;
      this.activeUsers.set(userId, safeUser);
      this.activeUsers.set(userData.email.toLowerCase(), safeUser); // Also index by email for quick lookups
      
      // Return user information without sensitive data
      return {
        id: userId,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role || 'customer',
        cloudStorageUrl
      };
    } catch (error) {
      console.error('Error storing user data directly in cloud storage:', error);
      throw error;
    }
  }
  
  /**
   * Find a user by email address
   * @param email User email address
   * @returns User data if found, undefined otherwise
   */
  public async getUserByEmail(email: string): Promise<any | undefined> {
    try {
      const lowerEmail = email.toLowerCase();
      
      // Check memory cache first
      if (this.activeUsers.has(lowerEmail)) {
        return this.activeUsers.get(lowerEmail);
      }
      
      // Query cloud storage to find the user
      // Note: In a production system, you would use a database index or search service
      // This is a simplified implementation for demonstration
      
      // List files in the user-data folder
      const [files] = await googleCloudStorage.storage
        .bucket(googleCloudStorage.bucketName)
        .getFiles({ prefix: 'user-data/' });
      
      // Find file with user data
      for (const file of files) {
        // Only process user JSON files
        if (file.name.endsWith('.json') && file.name.includes('user-')) {
          // Download the file content
          const [content] = await file.download();
          const userData = JSON.parse(content.toString());
          
          // Check if this is the user we're looking for
          if (userData.email && userData.email.toLowerCase() === lowerEmail) {
            // Cache the user for future lookups
            const { password, ...safeUser } = userData;
            this.activeUsers.set(userData.id, safeUser);
            this.activeUsers.set(lowerEmail, safeUser);
            
            return userData; // Return the full user data including password for authentication
          }
        }
      }
      
      // User not found
      return undefined;
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }
  
  /**
   * Validate user credentials
   * @param email User email
   * @param password Plain text password
   * @returns User data if credentials are valid, null otherwise
   */
  public async validateCredentials(email: string, password: string): Promise<any | null> {
    try {
      // Get the user data
      const user = await this.getUserByEmail(email);
      
      // If user not found, return null
      if (!user) {
        return null;
      }
      
      // Verify password
      const passwordValid = await bcrypt.compare(password, user.password);
      
      if (!passwordValid) {
        return null;
      }
      
      // Return user data without password
      const { password: _, ...safeUser } = user;
      return safeUser;
    } catch (error) {
      console.error('Error validating credentials:', error);
      throw error;
    }
  }
  
  /**
   * Store user profile image in cloud storage
   * @param userId User ID
   * @param imageBuffer Image data buffer
   * @param contentType Image content type
   * @returns URL of the uploaded image
   */
  public async storeUserProfileImage(
    userId: string,
    imageBuffer: Buffer,
    contentType: string = 'image/jpeg'
  ): Promise<string> {
    try {
      // Create a unique filename for the image
      const filename = `profile-${userId}-${randomUUID()}.${contentType.split('/')[1] || 'jpg'}`;
      
      // Upload directly to cloud storage in the user-data folder
      const imageUrl = await googleCloudStorage.uploadBuffer(
        imageBuffer,
        {
          customName: filename,
          contentType,
          folder: 'user-data',
          isPublic: true // Profile images are typically public
        }
      );
      
      console.log(`User profile image stored in cloud storage at: ${imageUrl}`);
      
      // Update the user's profile image URL in cloud storage
      const user = this.activeUsers.get(userId);
      if (user) {
        user.profileImageUrl = imageUrl;
        
        // Upload the updated user data
        await this.updateUserData(userId, user);
      }
      
      return imageUrl;
    } catch (error) {
      console.error('Error storing user profile image:', error);
      throw error;
    }
  }
  
  /**
   * Update user data in cloud storage
   * @param userId User ID
   * @param userData Updated user data
   * @returns URL of the updated user data
   */
  private async updateUserData(userId: string, userData: any): Promise<string> {
    try {
      // Add metadata for tracking
      userData._metadata = {
        ...userData._metadata,
        lastUpdated: new Date().toISOString()
      };
      
      // Upload the updated data to cloud storage
      const cloudStorageUrl = await googleCloudStorage.uploadBuffer(
        Buffer.from(JSON.stringify(userData, null, 2)),
        {
          customName: `user-${userId}.json`,
          contentType: 'application/json',
          folder: 'user-data',
          isPublic: false
        }
      );
      
      console.log(`Updated user data stored in cloud storage at: ${cloudStorageUrl}`);
      return cloudStorageUrl;
    } catch (error) {
      console.error('Error updating user data in cloud storage:', error);
      throw error;
    }
  }
}

// Create a singleton instance
export const directUserStorage = new DirectUserStorageService();