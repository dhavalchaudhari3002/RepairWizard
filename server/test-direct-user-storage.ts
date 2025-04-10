import { Express } from "express";
import { directUserStorage } from "./services/direct-user-storage";
import { randomUUID } from "crypto";

/**
 * Add test routes to demonstrate direct user storage to Google Cloud
 * without using the local database
 */
export function addDirectUserStorageTestRoutes(app: Express) {
  // Test route to create a user directly in Google Cloud Storage
  app.post("/api/test/direct-user-storage", async (req, res) => {
    try {
      console.log("Testing direct user storage to Google Cloud");

      // Generate test user data
      const testUserId = randomUUID().substring(0, 8);
      const testUserData = {
        firstName: `Test${testUserId}`,
        lastName: "User",
        email: `test-user-${testUserId}@example.com`,
        password: "TestPassword123!",
        tosAccepted: true
      };

      console.log("Creating test user:", { ...testUserData, password: "[REDACTED]" });

      // Store user directly in Google Cloud
      const userData = await directUserStorage.createUser(testUserData);

      console.log("User stored directly in Google Cloud Storage:", userData);

      // Return the user data and cloud storage URL
      return res.status(201).json({
        message: "User successfully created directly in Google Cloud Storage",
        userData: {
          id: userData.id,
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          role: userData.role,
        },
        cloudStorageUrl: userData.cloudStorageUrl
      });
    } catch (error) {
      console.error("Error in direct user storage test:", error);
      return res.status(500).json({
        message: "Failed to test direct user storage",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Test route to check if a user exists by email
  app.get("/api/test/direct-user-storage/:email", async (req, res) => {
    try {
      const { email } = req.params;
      
      console.log(`Testing look up of user by email: ${email}`);
      
      // Check if user exists in Google Cloud Storage
      const user = await directUserStorage.getUserByEmail(email);
      
      if (!user) {
        return res.status(404).json({
          message: "User not found in Google Cloud Storage"
        });
      }
      
      // Return user data without sensitive information
      const { password, ...safeUserData } = user;
      
      return res.status(200).json({
        message: "User found in Google Cloud Storage",
        userData: safeUserData
      });
    } catch (error) {
      console.error("Error looking up user by email:", error);
      return res.status(500).json({
        message: "Failed to look up user",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  console.log("Direct user storage test routes registered");
}