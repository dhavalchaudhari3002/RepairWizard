import { simpleGoogleCloudStorage } from './new-gcs-service';
import type { UserInteraction } from '../types';

// Import the actual database components used in the existing system
// to ensure we're working with the same database schema
import { db } from '../db/db';
import {
  repairSessions,
  repairSessionFiles,
  userInteractions,
  repairAnalytics,
  diagnosticQuestionTrees,
  storageFiles,
} from '../db/schema';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm/sql';

/**
 * A completely simplified cloud sync service with direct bucket root uploads
 * 
 * This service provides a clean implementation that:
 * 1. Stores ALL files directly in bucket root (no folders or prefixes)
 * 2. Uses descriptive file names with timestamps and IDs
 * 3. Updates database records without any folder paths
 */
class SimplifiedCloudSyncService {
  // Track processed sessions to avoid creating duplicate files
  private processedSessions = new Set<number>();
  
  /**
   * Store consolidated data for a repair session
   * This single function handles all session data with one file
   */
  async storeSessionData(sessionId: number, data: any): Promise<string> {
    try {
      console.log(`Storing data for session #${sessionId} directly in bucket root`);
      
      // Create a descriptive file name with session ID and timestamp
      const timestamp = Date.now();
      const fileUrl = await simpleGoogleCloudStorage.uploadSessionData(sessionId, {
        sessionId,
        timestamp: new Date().toISOString(),
        data
      });
      
      // Track the file in database
      try {
        // Get user ID from repair session
        const [repairSession] = await db
          .select()
          .from(repairSessions)
          .where(eq(repairSessions.id, sessionId));
        
        if (!repairSession) {
          throw new Error(`Repair session not found with ID: ${sessionId}`);
        }
        
        // Store in database with empty folder path
        const result = await db.insert(storageFiles).values({
          userId: repairSession.userId || 1,
          fileName: `session_${sessionId}_${timestamp}.json`,
          originalName: `session_${sessionId}_${timestamp}.json`,
          fileUrl: fileUrl,
          contentType: 'application/json',
          folder: '',
          fileSize: JSON.stringify(data).length,
          metadata: {
            sessionId,
            timestamp: new Date().toISOString(),
            type: 'consolidated_data'
          }
        }).returning({ id: storageFiles.id });
        
        if (result && result.length > 0) {
          // Link the file to the repair session
          await db.execute(
            sql`INSERT INTO repair_session_files (repair_session_id, storage_file_id, file_purpose, step_name) 
                VALUES (${sessionId}, ${result[0].id}, 'consolidated_data', 'all')`
          );
          console.log(`Recorded file in database for session #${sessionId}`);
        }
      } catch (dbError) {
        console.error(`Database error recording file: ${dbError}`);
        console.log(`This is not critical - file is still accessible at: ${fileUrl}`);
      }
      
      return fileUrl;
    } catch (error) {
      console.error(`Error storing session data: ${error}`);
      return `error://failed-to-store-${sessionId}-${Date.now()}`;
    }
  }
  
  /**
   * Store diagnostic data for a session
   */
  async storeDiagnosticData(sessionId: number, diagnosticData: any): Promise<string> {
    return this.storeSessionData(sessionId, {
      type: 'diagnostic',
      diagnosticData
    });
  }
  
  /**
   * Store issue confirmation data for a session
   */
  async storeIssueConfirmationData(sessionId: number, issueData: any): Promise<string> {
    return this.storeSessionData(sessionId, {
      type: 'issue_confirmation',
      issueData
    });
  }
  
  /**
   * Store repair guide data for a session
   */
  async storeRepairGuideData(sessionId: number, repairGuideData: any): Promise<string> {
    return this.storeSessionData(sessionId, {
      type: 'repair_guide',
      repairGuideData
    });
  }
  
  /**
   * Store initial submission data for a session
   */
  async storeInitialSubmissionData(sessionId: number, initialData: any): Promise<string> {
    return this.storeSessionData(sessionId, {
      type: 'initial_submission',
      initialData
    });
  }
  
  /**
   * Store user interaction data
   */
  async storeInteractionData(interaction: UserInteraction): Promise<string | null> {
    if (!interaction.repairRequestId) {
      return null;
    }
    
    try {
      console.log(`Storing interaction data for session #${interaction.repairRequestId}`);
      
      // Upload interaction data
      const fileUrl = await simpleGoogleCloudStorage.uploadInteractionData(
        interaction.repairRequestId,
        interaction.id,
        interaction.interactionType,
        interaction
      );
      
      // Record file in database
      try {
        const result = await db.insert(storageFiles).values({
          userId: interaction.userId || 1,
          fileName: `interaction_${interaction.repairRequestId}_${interaction.id}.json`,
          originalName: `interaction_${interaction.repairRequestId}_${interaction.id}.json`,
          fileUrl: fileUrl,
          contentType: 'application/json',
          folder: '',
          fileSize: JSON.stringify(interaction).length,
          metadata: {
            sessionId: interaction.repairRequestId,
            interactionId: interaction.id,
            type: 'interaction'
          }
        }).returning({ id: storageFiles.id });
        
        if (result && result.length > 0) {
          // Link the file to the repair session
          await db.execute(
            sql`INSERT INTO repair_session_files (repair_session_id, storage_file_id, file_purpose, step_name) 
                VALUES (${interaction.repairRequestId}, ${result[0].id}, 'interaction', ${interaction.interactionType})`
          );
          console.log(`Recorded interaction file in database for session #${interaction.repairRequestId}`);
        }
      } catch (dbError) {
        console.error(`Database error recording interaction: ${dbError}`);
        console.log(`This is not critical - file is still accessible at: ${fileUrl}`);
      }
      
      return fileUrl;
    } catch (error) {
      console.error(`Error storing interaction data: ${error}`);
      return null;
    }
  }
  
