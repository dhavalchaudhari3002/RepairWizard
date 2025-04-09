import { db } from '../db';
import { 
  repairSessions, 
  repairSessionFiles, 
  diagnosticQuestionTrees,
  userInteractions,
  repairAnalytics,
  storageFiles, 
  type RepairSession,
  type RepairSessionFile,
  type UserInteraction,
  type RepairAnalytics,
  type DiagnosticQuestionTree,
  type StorageFile
} from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Create a permanent local directory for data storage
// This will be in the app's root directory to ensure persistence
const LOCAL_STORAGE_DIR = path.join(process.cwd(), 'repair_data');
try {
  if (!fs.existsSync(LOCAL_STORAGE_DIR)) {
    fs.mkdirSync(LOCAL_STORAGE_DIR, { recursive: true });
    console.log(`Created local data storage directory: ${LOCAL_STORAGE_DIR}`);
  }
} catch (err) {
  console.error('Failed to create local storage directory for data sync:', err);
}

/**
 * LocalDataStorage Service
 * 
 * This service stores all application data in the local filesystem
 * to create a comprehensive dataset for future AI model training.
 * 
 * It provides methods to:
 * 1. Store entire repair journeys in a single consolidated file per session
 * 2. Create new files with unique names for each repair session
 * 3. Organize data for future AI training
 */
export class LocalDataStorageService {
  // Track the sessions we've processed to avoid duplicates
  private processedSessions = new Set<number>();
  
  /**
   * Store all data for a repair session in a single consolidated file
   * This creates a new file with a unique name for each repair session
   * @param sessionId The ID of the repair session
   * @param additionalData Optional additional data to include in the consolidated file
   * @returns The path to the stored file
   */
  async storeConsolidatedSessionData(sessionId: number, additionalData: Record<string, any> = {}): Promise<string> {
    try {
      console.log(`Creating consolidated data file for repair session #${sessionId}`);
      
      // Skip if we've already processed this session
      if (this.processedSessions.has(sessionId)) {
        console.log(`Session #${sessionId} has already been processed in this server process, using existing data`);
      } else {
        this.processedSessions.add(sessionId);
        console.log(`Added session #${sessionId} to tracked sessions`);
      }
      
      // Get all data related to this session from the database
      const [repairSession] = await db
        .select()
        .from(repairSessions)
        .where(eq(repairSessions.id, sessionId));
        
      if (!repairSession) {
        throw new Error(`Repair session #${sessionId} not found in database`);
      }
      
      // Get files, interactions, and analytics data
      const sessionFiles = await db
        .select()
        .from(repairSessionFiles)
        .where(eq(repairSessionFiles.repairSessionId, sessionId));
        
      const interactions = await db
        .select()
        .from(userInteractions)
        .where(eq(userInteractions.repairRequestId, sessionId));
        
      const analytics = await db
        .select()
        .from(repairAnalytics)
        .where(eq(repairAnalytics.repairRequestId, sessionId));
        
      // Create a comprehensive data structure with all session data
      // The structure follows a simplified format that's AI training-friendly
      const consolidatedData: Record<string, any> = {
        sessionId,
        timestamp: new Date().toISOString(),
        initialSubmission: {
          deviceType: repairSession.deviceType || '',
          deviceBrand: repairSession.deviceBrand || '',
          deviceModel: repairSession.deviceModel || '',
          issueDescription: repairSession.issueDescription || '',
          symptoms: repairSession.symptoms || [],
          timestamp: repairSession.createdAt || new Date().toISOString(),
          userId: repairSession.userId || 1
        },
        diagnostics: [] as any[],  // Will be populated with diagnostic data
        issueConfirmation: {},  // Will be populated with issue confirmation data
        repairGuide: {},  // Will be populated with repair guide data
        interactions: interactions || [],
        analytics: analytics || [],
        metadata: {
          version: '1.0',
          source: 'repair-ai-assistant',
          storageTimestamp: new Date().toISOString(),
          aiTrainingReady: true
        }
      };
      
      // Add any additional data that was passed in
      if (additionalData.initialSubmissionData) {
        consolidatedData.initialSubmission = additionalData.initialSubmissionData;
      }
      
      if (additionalData.diagnosticData) {
        consolidatedData.diagnostics = [additionalData.diagnosticData];
      }
      
      if (additionalData.issueConfirmationData) {
        consolidatedData.issueConfirmation = additionalData.issueConfirmationData;
      }
      
      if (additionalData.repairGuideData) {
        consolidatedData.repairGuide = additionalData.repairGuideData;
      }
      
      // Create a folder for this session
      const sessionFolder = path.join(LOCAL_STORAGE_DIR, `session_${sessionId}`);
      if (!fs.existsSync(sessionFolder)) {
        fs.mkdirSync(sessionFolder, { recursive: true });
        console.log(`Created folder for session #${sessionId}: ${sessionFolder}`);
      }
      
      // Generate a unique filename with timestamp and sessionId
      const timestamp = Date.now();
      const uuid = randomUUID().slice(0, 8); // Use part of the UUID for shorter filenames
      const filename = `session_${sessionId}_${timestamp}_${uuid}.json`;
      const filePath = path.join(sessionFolder, filename);
      
      // Write the consolidated data to the file
      fs.writeFileSync(filePath, JSON.stringify(consolidatedData, null, 2));
      
      console.log(`Successfully stored consolidated data for session #${sessionId}: ${filePath}`);
      
      // Create a file URL (for compatibility with the existing code)
      const fileUrl = `file://${filePath}`;
      
      // Update the database to record this file
      try {
        const result = await db.insert(storageFiles).values({
          userId: repairSession.userId || 1,
          fileName: filename,
          originalName: filename,
          fileUrl: fileUrl,
          contentType: 'application/json',
          folder: `session_${sessionId}`,
          fileSize: JSON.stringify(consolidatedData).length,
          metadata: {
            sessionId,
            type: 'consolidated_data',
            timestamp: new Date().toISOString()
          }
        }).returning({ id: storageFiles.id });
        
        if (result && result.length > 0) {
          // Link the file to the repair session
          await db.insert(repairSessionFiles).values({
            repairSessionId: sessionId,
            userId: repairSession.userId || 1,
            storageFileId: result[0].id,
            filePurpose: 'consolidated_data',
            stepName: 'all',
            fileName: filename,
            fileUrl: fileUrl,
            contentType: 'application/json'
          });
          console.log(`Recorded consolidated data file in database for session #${sessionId}`);
        }
      } catch (dbError) {
        console.error(`Failed to record consolidated file in database: ${dbError}`);
        console.log(`This is not critical - the file is still stored locally at: ${filePath}`);
      }
      
      return fileUrl;
    } catch (error) {
      console.error(`Error creating consolidated data for session #${sessionId}: ${error}`);
      return `error://failed-to-save-${Date.now()}`;
    }
  }
  
