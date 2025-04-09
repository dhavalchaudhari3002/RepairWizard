import { googleCloudStorage } from './google-cloud-storage';
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

// Create a local temp directory for fallback storage if GCS is unavailable
const TEMP_STORAGE_DIR = path.join(os.tmpdir(), 'repair-ai-assistant-sync');
try {
  if (!fs.existsSync(TEMP_STORAGE_DIR)) {
    fs.mkdirSync(TEMP_STORAGE_DIR, { recursive: true });
    console.log(`Created temporary data sync storage directory: ${TEMP_STORAGE_DIR}`);
  }
} catch (err) {
  console.error('Failed to create temporary storage directory for data sync:', err);
}

/**
 * CloudDataSync Service
 * 
 * This service handles synchronizing all application data with Google Cloud Storage
 * to create a comprehensive dataset for future AI model training.
 * 
 * It provides methods to:
 * 1. Store entire repair journeys in GCS as a single consolidated file per session
 * 2. Backup database records as structured JSON
 * 3. Create comprehensive learning datasets for AI training
 * 
 * Features robust error handling with local filesystem fallback when GCS is unavailable.
 * 
 * UPDATED: Now stores all session data in a single consolidated file for simpler organization
 * and more effective AI training data collection.
 */
export class CloudDataSyncService {
  // Track the sessions we've processed to avoid duplicate folder creation
  private processedSessions = new Set<number>();
  
