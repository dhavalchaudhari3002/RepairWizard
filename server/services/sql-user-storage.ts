import { randomUUID } from 'crypto';
import { googleCloudStorage } from './google-cloud-storage';
import * as bcrypt from 'bcrypt';
import { db } from '../db'; 
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Service for storing user data in SQL database with hybrid approach
 * - Core user data is stored in PostgreSQL
 * - Extended user data is stored in Google Cloud Storage
 * - The path to cloud storage is stored in the database
 */
export class SQLUserStorageService {
  // Track active sessions in memory
  private activeUsers = new Map<string, any>();
  
  /**
   * Create a new user with hybrid storage approach
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
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    cloudStorageUrl: string;
  }> {
    try {
      console.log("Creating user with SQL + Cloud Storage hybrid approach");
      
      // Check if user already exists
      const existingUser = await this.getUserByEmail(userData.email);
      if (existingUser) {
        throw new Error(`User with email ${userData.email} already exists`);
      }
      
      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);
      
      // Create extended profile data for Cloud Storage
      const extendedProfileData = {
        // Basic info (will be duplicated in SQL for performance)
        email: userData.email.toLowerCase(),
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role || 'customer',
        // Extended info that's only in cloud storage
        preferences: {
          // Default preferences
          receiveMarketingEmails: false,
          darkMode: false,
          pushNotifications: true
        },
        settings: {
          language: 'en',
          timezone: 'UTC'
        },
        // Add metadata fields for easier searching/filtering in cloud storage
        _metadata: {
          dataType: 'user-profile',
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
      };
      
      // Generate a unique file name for cloud storage
      const profileId = randomUUID();
      
      // Upload extended profile data to Google Cloud Storage
      const cloudStorageUrl = await googleCloudStorage.uploadBuffer(
        Buffer.from(JSON.stringify(extendedProfileData, null, 2)),
        {
          customName: `user-profile-${profileId}.json`,
          contentType: 'application/json',
          folder: 'user-data', // Store in user-data folder
          isPublic: false
        }
      );
      
      console.log(`Extended profile data stored in cloud storage at: ${cloudStorageUrl}`);
      
      // Now store core user data in SQL database
      const newUser = await db.insert(users).values({
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email.toLowerCase(),
        password: hashedPassword,
        role: userData.role || 'customer',
        emailVerified: false,
        verificationToken: randomUUID(),
        tosAccepted: userData.tosAccepted,
        metadata_url: cloudStorageUrl // Store the URL to cloud storage data
      }).returning();
      
      console.log(`User created in SQL database with ID: ${newUser[0].id}`);
      
      // Store in memory cache (without password)
      const { password, ...safeUser } = newUser[0];
      this.activeUsers.set(newUser[0].id.toString(), safeUser);
      this.activeUsers.set(userData.email.toLowerCase(), safeUser);
      
      // Return user information without sensitive data
      return {
        id: newUser[0].id,
        email: newUser[0].email,
        firstName: newUser[0].firstName,
        lastName: newUser[0].lastName,
        role: newUser[0].role,
        cloudStorageUrl
      };
    } catch (error) {
      console.error('Error creating user with hybrid storage:', error);
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
      console.log(`Looking up user with email: ${lowerEmail}`);
      
      // Check memory cache first
      if (this.activeUsers.has(lowerEmail)) {
        console.log(`User found in memory cache: ${lowerEmail}`);
        return this.activeUsers.get(lowerEmail);
      }
      
      // Query SQL database for the user
      console.log(`User not in memory cache, searching SQL database for: ${lowerEmail}`);
      const user = await db.select().from(users).where(eq(users.email, lowerEmail));
      
      if (user.length === 0) {
        console.log(`User not found in SQL database: ${lowerEmail}`);
        return undefined;
      }
      
      console.log(`User found in SQL database: ${lowerEmail}, ID: ${user[0].id}`);
      
      // Cache the user for future lookups
      this.activeUsers.set(user[0].id.toString(), user[0]);
      this.activeUsers.set(lowerEmail, user[0]);
      
      return user[0];
    } catch (error) {
      console.error('Error finding user by email:', error);
      console.error(error instanceof Error ? error.stack : String(error));
      throw error;
    }
  }
  
  /**
   * Get a user by ID
   * @param id User ID
   * @returns User data if found, undefined otherwise
   */
  public async getUserById(id: number): Promise<any | undefined> {
    try {
      console.log(`Looking up user with ID: ${id}`);
      
      // Check memory cache first
      if (this.activeUsers.has(id.toString())) {
        console.log(`User found in memory cache: ${id}`);
        return this.activeUsers.get(id.toString());
      }
      
      // Query SQL database for the user
      console.log(`User not in memory cache, searching SQL database for ID: ${id}`);
      const user = await db.select().from(users).where(eq(users.id, id));
      
      if (user.length === 0) {
        console.log(`User not found in SQL database: ${id}`);
        return undefined;
      }
      
      console.log(`User found in SQL database: ${id}`);
      
      // Cache the user for future lookups
      this.activeUsers.set(id.toString(), user[0]);
      this.activeUsers.set(user[0].email.toLowerCase(), user[0]);
      
      return user[0];
    } catch (error) {
      console.error('Error finding user by ID:', error);
      console.error(error instanceof Error ? error.stack : String(error));
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
      console.log(`Validating credentials for email: ${email}`);
      
      // Get the user data
      const user = await this.getUserByEmail(email);
      
      // If user not found, return null
      if (!user) {
        console.log(`User with email ${email} not found`);
        return null;
      }
      
      console.log(`User found, comparing passwords for: ${email}`);
      
      // Verify password
      const passwordValid = await bcrypt.compare(password, user.password);
      
      console.log(`Password validation result for ${email}: ${passwordValid}`);
      
      if (!passwordValid) {
        return null;
      }
      
      // Return user data without password
      const { password: _, ...safeUser } = user;
      console.log(`Returning authenticated user data for: ${email}`, safeUser);
      return safeUser;
    } catch (error) {
      console.error('Error validating credentials:', error);
      console.error(error instanceof Error ? error.stack : String(error));
      throw error;
    }
  }
  