  /**
   * Store diagnostic data for a repair session
   * @param sessionId The ID of the repair session
   * @param diagnosticData The diagnostic data to store
   * @returns The path to the stored file
   */
  async storeDiagnosticData(sessionId: number, diagnosticData: any): Promise<string> {
    try {
      console.log(`Storing diagnostic data for repair session #${sessionId}`);
      return this.storeConsolidatedSessionData(sessionId, { 
        diagnosticData
      });
    } catch (error) {
      console.error(`Error storing diagnostic data for session #${sessionId}: ${error}`);
      return `error://failed-to-save-diagnostic-${Date.now()}`;
    }
  }
  
  /**
   * Store issue confirmation data for a repair session
   * @param sessionId The ID of the repair session
   * @param issueData The issue confirmation data to store
   * @returns The path to the stored file
   */
  async storeIssueConfirmationData(sessionId: number, issueData: any): Promise<string> {
    try {
      console.log(`Storing issue confirmation data for repair session #${sessionId}`);
      return this.storeConsolidatedSessionData(sessionId, { 
        issueConfirmationData: issueData 
      });
    } catch (error) {
      console.error(`Error storing issue confirmation data for session #${sessionId}: ${error}`);
      return `error://failed-to-save-issue-confirmation-${Date.now()}`;
    }
  }
  
  /**
   * Store repair guide data for a repair session
   * @param sessionId The ID of the repair session
   * @param repairGuideData The repair guide data to store
   * @returns The path to the stored file
   */
  async storeRepairGuideData(sessionId: number, repairGuideData: any): Promise<string> {
    try {
      console.log(`Storing repair guide data for repair session #${sessionId}`);
      return this.storeConsolidatedSessionData(sessionId, { 
        repairGuideData 
      });
    } catch (error) {
      console.error(`Error storing repair guide data for session #${sessionId}: ${error}`);
      return `error://failed-to-save-repair-guide-${Date.now()}`;
    }
  }
  
  /**
   * Store initial submission data for a repair session
   * @param sessionId The ID of the repair session
   * @param initialData The initial submission data to store
   * @returns The path to the stored file
   */
  async storeInitialSubmissionData(sessionId: number, initialData: any): Promise<string> {
    try {
      console.log(`Storing initial submission data for repair session #${sessionId}`);
      
      // Add timestamp if not present
      if (!initialData.timestamp) {
        initialData.timestamp = new Date().toISOString();
      }
      
      return this.storeConsolidatedSessionData(sessionId, { 
        initialSubmissionData: initialData 
      });
    } catch (error) {
      console.error(`Error storing initial submission data for session #${sessionId}: ${error}`);
      return `error://failed-to-save-initial-submission-${Date.now()}`;
    }
  }
  
