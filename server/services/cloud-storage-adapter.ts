/**
 * Adapter service to replace the original cloudDataSync service
 * This seamlessly swaps the implementation without requiring route changes
 */

import { simplifiedCloudSync } from './simplified-cloud-sync';
import type { UserInteraction } from '../types';

class CloudDataSyncAdapter {
  // Store consolidated session data
  async storeConsolidatedSessionData(sessionId: number, data: any): Promise<string> {
    console.log(`Using new simplified implementation for session #${sessionId}`);
    return simplifiedCloudSync.storeSessionData(sessionId, data);
  }
  
  // Store diagnostic data
  async storeDiagnosticData(sessionId: number, diagnosticData: any): Promise<string> {
    return simplifiedCloudSync.storeDiagnosticData(sessionId, diagnosticData);
  }
  
  // Store issue confirmation data
  async storeIssueConfirmationData(sessionId: number, issueData: any): Promise<string> {
    return simplifiedCloudSync.storeIssueConfirmationData(sessionId, issueData);
  }
  
  // Store repair guide data
  async storeRepairGuideData(sessionId: number, repairGuideData: any): Promise<string> {
    return simplifiedCloudSync.storeRepairGuideData(sessionId, repairGuideData);
  }
  
  // Store initial submission data
  async storeInitialSubmissionData(sessionId: number, initialData: any): Promise<string> {
    return simplifiedCloudSync.storeInitialSubmissionData(sessionId, initialData);
  }
  
  // Store user interaction data
  async storeInteractionData(interaction: UserInteraction): Promise<string | null> {
    return simplifiedCloudSync.storeInteractionData(interaction);
  }
  
  // Sync all diagnostic trees
  async syncAllDiagnosticTrees(): Promise<string[]> {
    return simplifiedCloudSync.syncAllDiagnosticTrees();
  }
  
  // Create training dataset
  async createTrainingDataset(): Promise<string> {
    return simplifiedCloudSync.createTrainingDataset();
  }
  
  // Sync repair session
  async syncRepairSession(sessionId: number): Promise<string> {
    return simplifiedCloudSync.syncRepairSession(sessionId);
  }
}

// Create singleton instance
export const cloudDataSync = new CloudDataSyncAdapter();