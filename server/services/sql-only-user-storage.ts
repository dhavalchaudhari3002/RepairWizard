import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import { db } from '../db'; 
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Service for storing user data entirely in SQL database
 * - All user data is stored in PostgreSQL (Google Cloud SQL)
 * - Only repair-related data remains in Cloud Storage buckets
 */
export class SQLOnlyUserStorageService {
  // Track active sessions in memory for performance
  private activeUsers = new Map<string, any>();
  
  /**
   * Create a new user with SQL-only storage
   * @param userData User registration data
   * @returns Object with user data
   */
  public async createUser(userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role?: string;
    tosAccepted: boolean;
    // Optional profile fields
    phone?: string;
    address?: string;
    preferences?: any;
    settings?: any;
  }): Promise<{
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  }> {
    try {
      console.log("Creating user with SQL-only storage approach");
      
      // Check if user already exists
      const existingUser = await this.getUserByEmail(userData.email);
      if (existingUser) {
        throw new Error(`User with email ${userData.email} already exists`);
      }
      
      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);
      
      // Extract profile data into a JSON object that can be stored in SQL
      const profileData = {
        // Contact info
        phone: userData.phone || '',
        address: userData.address || '',
        // Preferences
        preferences: userData.preferences || {
          receiveMarketingEmails: false,
          darkMode: false,
          pushNotifications: true
        },
        // Settings
        settings: userData.settings || {
          language: 'en',
          timezone: 'UTC'
        }
      };
      
      // Store user data in SQL database as JSON
      const profileJson = JSON.stringify(profileData);
      
      // Now store user data in SQL database
      const newUser = await db.insert(users).values({
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email.toLowerCase(),
        password: hashedPassword,
        role: userData.role || 'customer',
        emailVerified: false,
        verificationToken: randomUUID(),
        tosAccepted: userData.tosAccepted,
        profileData: profileJson // Store all profile data as JSON in SQL
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
        role: newUser[0].role
      };
    } catch (error) {
      console.error('Error creating user with SQL-only storage:', error);
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
      
      // Parse profile data JSON if it exists
      if (user[0].profileData) {
        try {
          user[0].profileData = JSON.parse(user[0].profileData);
        } catch (err) {
          console.warn(`Error parsing profile data for user ${user[0].id}:`, err);
          user[0].profileData = {};
        }
      } else {
        user[0].profileData = {};
      }
      
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
      
      // Parse profile data JSON if it exists
      if (user[0].profileData) {
        try {
          user[0].profileData = JSON.parse(user[0].profileData);
        } catch (err) {
          console.warn(`Error parsing profile data for user ${user[0].id}:`, err);
          user[0].profileData = {};
        }
      } else {
        user[0].profileData = {};
      }
      
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
   * Get user profile data
   * @param userId User ID
   * @returns User profile data
   */
  public async getProfile(userId: number): Promise<any | null> {
    try {
      console.log(`Fetching profile for user ID: ${userId}`);
      
      // Get the user from database
      const user = await this.getUserById(userId);
      
      if (!user) {
        console.log(`User not found for ID: ${userId}`);
        return null;
      }
      
      // Return the profile data
      return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        ...user.profileData // Spread parsed profile data
      };
    } catch (error) {
      console.error('Error getting profile:', error);
      console.error(error instanceof Error ? error.stack : String(error));
      return null;
    }
  }
  
  /**
   * Update user profile data in SQL database
   * @param userId User ID
   * @param profileData Updated profile data
   * @returns Updated user profile
   */
  public async updateProfile(userId: number, profileData: any): Promise<any | null> {
    try {
      console.log(`Updating profile for user ID: ${userId}`);
      
      // Get the user from database
      const user = await this.getUserById(userId);
      
      if (!user) {
        console.log(`User not found for ID: ${userId}`);
        return null;
      }
      
      // Merge existing and new profile data
      const existingProfileData = user.profileData || {};
      const mergedProfileData = {
        ...existingProfileData,
        ...profileData,
        // Add metadata for tracking
        _metadata: {
          lastUpdated: new Date().toISOString()
        }
      };
      
      // Convert to string for storage
      const profileJson = JSON.stringify(mergedProfileData);
      
      // Update the user in the database
      await db.update(users)
        .set({ 
          profileData: profileJson,
          // Update any top-level fields if provided
          ...(profileData.firstName && { firstName: profileData.firstName }),
          ...(profileData.lastName && { lastName: profileData.lastName }),
          ...(profileData.email && { email: profileData.email.toLowerCase() })
        })
        .where(eq(users.id, userId));
      
      console.log(`Updated profile in database for user ID: ${userId}`);
      
      // Clear the cache to ensure fresh data
      this.activeUsers.delete(userId.toString());
      this.activeUsers.delete(user.email.toLowerCase());
      
      // Fetch the updated user
      const updatedUser = await this.getUserById(userId);
      
      // Return the updated profile
      return {
        id: updatedUser.id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        role: updatedUser.role,
        emailVerified: updatedUser.emailVerified,
        ...updatedUser.profileData // Spread parsed profile data
      };
    } catch (error) {
      console.error('Error updating profile:', error);
      console.error(error instanceof Error ? error.stack : String(error));
      return null;
    }
  }
  
  /**
   * Update user password
   * @param userId User ID
   * @param currentPassword Current password
   * @param newPassword New password
   * @returns Success status
   */
  public async updatePassword(userId: number, currentPassword: string, newPassword: string): Promise<boolean> {
    try {
      console.log(`Updating password for user ID: ${userId}`);
      
      // Get the user from database
      const user = await this.getUserById(userId);
      
      if (!user) {
        console.log(`User not found for ID: ${userId}`);
        return false;
      }
      
      // Verify current password
      const passwordValid = await bcrypt.compare(currentPassword, user.password);
      
      if (!passwordValid) {
        console.log(`Current password invalid for user ID: ${userId}`);
        return false;
      }
      
      // Hash the new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      
      // Update the password in the database
      await db.update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, userId));
      
      console.log(`Password updated for user ID: ${userId}`);
      
      // Clear the cache to ensure fresh data
      this.activeUsers.delete(userId.toString());
      this.activeUsers.delete(user.email.toLowerCase());
      
      return true;
    } catch (error) {
      console.error('Error updating password:', error);
      console.error(error instanceof Error ? error.stack : String(error));
      return false;
    }
  }
}

// Create a singleton instance
export const sqlOnlyUserStorage = new SQLOnlyUserStorageService();