  /**
   * Store user interaction data
   * @param interaction The user interaction data to store
   * @returns The path to the stored file, or null if no repair request ID is available
   */
  async storeInteractionData(interaction: UserInteraction): Promise<string | null> {
    try {
      // Skip if no repair request ID is available
      if (!interaction.repairRequestId) {
        console.log(`Skipping interaction storage - no repair request ID available`);
        return null;
      }
      
      console.log(`Storing interaction data for repair session #${interaction.repairRequestId}`);
      
      const sessionId = interaction.repairRequestId;
      
      // Get the existing data file for this session
      const sessionFolder = path.join(LOCAL_STORAGE_DIR, `session_${sessionId}`);
      
      // Create the folder if it doesn't exist
      if (!fs.existsSync(sessionFolder)) {
        fs.mkdirSync(sessionFolder, { recursive: true });
      }
      
      // Store the interaction in a separate file
      const timestamp = Date.now();
      const uuid = randomUUID().slice(0, 8);
      const filename = `interaction_${sessionId}_${timestamp}_${uuid}.json`;
      const filePath = path.join(sessionFolder, filename);
      
      // Write the interaction data to the file
      fs.writeFileSync(filePath, JSON.stringify(interaction, null, 2));
      
      console.log(`Stored interaction data for session #${sessionId}: ${filePath}`);
      
      // Also update the consolidated file with this interaction
      return this.storeConsolidatedSessionData(sessionId);
    } catch (error) {
      console.error(`Error storing interaction data: ${error}`);
      return null;
    }
  }
  
  /**
   * Sync a repair session and all its related data
   * @param sessionId The ID of the repair session to sync
   * @returns The path to the synced data file
   */
  async syncRepairSession(sessionId: number): Promise<string> {
    try {
      console.log(`Syncing repair session data for session ID: ${sessionId}`);
      return this.storeConsolidatedSessionData(sessionId);
    } catch (error) {
      console.error(`Error syncing repair session #${sessionId}: ${error}`);
      return `error://failed-to-sync-session-${Date.now()}`;
    }
  }
  
  /**
   * Sync all diagnostic trees (for compatibility with existing code)
   * @returns A success message
   */
  async syncAllDiagnosticTrees(): Promise<string> {
    try {
      console.log(`LocalDataStorage: Syncing all diagnostic trees is not implemented`);
      return "Success - no action needed with local storage";
    } catch (error) {
      console.error(`Error syncing diagnostic trees: ${error}`);
      return `Error: ${error}`;
    }
  }
  
  /**
   * Create a training dataset from all repair journeys
   * @returns The path to the complete training dataset
   */
  async createTrainingDataset(): Promise<string> {
    try {
      console.log(`Creating training dataset from all completed repair sessions`);
      
      // Get all completed repair sessions
      const completedSessions = await db
        .select()
        .from(repairSessions)
        .where(eq(repairSessions.status, 'completed'));
      
      // Create a dataset directory
      const datasetDir = path.join(LOCAL_STORAGE_DIR, 'training_datasets');
      if (!fs.existsSync(datasetDir)) {
        fs.mkdirSync(datasetDir, { recursive: true });
      }
      
      // Generate a unique filename with timestamp
      const timestamp = Date.now();
      const uuid = randomUUID().slice(0, 8);
      const filename = `training_dataset_${timestamp}_${uuid}.json`;
      const filePath = path.join(datasetDir, filename);
      
      // Create a simple summary of the dataset
      const datasetSummary = {
        timestamp: new Date().toISOString(),
        sessionCount: completedSessions.length,
        sessions: completedSessions.map(session => ({
          id: session.id,
          deviceType: session.deviceType,
          issueDescription: session.issueDescription,
          createdAt: session.createdAt
        }))
      };
      
      // Write the dataset summary to the file
      fs.writeFileSync(filePath, JSON.stringify(datasetSummary, null, 2));
      
      console.log(`Created training dataset: ${filePath}`);
      return `file://${filePath}`;
    } catch (error) {
      console.error(`Error creating training dataset: ${error}`);
      return `error://failed-to-create-dataset-${Date.now()}`;
    }
  }
}

// Export a singleton instance of the LocalDataStorageService
export const localDataStorage = new LocalDataStorageService();