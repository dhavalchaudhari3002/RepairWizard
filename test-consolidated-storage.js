/**
 * Test script for verifying the consolidated storage approach
 * 
 * This script creates a test session and stores data in the consolidated JSON file
 * for each phase of the repair journey.
 */

import { cloudDataSync } from './server/services/cloud-data-sync.js';

// Create a test session ID
const sessionId = Date.now(); // Use current timestamp as a unique ID
console.log(`Creating test session with ID: ${sessionId}`);

// Sample data for each phase of the repair journey
const initialSubmission = {
  deviceType: "Desktop Computer",
  deviceBrand: "Generic PC",
  deviceModel: "Home Build",
  issueDescription: "Computer will not turn on properly",
  symptoms: [
    "No power",
    "Power light flashes briefly",
    "No display"
  ],
  timestamp: new Date().toISOString(),
  userId: 1
};

const diagnosticData = {
  questions: [
    {
      id: 1,
      text: "Is the device turning on?",
      answer: "No"
    },
    {
      id: 2,
      text: "Do you see any lights?",
      answer: "Yes"
    }
  ],
  analysis: "Device power issue detected",
  confidence: 0.85,
  timestamp: new Date().toISOString(),
  userId: 1
};

const issueConfirmation = {
  confirmedIssue: "Power supply malfunction",
  symptoms: [
    "No power",
    "Flashing lights",
    "No boot"
  ],
  severity: "High",
  timestamp: new Date().toISOString(),
  userId: 1
};

const repairGuide = {
  title: "How to fix a power supply issue",
  steps: [
    {
      number: 1,
      instruction: "Unplug all cables",
      detail: "Ensure no power is connected"
    },
    {
      number: 2,
      instruction: "Open the case",
      detail: "Remove screws from the back panel"
    },
    {
      number: 3,
      instruction: "Check connections",
      detail: "Ensure all power cables are properly seated"
    }
  ],
  parts: [
    "Screwdriver",
    "New power supply (optional)"
  ],
  difficulty: "Medium",
  estimatedTime: "30 minutes",
  timestamp: new Date().toISOString(),
  userId: 1
};

async function runTest() {
  console.log("Starting consolidated storage test...");
  
  try {
    // First, store the initial submission
    console.log("Adding initial submission data...");
    const initialUrl = await cloudDataSync.storeInitialSubmissionData(sessionId, initialSubmission);
    console.log(`Initial submission stored at: ${initialUrl}`);
    
    // Then add diagnostic data
    console.log("Adding diagnostic data...");
    const diagnosticUrl = await cloudDataSync.storeDiagnosticData(sessionId, diagnosticData);
    console.log(`Diagnostic data stored at: ${diagnosticUrl}`);
    
    // Add issue confirmation
    console.log("Adding issue confirmation data...");
    const issueUrl = await cloudDataSync.storeIssueConfirmationData(sessionId, issueConfirmation);
    console.log(`Issue confirmation stored at: ${issueUrl}`);
    
    // Finally, add repair guide
    console.log("Adding repair guide data...");
    const repairUrl = await cloudDataSync.storeRepairGuideData(sessionId, repairGuide);
    console.log(`Repair guide stored at: ${repairUrl}`);
    
    // Create the consolidated file with all data in one request
    console.log("Creating consolidated file with all data...");
    const allData = {
      initialSubmissionData: initialSubmission,
      diagnosticData: diagnosticData,
      issueConfirmationData: issueConfirmation,
      repairGuideData: repairGuide
    };
    
    const consolidatedUrl = await cloudDataSync.storeConsolidatedSessionData(sessionId, allData);
    console.log(`Consolidated file created at: ${consolidatedUrl}`);
    
    console.log("\nTest completed successfully!");
    console.log(`All data for session #${sessionId} is now stored in consolidated format.`);
    
    return {
      sessionId,
      initialUrl,
      diagnosticUrl, 
      issueUrl,
      repairUrl,
      consolidatedUrl
    };
  } catch (error) {
    console.error("Error during consolidated storage test:", error);
    throw error;
  }
}

// Run the test
runTest()
  .then(results => {
    console.log("\nTest Results:", results);
    process.exit(0);
  })
  .catch(err => {
    console.error("\nTest Failed:", err);
    process.exit(1);
  });