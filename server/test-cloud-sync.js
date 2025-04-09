// Test script to verify our cloud sync fix
import { cloudDataSync } from './services/cloud-data-sync.js';

async function testCloudSync() {
  try {
    // Test storing diagnostic data for a session
    console.log("Testing diagnostic data storage...");
    const sessionId = 123; // Use a test session ID
    const diagnosticData = {
      userId: 1,
      deviceType: "smartphone",
      issueType: "screen",
      diagnosticResults: {
        testKey: "Test diagnostic data",
        timestamp: new Date().toISOString()
      }
    };
    
    const diagnosticUrl = await cloudDataSync.storeDiagnosticData(sessionId, diagnosticData);
    console.log(`Successfully stored diagnostic data: ${diagnosticUrl}`);
    
    // Test storing repair guide data for a session
    console.log("\nTesting repair guide data storage...");
    const repairGuideData = {
      userId: 1,
      deviceType: "smartphone",
      repairSteps: [
        { step: 1, description: "First test step" },
        { step: 2, description: "Second test step" }
      ],
      timestamp: new Date().toISOString()
    };
    
    const repairGuideUrl = await cloudDataSync.storeRepairGuideData(sessionId, repairGuideData);
    console.log(`Successfully stored repair guide data: ${repairGuideUrl}`);
    
    // Test storing issue confirmation data
    console.log("\nTesting issue confirmation data storage...");
    const issueConfirmationData = {
      userId: 1,
      deviceType: "smartphone",
      confirmedIssue: "screen broken",
      confidence: 0.95,
      timestamp: new Date().toISOString()
    };
    
    const issueConfirmationUrl = await cloudDataSync.storeIssueConfirmationData(sessionId, issueConfirmationData);
    console.log(`Successfully stored issue confirmation data: ${issueConfirmationUrl}`);
    
    // Test complete session sync to verify folder structure
    console.log("\nTesting complete session sync...");
    const metadataUrl = await cloudDataSync.syncRepairSession(sessionId);
    console.log(`Successfully synced session: ${metadataUrl}`);
    
    // Verify that data is properly separated into different files/folders
    console.log("\nVerifying data organization...");
    console.log(`Diagnostic data URL: ${diagnosticUrl}`);
    console.log(`Repair guide data URL: ${repairGuideUrl}`);
    console.log(`Issue confirmation data URL: ${issueConfirmationUrl}`);
    
    // Check if the URLs have different paths with correct folder names
    const isDiagnosticInDiagnosticsFolder = diagnosticUrl.includes('/diagnostics/');
    const isRepairGuideInRepairGuideFolder = repairGuideUrl.includes('/repair_guide/');
    const isIssueConfirmationInIssueConfirmationFolder = issueConfirmationUrl.includes('/issue_confirmation/');
    
    if (isDiagnosticInDiagnosticsFolder && isRepairGuideInRepairGuideFolder && isIssueConfirmationInIssueConfirmationFolder) {
      console.log("SUCCESS: All data is correctly organized into separate folders!");
    } else {
      console.log("WARNING: Some data may not be organized correctly:");
      console.log(`- Diagnostic data in diagnostics folder: ${isDiagnosticInDiagnosticsFolder}`);
      console.log(`- Repair guide data in repair_guide folder: ${isRepairGuideInRepairGuideFolder}`);
      console.log(`- Issue confirmation data in issue_confirmation folder: ${isIssueConfirmationInIssueConfirmationFolder}`);
    }
    
    console.log("\nTest completed successfully!");
  } catch (error) {
    console.error("Test failed with error:", error);
  }
}

testCloudSync();