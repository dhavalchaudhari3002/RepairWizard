/**
 * Test script to verify metadata_url field in database works correctly
 */

import { cloudDataSync } from './server/services/cloud-data-sync';
import { db } from './server/db';
import { repairSessions, users } from './shared/schema';
import { eq } from 'drizzle-orm';

async function testDatabaseMetadataUrl() {
  console.log('Testing storing repair session data with metadataUrl...');
  
  // Create a new test session ID (random high number to avoid conflicts)
  const sessionId = Math.floor(900000 + Math.random() * 100000);
  const userId = 999999; // Use a high number for test user ID
  
  try {
    // First, create a test user for our session
    console.log(`Creating test user with ID: ${userId}`);
    
    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));
      
    if (existingUser.length === 0) {
      await db.insert(users).values({
        id: userId,
        firstName: 'Test',
        lastName: 'User',
        email: `test-${userId}@example.com`,
        password: 'Password123!',
        role: 'customer',
        emailVerified: true,
        tosAccepted: true
      });
      console.log(`Created test user #${userId}`);
    } else {
      console.log(`Test user #${userId} already exists`);
    }
    
    // Now insert a test session
    console.log(`Creating test repair session with ID: ${sessionId}`);
    
    await db.insert(repairSessions).values({
      id: sessionId,
      userId: userId, // Use our test user
      deviceType: 'Test Device',
      deviceBrand: 'Test Brand',
      deviceModel: 'Test Model',
      issueDescription: 'Test issue for metadata URL feature',
      status: 'started',
      symptoms: ['Test symptom'],
    });
    
    console.log(`Test session created successfully`);
    
    // Now store some consolidated data for this session
    const testData = {
      deviceType: 'Test Device',
      deviceBrand: 'Test Brand',
      deviceModel: 'Test Model',
      issueDescription: 'Test issue for metadata URL feature',
      symptoms: ['Test symptom'],
    };
    
    console.log(`Storing consolidated data for session ID: ${sessionId}`);
    const url = await cloudDataSync.storeConsolidatedSessionData(sessionId, { 
      initialSubmissionData: testData 
    });
    
    console.log(`Successfully stored session data with URL: ${url}`);
    
    // Check if metadataUrl was correctly stored in the database
    console.log(`Retrieving session from database to verify metadataUrl column...`);
    const [updatedSession] = await db
      .select()
      .from(repairSessions)
      .where(eq(repairSessions.id, sessionId));
      
    if (updatedSession && updatedSession.metadataUrl) {
      console.log(`SUCCESS: Session has metadataUrl set to: ${updatedSession.metadataUrl}`);
      console.log(`Test completed successfully!`);
    } else {
      console.log(`Current session data:`, updatedSession);
      
      if (updatedSession && !updatedSession.metadataUrl) {
        console.log(`WARNING: Session exists but metadataUrl is ${updatedSession.metadataUrl}`);
        
        // Try to update it directly
        console.log(`Attempting to directly update metadataUrl field...`);
        await db
          .update(repairSessions)
          .set({ metadataUrl: url })
          .where(eq(repairSessions.id, sessionId));
          
        // Check again
        const [reUpdatedSession] = await db
          .select()
          .from(repairSessions)
          .where(eq(repairSessions.id, sessionId));
          
        if (reUpdatedSession && reUpdatedSession.metadataUrl) {
          console.log(`SUCCESS: Direct update worked. metadataUrl set to: ${reUpdatedSession.metadataUrl}`);
          console.log(`Test completed successfully!`);
        } else {
          console.log(`FAILED: Direct update failed, metadataUrl still not set.`);
          throw new Error('metadataUrl field could not be set');
        }
      } else {
        console.log(`FAILED: Could not retrieve test session from database`);
        throw new Error('Session not found');
      }
    }
  } catch (error) {
    console.error('Test failed with error:', error);
  } finally {
    // Clean up test data
    try {
      // First clean up the session (which has a foreign key to user)
      await db.delete(repairSessions).where(eq(repairSessions.id, sessionId));
      console.log(`Cleaned up test session #${sessionId}`);
      
      // Now clean up the test user
      await db.delete(users).where(eq(users.id, userId));
      console.log(`Cleaned up test user #${userId}`);
    } catch (cleanupError) {
      console.error('Error cleaning up test data:', cleanupError);
    }
  }
}

testDatabaseMetadataUrl();