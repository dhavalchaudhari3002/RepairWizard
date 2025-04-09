// This is a simplified test script for the consolidated storage
// that doesn't require database connections

// Import filesystem and node:path modules
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define a path for storing the consolidated file
const storagePath = path.join(__dirname, 'consolidated-test');

// Create the directory if it doesn't exist
if (!fs.existsSync(storagePath)) {
  fs.mkdirSync(storagePath, { recursive: true });
}

// Create a session ID based on timestamp
const sessionId = Date.now();
console.log(`Using test session ID: ${sessionId}`);

// Create initial submission data
const initialSubmission = {
  deviceType: 'Desktop Computer',
  deviceBrand: 'Generic PC',
  deviceModel: 'Home Build',
  issueDescription: 'Computer will not turn on properly',
  symptoms: ['No power', 'Power light flashes briefly', 'No display'],
  timestamp: new Date().toISOString(),
  userId: 1
};

// Create diagnostic data
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

// Create issue confirmation data
const issueData = {
  confirmedIssue: 'Power supply malfunction',
  symptoms: ['No power', 'Flashing lights', 'No boot'],
  severity: 'High',
  timestamp: new Date().toISOString(),
  userId: 1
};

// Create repair guide data
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

// Create a consolidated data structure
const consolidatedData = {
  sessionId,
  timestamp: new Date().toISOString(),
  initialSubmission,
  diagnostics: [diagnosticData],
  issueConfirmation: issueData,
  repairGuide: repairGuideData,
  interactions: [],
  analytics: [],
  metadata: {
    version: '1.0',
    source: 'repair-ai-assistant-test',
    syncTimestamp: new Date().toISOString(),
    aiTrainingReady: true
  }
};

// Save the consolidated data to a file
const filePath = path.join(storagePath, `session_${sessionId}.json`);
fs.writeFileSync(filePath, JSON.stringify(consolidatedData, null, 2));

console.log(`Consolidated data saved to: ${filePath}`);
console.log('Test completed successfully!');

// Display the content structure (not the entire content)
console.log('\nConsolidated file structure:');
// Function to sanitize object for display
function sanitizeForDisplay(obj, level = 0, maxLevel = 2) {
  if (level >= maxLevel) {
    return typeof obj === 'object' && obj !== null 
      ? Array.isArray(obj) 
        ? `[Array: ${obj.length} items]` 
        : `{Object: ${Object.keys(obj).length} keys}`
      : obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.length > 2
      ? [
          sanitizeForDisplay(obj[0], level + 1, maxLevel),
          `... ${obj.length - 2} more items ...`,
          sanitizeForDisplay(obj[obj.length - 1], level + 1, maxLevel)
        ]
      : obj.map(item => sanitizeForDisplay(item, level + 1, maxLevel));
  } else if (typeof obj === 'object' && obj !== null) {
    const result = {};
    for (const key of Object.keys(obj)) {
      result[key] = sanitizeForDisplay(obj[key], level + 1, maxLevel);
    }
    return result;
  }
  
  return obj;
}

console.log(JSON.stringify(sanitizeForDisplay(consolidatedData), null, 2));