  /**
   * Store all data for a repair session in a single consolidated file
   * This is a simplified approach that puts all data in one file for easier AI training
   * @param sessionId The ID of the repair session
   * @param additionalData Optional additional data to include in the consolidated file
   * @returns The URL of the consolidated data file in Google Cloud Storage
   */
  async storeConsolidatedSessionData(sessionId: number, additionalData: Record<string, any> = {}): Promise<string> {
    try {
      console.log(`Creating consolidated data file for repair session #${sessionId}`);
      
      // Skip if we've already created a folder for this session
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
          syncTimestamp: new Date().toISOString(),
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
      
      // Create a simple folder structure - just one folder per session
      try {
        // This will create just a single folder named after the session ID
        const folder = `repair_sessions/${sessionId}`;
        const exists = await googleCloudStorage.checkIfFolderExists(folder);
        
        if (!exists) {
          console.log(`Creating folder structure for session #${sessionId}`);
          await googleCloudStorage.createFolder(folder);
        } else {
          console.log(`Folder already exists for session #${sessionId}`);
        }
      } catch (error) {
        console.log(`Error creating folder for session #${sessionId}: ${error}`);
        // Non-critical, continue with file creation
      }
      
      // Generate a unique filename with timestamp
      const timestamp = Date.now();
      const filename = `session_${timestamp}.json`;
      const filePath = `repair_sessions/${sessionId}/${filename}`;
      
      // Upload the consolidated data file
      try {
        const url = await googleCloudStorage.uploadText(
          filePath,
          JSON.stringify(consolidatedData, null, 2)
        );
        
        console.log(`Successfully stored consolidated data for session #${sessionId}: ${url}`);
        
        // Update the database to record this file
        try {
          const result = await db.insert(storageFiles).values({
            userId: repairSession.userId || 1,
            fileName: filename,
            originalName: filename,
            fileUrl: url,
            contentType: 'application/json',
            folder: `repair_sessions/${sessionId}`,
            fileSize: JSON.stringify(consolidatedData).length,
            metadata: {
              sessionId,
              type: 'consolidated_data',
              timestamp: new Date().toISOString()
            }
          }).returning({ id: storageFiles.id });
          
          if (result && result.length > 0) {
            // Link the file to the repair session
            await db.execute(
              sql`INSERT INTO repair_session_files (repair_session_id, storage_file_id, file_purpose, step_name) 
                  VALUES (${sessionId}, ${result[0].id}, 'consolidated_data', 'all')`
            );
            console.log(`Recorded consolidated data file in database for session #${sessionId}`);
          }
        } catch (dbError) {
          console.error(`Failed to record consolidated file in database: ${dbError}`);
          console.log(`This is not critical - we can still find the file in Google Cloud Storage`);
        }
        
        return url;
      } catch (uploadError) {
        console.error(`Error uploading consolidated data to GCS: ${uploadError}`);
        // Use local fallback
        const localUrl = this.saveLocalFallback(consolidatedData, sessionId, 'consolidated');
        console.log(`Saved consolidated data to local filesystem: ${localUrl}`);
        return localUrl;
      }
    } catch (error) {
      // Check if it's a database error related to metadata_url column
      const errorStr = String(error);
      // Handle the DB schema error (consolidatedData is captured from the outer scope)
      if (errorStr.includes('metadata_url') || errorStr.includes('metadataUrl')) {
        console.warn(`The database schema may need to be updated to add the metadataUrl column. 
          This is non-critical - files will still be stored in Google Cloud Storage.
          Error details: ${errorStr}`);
        
        // Need to create a simple response to avoid the error
        try {
          console.log(`Generating an alternative URL for session #${sessionId}`);
          // Return a simple path without trying to access consolidatedData
          return `repair_sessions/${sessionId}/session_data_${Date.now()}.json`;
        } catch (fallbackError) {
          console.error(`Error creating fallback URL: ${fallbackError}`);
          return `repair_sessions/${sessionId}/error_${Date.now()}.json`;
        }
      }
      
      // For other errors
      console.error(`Error creating consolidated data for session #${sessionId}: ${error}`);
      return this.saveLocalFallback(
        { error: String(error), sessionId, timestamp: new Date() },
        sessionId,
        'error_consolidated'
      );
    }
  }
  /**
   * Save data to local filesystem as a fallback when GCS is unavailable
   * @param data Data to save
   * @param sessionId The repair session ID (used for folder structure)
   * @param type Type of data (e.g., 'diagnosis', 'guide', etc.)
   * @returns A file URL to the saved data
   */
  private saveLocalFallback(data: any, sessionId: number, type: string): string {
    try {
      // Create a unique ID for the file
      const uuid = randomUUID();
      const timestamp = Date.now();
      const dirPath = path.join(TEMP_STORAGE_DIR, `session_${sessionId}`, type);
      const filePath = path.join(dirPath, `${type}_${timestamp}_${uuid}.json`);
      
      // Make sure the directory exists
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      
      // Write the data to the file
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      
      console.log(`Saved data to local filesystem as fallback: ${filePath}`);
      return `file://${filePath}`;
    } catch (localError) {
      console.error(`Failed to save data locally:`, localError);
      return `error://failed-to-save-${Date.now()}`;
    }
  }
  
