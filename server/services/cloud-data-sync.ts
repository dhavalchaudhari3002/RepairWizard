import { googleCloudStorage } from './google-cloud-storage';
import { db } from '../db';
import { 
  repairSessions, 
  repairSessionFiles, 
  diagnosticQuestionTrees,
  userInteractions,
  repairAnalytics, 
  type RepairSession,
  type RepairSessionFile,
  type UserInteraction,
  type RepairAnalytics,
  type DiagnosticQuestionTree
} from '@shared/schema';
import { eq } from 'drizzle-orm';
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
 * 1. Store entire repair journeys in GCS
 * 2. Backup database records as structured JSON
 * 3. Create comprehensive learning datasets for AI training
 * 
 * Features robust error handling with local filesystem fallback when GCS is unavailable.
 */
export class CloudDataSyncService {
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
          diagnosticsCount: interactions.filter(i => i.type === 'diagnostic_generated').length,
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

      // Step 8: Update the repair session with the metadata URL
      await db
        .update(repairSessions)
        .set({ metadataUrl })
        .where(eq(repairSessions.id, sessionId));

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
      
      // Only create folders for the current session - not any related sessions
      try {
        await googleCloudStorage.createRepairJourneyFolderStructure(sessionId);
      } catch (folderError: any) {
        // Non-critical error, continue with storing the diagnostic data
        console.log(`Note: Issue with folder structure for session #${sessionId}, but will continue with diagnostic storage: ${folderError?.message || 'Unknown error'}`);
      }

      try {
        // Store in a dedicated diagnostics folder with an organized filename
        const url = await googleCloudStorage.saveRepairJourneyData(
          sessionId,
          'diagnostics',
          diagnosticData,
          `diagnostic_data_${Date.now()}.json`
        );
        console.log(`Successfully stored diagnostic data for session #${sessionId} to GCS: ${url}`);
        return url;
      } catch (gcsError) {
        console.error(`Error storing diagnostic data to GCS for session #${sessionId}, using local fallback:`, gcsError);
        const localUrl = this.saveLocalFallback(diagnosticData, sessionId, 'diagnostics');
        console.log(`Stored diagnostic data to local filesystem: ${localUrl}`);
        return localUrl;
      }
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
      
      // Only create folders for the current session - not any related sessions
      try {
        await googleCloudStorage.createRepairJourneyFolderStructure(sessionId);
      } catch (folderError: any) {
        // Non-critical error, continue with storing the issue confirmation data
        console.log(`Note: Issue with folder structure for session #${sessionId}, but will continue with issue confirmation storage: ${folderError?.message || 'Unknown error'}`);
      }

      try {
        // Store in a dedicated issue_confirmation folder with an organized filename
        const url = await googleCloudStorage.saveRepairJourneyData(
          sessionId,
          'issue_confirmation',
          issueData,
          `issue_confirmation_${Date.now()}.json`
        );
        console.log(`Successfully stored issue confirmation data for session #${sessionId} to GCS: ${url}`);
        return url;
      } catch (gcsError) {
        console.error(`Error storing issue confirmation data to GCS for session #${sessionId}, using local fallback:`, gcsError);
        const localUrl = this.saveLocalFallback(issueData, sessionId, 'issue_confirmation');
        console.log(`Stored issue confirmation data to local filesystem: ${localUrl}`);
        return localUrl;
      }
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
      
      // Only create folders for the current session - not any related sessions
      try {
        await googleCloudStorage.createRepairJourneyFolderStructure(sessionId);
      } catch (folderError: any) {
        // Non-critical error, continue with storing the repair guide data
        console.log(`Note: Issue with folder structure for session #${sessionId}, but will continue with repair guide storage: ${folderError?.message || 'Unknown error'}`);
      }

      try {
        // Store in a dedicated repair_guide folder with an organized filename
        const url = await googleCloudStorage.saveRepairJourneyData(
          sessionId,
          'repair_guide',
          repairGuideData,
          `repair_guide_${Date.now()}.json`
        );
        console.log(`Successfully stored repair guide data for session #${sessionId} to GCS: ${url}`);
        return url;
      } catch (gcsError) {
        console.error(`Error storing repair guide data to GCS for session #${sessionId}, using local fallback:`, gcsError);
        const localUrl = this.saveLocalFallback(repairGuideData, sessionId, 'repair_guide');
        console.log(`Stored repair guide data to local filesystem: ${localUrl}`);
        return localUrl;
      }
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
        file => file.fileUrl && file.fileUrl.includes(`/submission/`)
      );
      
      if (existingSubmissionFile?.fileUrl) {
        console.log(`Initial submission data already exists for session #${sessionId}, skipping duplicate creation`);
        return existingSubmissionFile.fileUrl;
      }
      
      // Create repair journey folder structure only once - the improved GoogleCloudStorage class
      // will handle checking for existing folders internally
      try {
        await googleCloudStorage.createRepairJourneyFolderStructure(sessionId);
      } catch (folderError: any) {
        // Handle as a non-critical error - we'll still try to save the data
        console.log(`Note: Issue with folder structure for session #${sessionId}, but will continue with submission storage: ${folderError?.message || 'Unknown error'}`);
      }

      try {
        // Make the filename consistent to avoid duplicates
        const filename = `initial_submission.json`;
        
        // Store in a dedicated submission folder with a consistent filename
        const url = await googleCloudStorage.saveRepairJourneyData(
          sessionId,
          'submission',
          initialData,
          filename
        );
        console.log(`Successfully stored initial submission data for session #${sessionId} to GCS: ${url}`);
        
        // Record this file in the database to track it
        await db.insert(repairSessionFiles).values({
          repairSessionId: sessionId,
          userId: initialData.userId || 1, // Use the userId from initialData or default to 1
          fileName: filename,
          fileUrl: url,
          filePurpose: 'submission_data',
          contentType: 'application/json'
        });
        
        return url;
      } catch (gcsError) {
        console.error(`Error storing initial submission data to GCS for session #${sessionId}, using local fallback:`, gcsError);
        const localUrl = this.saveLocalFallback(initialData, sessionId, 'submission');
        console.log(`Stored initial submission data to local filesystem: ${localUrl}`);
        return localUrl;
      }
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
        const url = await googleCloudStorage.saveRepairJourneyData(
          interaction.repairRequestId,
          'interactions',
          interaction,
          `interaction_${interaction.id}_${interaction.interactionType}_${Date.now()}.json`
        );
        console.log(`Successfully stored interaction data #${interaction.id} to GCS`);
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
          const files = await db
            .select()
            .from(repairSessionFiles)
            .where(eq(repairSessionFiles.repairSessionId, session.id));
          
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
              files: files.map((f: RepairSessionFile) => ({
                purpose: f.filePurpose,
                step: f.stepName,
                url: f.fileUrl,
                type: f.contentType,
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