// Test script for error tracking
import { trackError } from './services/error-tracking';
import { db } from './db';
import { errors } from '@shared/schema';

// Ensure the error tracking service is capturing all data correctly
async function testErrorTracking() {
  try {
    console.log("Testing enhanced error tracking...");
    
    // Create an error with stack trace
    const error = new Error("Test error for tracking");
    error.name = "TestError";
    
    // Add context data with valid user ID
    const context = {
      userId: 26, // Valid user ID from the database
      path: "/api/test",
      requestId: "test-request-123",
      userAgent: "Test User Agent",
      component: "ErrorTrackingTest",
      severity: "low" as const,
      metadata: {
        testField: "This is a test",
        someData: {
          nested: true,
          count: 42
        },
        // Add some sample PII to test redaction
        email: "test@example.com",
        token: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ"
      }
    };
    
    console.log("Tracking error through service...");
    await trackError(error, context);
    
    console.log("Adding a direct test record...");
    // Also add a direct test record to the database to verify schema
    await db.insert(errors).values({
      message: "Direct test error for database",
      type: "DirectTestError",
      stack: error.stack,
      userId: 1,
      path: "/api/direct-test",
      requestId: "direct-test-123",
      userAgent: "Direct Test User Agent",
      environment: "test",
      version: "1.0.0-test",
      severity: "low",
      component: "DirectErrorTest",
      metadata: { direct: true, test: "Database insert" },
      resolved: false,
      timestamp: new Date()
    });
    
    console.log("Error tracking tests completed successfully.");
    
  } catch (error) {
    console.error("Error in test:", error);
  }
}

// Run the test
testErrorTracking();