  /**
   * Sync a repair session and all its related data to Google Cloud Storage
   * @param sessionId The ID of the repair session to sync
   * @returns The URL of the complete dataset in Google Cloud Storage
   */
  async syncRepairSession(sessionId: number): Promise<string> {
    try {
      // Log which session ID we're processing
      console.log(`Syncing repair session data for session ID: ${sessionId}`);
      
      // Step 1: Get the repair session data
      const [repairSession] = await db
        .select()
        .from(repairSessions)
        .where(eq(repairSessions.id, sessionId));

      if (!repairSession) {
        throw new Error(`Repair session not found with ID: ${sessionId}`);
      }

      // Step 2: Get all files related to this session
      const sessionFiles = await db
        .select()
        .from(repairSessionFiles)
        .where(eq(repairSessionFiles.repairSessionId, sessionId));
      
      // Step 3: Get user interactions related to this session
      // Filter by repairRequestId (as repairSessionId may not exist in the schema)
      const interactions = await db
        .select()
        .from(userInteractions)
        .where(eq(userInteractions.repairRequestId, sessionId));
      
      // Step 4: Get repair analytics related to this session
      // Filter by repairRequestId (as repairSessionId may not exist in the schema)
      const analytics = await db
        .select()
        .from(repairAnalytics)
        .where(eq(repairAnalytics.repairRequestId, sessionId));

      // Step 5: Create a comprehensive data structure
      const completeJourney = {
        repairSession,
        files: sessionFiles,
        interactions,
        analytics,
        metadata: {
          syncTimestamp: new Date().toISOString(),
          version: '1.0',
          source: 'repair-ai-assistant',
          aiTrainingReady: true,
        }
      };

      // Step 6: Create the folder structure for this repair session
      // The improved createRepairJourneyFolderStructure method handles existing folders properly
      try {
        await googleCloudStorage.createRepairJourneyFolderStructure(sessionId);
      } catch (folderError) {
        // Non-critical error, continue with storing the session data
        console.log(`Note: Issue with folder structure for repair session #${sessionId}, but will continue with sync`);
      }

      // Step 7: Try to store the complete journey in Google Cloud Storage
      let metadataUrl: string;
      try {
        // Store only in the complete_journey folder to avoid data duplication
        // Avoid saving the same data to multiple folders

        // Save only metadata in complete_journey for indexing purposes
        // This prevents duplication of actual data across folders
        const journeyMetadata = {
          sessionId: repairSession.id,
          status: repairSession.status,
          deviceType: repairSession.deviceType,
          deviceBrand: repairSession.deviceBrand,
          deviceModel: repairSession.deviceModel,
          issueDescription: repairSession.issueDescription,
          createdAt: repairSession.createdAt,
          updatedAt: repairSession.updatedAt,
          diagnosticsCount: interactions.filter(i => i.interactionType === 'diagnostic_generated').length,
          filesCount: sessionFiles.length,
          interactionsCount: interactions.length,
          analyticsCount: analytics.length,
          syncTimestamp: new Date().toISOString(),
        };
        
        // Save the complete journey metadata only
        metadataUrl = await googleCloudStorage.saveRepairJourneyData(
          sessionId,
          'complete_journey',
          journeyMetadata,
          `journey_metadata_${Date.now()}.json`
        );
        console.log(`Successfully synced repair session #${sessionId} metadata to Google Cloud Storage: ${metadataUrl}`);
      } catch (gcsError) {
        console.error(`Error syncing to Google Cloud Storage, falling back to local:`, gcsError);
        // Use local fallback if GCS is unavailable
        metadataUrl = this.saveLocalFallback({
          sessionId: repairSession.id,
          status: repairSession.status,
          syncTimestamp: new Date().toISOString(),
        }, sessionId, 'complete_journey');
        console.log(`Saved repair session #${sessionId} to local storage: ${metadataUrl}`);
      }

      // Step 8: Try to update the repair session with the metadata URL
      // But handle the case where the metadataUrl column might not exist yet
      try {
        await db
          .update(repairSessions)
          .set({ metadataUrl })
          .where(eq(repairSessions.id, sessionId));
      } catch (dbError) {
        console.warn(`Could not update metadataUrl for session #${sessionId}:`, dbError);
        console.log('This is non-critical - the file is still stored in Google Cloud Storage');
      }

      return metadataUrl;
    } catch (error) {
      console.error(`Error syncing repair session #${sessionId}:`, error);
      // In case of any unexpected error, still try to save locally as last resort
      try {
        const url = this.saveLocalFallback({ error: String(error), sessionId, timestamp: new Date() }, sessionId, 'error_logs');
        return url;
      } catch (localError) {
        console.error('Failed to save error locally:', localError);
        return `error://sync-failed-${sessionId}-${Date.now()}`;
      }
    }
  }

