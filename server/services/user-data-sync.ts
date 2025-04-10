import { randomUUID } from 'crypto';
import { googleCloudStorage } from './google-cloud-storage';

/**
 * Service responsible for managing user data in cloud storage
 * This service ensures all user registration and account data
 * is stored in the 'user-data' folder in Google Cloud Storage
 */
class UserDataSyncService {
  /**
   * Stores user registration data in the user-data folder
   * @param userData User registration data
   * @returns URL to the stored data in cloud storage
   */
  public async storeUserRegistrationData(userData: any): Promise<string> {
    try {
      // Create a safe version of the data without the password
      const safeUserData = {
        id: userData.id,
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        role: userData.role,
        emailVerified: userData.emailVerified,
        tosAccepted: userData.tosAccepted,
        createdAt: userData.createdAt,
        // Add metadata for easier identification
        _metadata: {
          dataType: 'user-registration',
          timestamp: new Date().toISOString(),
        }
      };

      // Convert to JSON string
      const userDataJson = JSON.stringify(safeUserData, null, 2);
      
      // Create a unique filename for the user data
      const filename = `user-${userData.id}-${randomUUID()}.json`;
      
      // Upload to Google Cloud Storage, explicitly using the user-data folder
      const uploadedUrl = await googleCloudStorage.uploadBuffer(
        Buffer.from(userDataJson),
        {
          customName: filename,
          contentType: 'application/json',
          folder: 'user-data', // Explicitly using user-data folder
          isPublic: false
        }
      );
      
      console.log(`User registration data stored at: ${uploadedUrl}`);
      return uploadedUrl;
    } catch (error) {
      console.error('Error storing user registration data:', error);
      throw error;
    }
  }

  /**
   * Stores user profile image in the user-data folder
   * @param userId User ID
   * @param imageBuffer Image buffer data
   * @param contentType Content type of the image
   * @returns URL to the stored image in cloud storage
   */
  public async storeUserProfileImage(
    userId: number,
    imageBuffer: Buffer,
    contentType: string = 'image/jpeg'
  ): Promise<string> {
    try {
      // Create a unique filename for the profile image
      const filename = `profile-${userId}-${randomUUID()}.${contentType.split('/')[1] || 'jpg'}`;
      
      // Upload to Google Cloud Storage in the user-data folder
      const uploadedUrl = await googleCloudStorage.uploadBuffer(
        imageBuffer,
        {
          customName: filename,
          contentType,
          folder: 'user-data', // Explicitly using user-data folder
          isPublic: true
        }
      );
      
      console.log(`User profile image stored at: ${uploadedUrl}`);
      return uploadedUrl;
    } catch (error) {
      console.error('Error storing user profile image:', error);
      throw error;
    }
  }

  /**
   * Stores user account settings in the user-data folder
   * @param userId User ID
   * @param settings User settings data
   * @returns URL to the stored settings in cloud storage
   */
  public async storeUserSettings(userId: number, settings: any): Promise<string> {
    try {
      // Convert to JSON string
      const settingsJson = JSON.stringify(settings, null, 2);
      
      // Create a unique filename for the settings
      const filename = `settings-${userId}-${randomUUID()}.json`;
      
      // Upload to Google Cloud Storage in the user-data folder
      const uploadedUrl = await googleCloudStorage.uploadBuffer(
        Buffer.from(settingsJson),
        {
          customName: filename,
          contentType: 'application/json',
          folder: 'user-data', // Explicitly using user-data folder
          isPublic: false
        }
      );
      
      console.log(`User settings stored at: ${uploadedUrl}`);
      return uploadedUrl;
    } catch (error) {
      console.error('Error storing user settings:', error);
      throw error;
    }
  }
}

// Create a singleton instance
export const userDataSync = new UserDataSyncService();