  /**
   * Get extended profile data from cloud storage
   * @param userId User ID
   * @returns Extended profile data
   */
  public async getExtendedProfile(userId: number): Promise<any | null> {
    try {
      console.log(`Fetching extended profile for user ID: ${userId}`);
      
      // Get the user from database
      const user = await this.getUserById(userId);
      
      if (!user || !user.metadata_url) {
        console.log(`No metadata URL found for user ID: ${userId}`);
        return null;
      }
      
      console.log(`Fetching extended profile from: ${user.metadata_url}`);
      
      // Extract the file name from the metadata URL
      const fileName = user.metadata_url.split('/').pop();
      
      if (!fileName) {
        console.error(`Invalid metadata URL format: ${user.metadata_url}`);
        return null;
      }
      
      // Get the file from Google Cloud Storage
      const [files] = await googleCloudStorage.storage
        .bucket(googleCloudStorage.bucketName)
        .getFiles({ prefix: 'user-data/' });
      
      // Find the profile file
      for (const file of files) {
        if (file.name.endsWith(fileName)) {
          console.log(`Found extended profile file: ${file.name}`);
          
          // Download and parse the file content
          const [content] = await file.download();
          
          try {
            const profileData = JSON.parse(content.toString());
            console.log(`Successfully parsed extended profile data for user ID: ${userId}`);
            return profileData;
          } catch (parseError) {
            console.error(`Error parsing JSON from ${file.name}:`, parseError);
            console.error(`File content: ${content.toString().substring(0, 200)}...`);
            return null;
          }
        }
      }
      
      console.log(`Extended profile file not found for user ID: ${userId}`);
      return null;
    } catch (error) {
      console.error('Error getting extended profile:', error);
      console.error(error instanceof Error ? error.stack : String(error));
      return null;
    }
  }
  
  /**
   * Update extended profile data in cloud storage
   * @param userId User ID
   * @param profileData Updated profile data
   * @returns Updated cloud storage URL
   */
  public async updateExtendedProfile(userId: number, profileData: any): Promise<string | null> {
    try {
      console.log(`Updating extended profile for user ID: ${userId}`);
      
      // Get the user from database
      const user = await this.getUserById(userId);
      
      if (!user) {
        console.log(`User not found for ID: ${userId}`);
        return null;
      }
      
      // Add metadata for tracking
      profileData._metadata = {
        dataType: 'user-profile',
        timestamp: new Date().toISOString(),
        version: '1.0',
        lastUpdated: new Date().toISOString()
      };
      
      // Generate a file name using the existing one or creating a new one
      let fileName = 'user-profile-' + randomUUID() + '.json';
      if (user.metadata_url) {
        const existingFileName = user.metadata_url.split('/').pop();
        if (existingFileName) {
          fileName = existingFileName;
        }
      }
      
      // Upload to Google Cloud Storage
      const cloudStorageUrl = await googleCloudStorage.uploadBuffer(
        Buffer.from(JSON.stringify(profileData, null, 2)),
        {
          customName: fileName,
          contentType: 'application/json',
          folder: 'user-data',
          isPublic: false
        }
      );
      
      console.log(`Updated extended profile uploaded to: ${cloudStorageUrl}`);
      
      // Update the metadata URL in database if it changed
      if (cloudStorageUrl !== user.metadata_url) {
        await db.update(users).set({ metadata_url: cloudStorageUrl }).where(eq(users.id, userId));
        console.log(`Updated metadata_url in database for user ID: ${userId}`);
      }
      
      return cloudStorageUrl;
    } catch (error) {
      console.error('Error updating extended profile:', error);
      console.error(error instanceof Error ? error.stack : String(error));
      return null;
    }
  }
}

// Create a singleton instance
export const sqlUserStorage = new SQLUserStorageService();