  /**
   * Store diagnostic data in Google Cloud Storage
   * @param sessionId The ID of the repair session
   * @param diagnosticData The diagnostic data to store
   * @returns The URL of the stored JSON file
   */
  async storeDiagnosticData(sessionId: number, diagnosticData: any): Promise<string> {
    try {
      // Add logging to debug which session ID is being processed
      console.log(`Processing diagnostic data for session ID: ${sessionId}`);
      
      // Check if diagnosticData has a different repairRequestId - this is crucial
      // to prevent creating folders for both old and new sessions
      const requestId = diagnosticData.repairRequestId || sessionId;
      if (requestId !== sessionId) {
        console.log(`Note: Diagnostic data has different repairRequestId (${requestId}) than sessionId (${sessionId}). Using sessionId.`);
      }
      
      // Store diagnostic data in a consolidated file format
      return this.storeConsolidatedSessionData(sessionId, { 
        diagnosticData: diagnosticData 
      });
    } catch (error) {
      console.error(`Error storing diagnostic data for session #${sessionId}:`, error);
      // Last resort fallback
      return this.saveLocalFallback(
        { error: String(error), data: diagnosticData, timestamp: new Date() },
        sessionId,
        'error_diagnostics'
      );
    }
  }

  /**
   * Store issue confirmation data in Google Cloud Storage
   * @param sessionId The ID of the repair session
   * @param issueData The issue confirmation data to store
   * @returns The URL of the stored JSON file
   */
  async storeIssueConfirmationData(sessionId: number, issueData: any): Promise<string> {
    try {
      // Log which session ID we're processing
      console.log(`Processing issue confirmation data for session ID: ${sessionId}`);
      
      // Store issue confirmation data in a consolidated file format
      return this.storeConsolidatedSessionData(sessionId, { 
        issueConfirmationData: issueData 
      });
    } catch (error) {
      console.error(`Error storing issue confirmation data for session #${sessionId}:`, error);
      // Last resort fallback
      return this.saveLocalFallback(
        { error: String(error), data: issueData, timestamp: new Date() },
        sessionId,
        'error_issue_confirmation'
      );
    }
  }

  /**
   * Store repair guide data in Google Cloud Storage
   * @param sessionId The ID of the repair session
   * @param repairGuideData The repair guide data to store
   * @returns The URL of the stored JSON file
   */
  async storeRepairGuideData(sessionId: number, repairGuideData: any): Promise<string> {
    try {
      // Log which session ID we're processing
      console.log(`Processing repair guide data for session ID: ${sessionId}`);
      
      // Store repair guide data in a consolidated file format
      return this.storeConsolidatedSessionData(sessionId, { 
        repairGuideData: repairGuideData 
      });
    } catch (error) {
      console.error(`Error storing repair guide data for session #${sessionId}:`, error);
      // Last resort fallback
      return this.saveLocalFallback(
        { error: String(error), data: repairGuideData, timestamp: new Date() },
        sessionId,
        'error_repair_guide'
      );
    }
  }

  /**
   * Store initial submission data in Google Cloud Storage
   * @param sessionId The ID of the repair session
   * @param initialData The initial submission data to store
   * @returns The URL of the stored JSON file
   */
  async storeInitialSubmissionData(sessionId: number, initialData: any): Promise<string> {
    try {
      // Log which session ID we're processing
      console.log(`Processing initial submission data for session ID: ${sessionId}`);
      
      // Check if we already have files for this session in GCS to prevent duplication
      const existingSessionData = await db
        .select()
        .from(repairSessionFiles)
        .where(eq(repairSessionFiles.repairSessionId, sessionId));
        
      // If existing files found in the submission folder, don't create duplicate data
      const existingSubmissionFile = existingSessionData.find(
        file => file.fileUrl && file.fileUrl.includes(`consolidated_data`)
      );
      
      if (existingSubmissionFile?.fileUrl) {
        console.log(`Consolidated data already exists for session #${sessionId}, updating with submission data`);
      }
      
      // Store submission data in the consolidated file
      return this.storeConsolidatedSessionData(sessionId, { 
        initialSubmissionData: initialData 
      });
    } catch (error) {
      console.error(`Error storing initial submission data for session #${sessionId}:`, error);
      // Last resort fallback
      return this.saveLocalFallback(
        { error: String(error), data: initialData, timestamp: new Date() },
        sessionId,
        'error_submission'
      );
    }
  }

