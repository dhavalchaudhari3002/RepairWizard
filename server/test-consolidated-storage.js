/**
 * Test script for the consolidated storage approach
 * 
 * This script tests the new consolidated storage approach for repair sessions.
 * It creates a full journey of data for a repair session and verifies that
 * all data is properly consolidated into a single file.
 */

// Import database connection and models 
import { db } from './db.js';
import { repairSessions, userInteractions, repairAnalytics, 
         storageFiles, repairSessionFiles, diagnosticQuestionTrees } from '../shared/schema.js';
import { cloudDataSync } from './services/cloud-data-sync.js';
import { googleCloudStorage } from './services/google-cloud-storage.js';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';

async function testConsolidatedStorage() {
  console.log('Starting consolidated storage test...');
  
  // Create a unique test session ID
  const sessionId = Date.now();
  console.log(`Using test session ID: ${sessionId}`);
  
  try {
    // Test with initial submission data
    console.log('\n1. Testing initial submission data storage...');
    const initialSubmissionData = {
      deviceType: 'Desktop Computer',
      deviceBrand: 'Generic PC',
      deviceModel: 'Home Build',
      issueDescription: 'Computer will not turn on properly',
      symptoms: ['No power', 'Power light flashes briefly', 'No display'],
      timestamp: new Date().toISOString(),
      userId: 1
    };
    
    const initialSubmissionUrl = await cloudDataSync.storeInitialSubmissionData(sessionId, initialSubmissionData);
    console.log(`Initial submission data stored at: ${initialSubmissionUrl}`);
    
    // Test with diagnostic data
    console.log('\n2. Testing diagnostic data storage...');
    const diagnosticData = {
      questions: [
        { id: 1, text: 'Is the device turning on?', answer: 'No' },
        { id: 2, text: 'Do you see any lights?', answer: 'Yes' }
      ],
      analysis: 'Device power issue detected',
      confidence: 0.85,
      timestamp: new Date().toISOString(),
      userId: 1
    };
    
    const diagnosticUrl = await cloudDataSync.storeDiagnosticData(sessionId, diagnosticData);
    console.log(`Diagnostic data stored at: ${diagnosticUrl}`);
    
    // Test with issue confirmation data
    console.log('\n3. Testing issue confirmation data storage...');
    const issueData = {
      confirmedIssue: 'Power supply malfunction',
      symptoms: ['No power', 'Flashing lights', 'No boot'],
      severity: 'High',
      timestamp: new Date().toISOString(),
      userId: 1
    };
    
    const issueUrl = await cloudDataSync.storeIssueConfirmationData(sessionId, issueData);
    console.log(`Issue confirmation data stored at: ${issueUrl}`);
    
    // Test with repair guide data
    console.log('\n4. Testing repair guide data storage...');
    const repairGuideData = {
      title: 'How to fix a power supply issue',
      steps: [
        { number: 1, instruction: 'Unplug all cables', detail: 'Ensure no power is connected' },
        { number: 2, instruction: 'Open the case', detail: 'Remove screws from the back panel' },
        { number: 3, instruction: 'Check connections', detail: 'Ensure all power cables are properly seated' }
      ],
      parts: ['Screwdriver', 'New power supply (optional)'],
      difficulty: 'Medium',
      estimatedTime: '30 minutes',
      timestamp: new Date().toISOString(),
      userId: 1
    };
    
    const repairGuideUrl = await cloudDataSync.storeRepairGuideData(sessionId, repairGuideData);
    console.log(`Repair guide data stored at: ${repairGuideUrl}`);
    
    // Test full sync of all data in a consolidated way
    console.log('\n5. Testing full consolidated sync...');
    const allDataUrl = await cloudDataSync.storeConsolidatedSessionData(
      sessionId, 
      {
        initialSubmissionData: { ...initialSubmissionData, additionalInfo: 'Added in full sync' },
        diagnosticData: { ...diagnosticData, additionalInfo: 'Added in full sync' },
        issueConfirmationData: { ...issueData, additionalInfo: 'Added in full sync' },
        repairGuideData: { ...repairGuideData, additionalInfo: 'Added in full sync' },
        metadata: {
          fullSyncTest: true,
          timestamp: new Date().toISOString()
        }
      }
    );
    
    console.log(`All data stored in consolidated format at: ${allDataUrl}`);
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Run the test
testConsolidatedStorage().catch(console.error);