  /**
   * Sync all diagnostic question trees for AI training
   */
  async syncAllDiagnosticTrees(): Promise<string[]> {
    try {
      const trees = await db
        .select()
        .from(diagnosticQuestionTrees);
      
      const urls: string[] = [];
      
      for (const tree of trees) {
        const url = await simpleGoogleCloudStorage.uploadJson(
          tree,
          `diagnostic_tree_${tree.id}_${tree.productCategory}`
        );
        urls.push(url);
      }
      
      console.log(`Synced ${trees.length} diagnostic trees to bucket root`);
      return urls;
    } catch (error) {
      console.error('Error syncing diagnostic trees:', error);
      return [];
    }
  }
  
  /**
   * Create a training dataset from all repair journeys
   */
  async createTrainingDataset(): Promise<string> {
    try {
      // Get all completed repair sessions
      const completedSessions = await db
        .select()
        .from(repairSessions)
        .where(eq(repairSessions.status, 'completed'));
      
      // Process each session into a training example
      const trainingData = await Promise.all(completedSessions.map(async (session) => {
        try {
          // Get all interactions for this session
          const interactions = await db
            .select()
            .from(userInteractions)
            .where(eq(userInteractions.repairRequestId, session.id));
          
          // Get analytics for this session
          const analytics = await db
            .select()
            .from(repairAnalytics)
            .where(eq(repairAnalytics.repairRequestId, session.id));
          
          // Get file references
          const filesResult = await db.execute(
            sql`SELECT 
                rsf.repair_session_id AS "sessionId", 
                rsf.file_purpose AS "purpose", 
                rsf.step_name AS "step", 
                sf.file_url AS "fileUrl", 
                sf.content_type AS "contentType", 
                sf.file_name AS "fileName"
              FROM repair_session_files rsf
              INNER JOIN storage_files sf ON rsf.storage_file_id = sf.id
              WHERE rsf.repair_session_id = ${session.id}`
          );
          
          const files = filesResult.rows || [];
          
          // Return a complete training example
          return {
            sessionId: session.id,
            deviceInfo: {
              type: session.deviceType,
              brand: session.deviceBrand,
              model: session.deviceModel,
            },
            problem: session.issueDescription,
            diagnosticResults: session.diagnosticResults,
            interactionCount: interactions.length,
            files: files.map((f: any) => ({
              purpose: f.purpose,
              step: f.step,
              url: f.fileUrl
            })),
            timestamps: {
              created: session.createdAt,
              updated: session.updatedAt
            }
          };
        } catch (error) {
          console.error(`Error processing session #${session.id} for training:`, error);
          return null;
        }
      }));
      
      // Filter out nulls from errors
      const validTrainingData = trainingData.filter(d => d !== null);
      
      // Upload the complete training dataset
      const trainingDatasetUrl = await simpleGoogleCloudStorage.uploadJson({
        metadata: {
          generatedAt: new Date().toISOString(),
          version: '1.0',
          sessionCount: validTrainingData.length
        },
        data: validTrainingData
      }, 'training_dataset');
      
      console.log(`Created training dataset with ${validTrainingData.length} examples: ${trainingDatasetUrl}`);
      return trainingDatasetUrl;
    } catch (error) {
      console.error('Error creating training dataset:', error);
      return `error://training-dataset-failed-${Date.now()}`;
    }
  }
  
  /**
   * Create a complete consolidated file for a repair session
   */
  async syncRepairSession(sessionId: number): Promise<string> {
    try {
      // Get all session data
      const [repairSession] = await db
        .select()
        .from(repairSessions)
        .where(eq(repairSessions.id, sessionId));
      
      if (!repairSession) {
        throw new Error(`Repair session not found with ID: ${sessionId}`);
      }
      
      // Get interactions
      const interactions = await db
        .select()
        .from(userInteractions)
        .where(eq(userInteractions.repairRequestId, sessionId));
      
      // Get analytics
      const analytics = await db
        .select()
        .from(repairAnalytics)
        .where(eq(repairAnalytics.repairRequestId, sessionId));
      
      // Create a comprehensive data structure
      const sessionData = {
        session: repairSession,
        interactions,
        analytics,
        metadata: {
          syncTimestamp: new Date().toISOString(),
          version: '1.0'
        }
      };
      
      // Upload to GCS
      const url = await simpleGoogleCloudStorage.uploadJson(
        sessionData,
        `complete_session_${sessionId}`
      );
      
      // Update the session with the sync URL
      try {
        await db
          .update(repairSessions)
          .set({ metadataUrl: url })
          .where(eq(repairSessions.id, sessionId));
      } catch (dbError) {
        console.warn(`Could not update metadataUrl for session #${sessionId}:`, dbError);
        console.log('This is non-critical - the file is still accessible in Google Cloud Storage');
      }
      
      return url;
    } catch (error) {
      console.error(`Error syncing session #${sessionId}:`, error);
      return `error://sync-failed-${sessionId}-${Date.now()}`;
    }
  }
}

// Create a singleton instance
export const simplifiedCloudSync = new SimplifiedCloudSyncService();