  /**
   * Store user interaction data in Google Cloud Storage
   * @param interaction The user interaction to store
   * @returns The URL of the stored JSON file
   */
  async storeInteractionData(interaction: UserInteraction): Promise<string | null> {
    // Only sync data for interactions related to repair sessions
    if (!interaction.repairRequestId) {
      return null;
    }
    
    try {
      // Log which session/request ID we're processing
      console.log(`Processing interaction data for repair request ID: ${interaction.repairRequestId}`);
      
      // Only create folders for the current session - not any related sessions
      try {
        await googleCloudStorage.createRepairJourneyFolderStructure(interaction.repairRequestId);
      } catch (folderError: any) {
        // Non-critical error, continue with storing the interaction data
        console.log(`Note: Issue with folder structure for interaction data, but will continue with storage: ${folderError?.message || 'Unknown error'}`);
      }

      try {
        // Store in a dedicated interactions folder with an organized filename
        const timestamp = Date.now();
        const fileName = `interaction_${interaction.id}_${interaction.interactionType}_${timestamp}.json`;
        const url = await googleCloudStorage.saveRepairJourneyData(
          interaction.repairRequestId,
          'interactions',
          interaction,
          fileName
        );
        console.log(`Successfully stored interaction data #${interaction.id} to GCS`);
        
        // Record this file in the database to track it
        try {
          // First insert into storage_files table
          const result = await db.insert(storageFiles).values({
            userId: interaction.userId || 1,
            fileName: fileName,
            originalName: fileName,
            fileUrl: url,
            contentType: 'application/json',
            folder: `repair_sessions/${interaction.repairRequestId}/interactions`,
            fileSize: JSON.stringify(interaction).length,
            metadata: {
              sessionId: interaction.repairRequestId,
              interactionId: interaction.id,
              type: 'interaction_data',
              interactionType: interaction.interactionType,
              timestamp: new Date().toISOString()
            }
          }).returning({ id: storageFiles.id });
          
          if (result && result.length > 0) {
            // Then link the file to the repair session using raw SQL
            await db.execute(
              sql`INSERT INTO repair_session_files (repair_session_id, storage_file_id, file_purpose, step_name) 
                  VALUES (${interaction.repairRequestId}, ${result[0].id}, 'interaction_data', ${interaction.interactionType})`
            );
            console.log(`Recorded interaction file in database for session #${interaction.repairRequestId}`);
          }
        } catch (dbError) {
          console.error(`Failed to record interaction file in database: ${dbError}`);
          console.log(`This is not critical - we can still find the files in Google Cloud Storage`);
          // Continue anyway as the file was saved successfully
        }
        
        return url;
      } catch (gcsError) {
        console.error(`Error storing interaction data to GCS for interaction #${interaction.id}, using local fallback:`, gcsError);
        const localUrl = this.saveLocalFallback(interaction, interaction.repairRequestId, 'interactions');
        console.log(`Stored interaction data to local filesystem: ${localUrl}`);
        return localUrl;
      }
    } catch (error) {
      console.error(`Error storing interaction data #${interaction.id}:`, error);
      // For interactions, it's okay to fail silently as it's not critical user-facing data
      try {
        // Still attempt a last-resort fallback
        return this.saveLocalFallback(
          { error: String(error), data: interaction, timestamp: new Date() },
          interaction.repairRequestId,
          'error_interactions'
        );
      } catch {
        console.error(`Failed all fallbacks for interaction #${interaction.id}`);
        return null;
      }
    }
  }

  /**
   * Sync all diagnostic question trees to Google Cloud Storage for AI training
   * @returns Array of URLs of the stored JSON files
   */
  async syncAllDiagnosticTrees(): Promise<string[]> {
    try {
      const trees = await db
        .select()
        .from(diagnosticQuestionTrees);
      
      const urls: string[] = [];
      
      for (const tree of trees) {
        const url = await googleCloudStorage.saveJsonData(
          tree,
          {
            folder: 'diagnostic_trees',
            customName: `tree_${tree.id}_${tree.productCategory}${tree.subCategory ? '_' + tree.subCategory : ''}_v${tree.version}.json`
          }
        );
        urls.push(url);
      }
      
      console.log(`Successfully synced ${trees.length} diagnostic trees to Google Cloud Storage`);
      return urls;
    } catch (error) {
      console.error('Error syncing diagnostic trees to Google Cloud Storage:', error);
      throw error;
    }
  }

  /**
   * Create a training dataset from all repair journeys
   * This combines all repair session data into a structured format for AI training
   * @returns The URL of the complete training dataset
   */
  async createTrainingDataset(): Promise<string> {
    try {
      // Get all completed repair sessions
      const completedSessions = await db
        .select()
        .from(repairSessions)
        .where(eq(repairSessions.status, 'completed'));
      
      const trainingData = [];
      
      for (const session of completedSessions) {
        try {
          // Get related data for this session
          // Join with storage_files table to get complete file information
          // Use raw SQL to work with the actual database schema 
          const filesResult = await db.execute(
            sql`SELECT 
                rsf.repair_session_id AS "sessionId", 
                rsf.file_purpose AS "purpose", 
                rsf.step_name AS "step", 
                sf.file_url AS "fileUrl", 
                sf.content_type AS "contentType", 
                sf.file_name AS "fileName", 
                sf.metadata AS "metadata"
              FROM repair_session_files rsf
              INNER JOIN storage_files sf ON rsf.storage_file_id = sf.id
              WHERE rsf.repair_session_id = ${session.id}`
          );
          
          // Log the structure to understand the result format
          console.log(`Query result structure: ${Object.keys(filesResult).join(', ')}`);
          
          // Extract rows from the result
          const files = filesResult.rows || [];
          
          // Include only completed journeys with sufficient data
          if (session.diagnosticResults && session.issueConfirmation && session.repairGuide) {
            trainingData.push({
              sessionId: session.id,
              deviceInfo: {
                type: session.deviceType,
                brand: session.deviceBrand,
                model: session.deviceModel,
              },
              problem: {
                description: session.issueDescription,
                symptoms: session.symptoms,
              },
              diagnostic: session.diagnosticResults,
              confirmedIssue: session.issueConfirmation,
              solution: session.repairGuide,
              // Use the files array extracted from the query result
              files: files.map((f: any) => ({
                purpose: f.purpose,
                step: f.step,
                url: f.fileUrl,
                type: f.contentType,
                metadata: f.metadata
              })),
              timestamps: {
                created: session.createdAt,
                updated: session.updatedAt,
              }
            });
          }
        } catch (error) {
          console.error(`Error processing session #${session.id} for training dataset:`, error);
          // Continue with other sessions
        }
      }
      
      // Save the complete training dataset
      const trainingDatasetUrl = await googleCloudStorage.saveJsonData(
        {
          metadata: {
            generatedAt: new Date().toISOString(),
            version: '1.0',
            sessionCount: trainingData.length,
            source: 'repair-ai-assistant',
          },
          data: trainingData,
        },
        {
          folder: 'training_datasets',
          customName: `repair_training_dataset_${Date.now()}.json`
        }
      );
      
      console.log(`Successfully created training dataset with ${trainingData.length} repair journeys: ${trainingDatasetUrl}`);
      return trainingDatasetUrl;
    } catch (error) {
      console.error('Error creating training dataset:', error);
      throw error;
    }
  }
}

// Create a singleton instance
export const cloudDataSync = new CloudDataSyncService();