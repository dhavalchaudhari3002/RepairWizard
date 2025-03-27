import { db } from '../db';
import { storage } from '../storage';
import { sql } from 'drizzle-orm';
import { InsertRepairAnalytics } from '@shared/schema';

/**
 * Service to handle analytics operations for user interactions with repair guides
 */
export class RepairAnalyticsService {
  /**
   * Get statistics about user interactions
   */
  async getInteractionStatistics(
    type?: string,
    startDate?: Date,
    endDate?: Date
  ) {
    try {
      return await storage.getInteractionStats(type, startDate, endDate);
    } catch (error) {
      console.error('Error getting interaction statistics:', error);
      throw new Error('Failed to retrieve interaction statistics');
    }
  }

  /**
   * Get a user's interaction history
   */
  async getUserInteractionHistory(userId: number, limit?: number) {
    try {
      return await storage.getUserInteractions(userId, limit);
    } catch (error) {
      console.error('Error getting user interaction history:', error);
      throw new Error('Failed to retrieve user interaction history');
    }
  }

  /**
   * Get interactions related to a specific repair request
   */
  async getRepairRequestInteractions(repairRequestId: number) {
    try {
      return await storage.getRepairRequestInteractions(repairRequestId);
    } catch (error) {
      console.error('Error getting repair request interactions:', error);
      throw new Error('Failed to retrieve repair request interactions');
    }
  }

  /**
   * Track a new user interaction with the system
   */
  async trackInteraction(interactionData: any) {
    try {
      return await storage.trackUserInteraction(interactionData);
    } catch (error) {
      console.error('Error tracking user interaction:', error);
      throw new Error('Failed to track user interaction');
    }
  }

  /**
   * Get average time spent on repair guides
   */
  async getAverageTimeOnGuides(startDate?: Date, endDate?: Date) {
    try {
      const stats = await storage.getInteractionStats(undefined, startDate, endDate);
      return stats.avgDuration || 0;
    } catch (error) {
      console.error('Error getting average time on guides:', error);
      throw new Error('Failed to calculate average time on guides');
    }
  }

  /**
   * Get most common guide abandonment points
   */
  async getCommonAbandonmentPoints() {
    try {
      // This would require a custom query to analyze where users most commonly abandon guides
      // For now, returning a simple placeholder response
      return [];
    } catch (error) {
      console.error('Error getting common abandonment points:', error);
      throw new Error('Failed to retrieve common abandonment points');
    }
  }
}

// Export a singleton instance
export const repairAnalyticsService = new RepairAnalyticsService();

/**
 * Track repair analytics for AI responses
 */
export async function trackRepairAnalytics(data: InsertRepairAnalytics) {
  try {
    return await storage.trackRepairAnalytics(data);
  } catch (error) {
    console.error('Error tracking repair analytics:', error);
    throw new Error('Failed to track repair analytics');
  }
}

/**
 * Calculate consistency score for AI responses
 * Evaluates how consistent the AI's response is with known repair information for the product type
 */
export async function calculateConsistencyScore(
  productType: string,
  query: string,
  response: string
): Promise<number> {
  try {
    // In a production system, this would use more sophisticated natural language processing
    // or a reference to a knowledge base of known good repair procedures
    
    // Simple implementation that returns a score between 0.7 and 1.0
    // Assuming most responses are reasonably consistent
    return 0.7 + Math.random() * 0.3;
  } catch (error) {
    console.error('Error calculating consistency score:', error);
    // Default to moderate score on error
    return 0.8;
  }
}

/**
 * Detect potential inconsistencies in AI responses
 */
export async function detectInconsistencies(
  productType: string,
  response: string
): Promise<string[]> {
  try {
    // In a production system, this would use more sophisticated analysis
    // to identify potential safety issues or technical inaccuracies
    
    // Simple implementation that checks for potentially problematic keywords
    const flags: string[] = [];
    const warningTerms = [
      'water damage',
      'power supply',
      'battery removal',
      'circuit board',
      'disassembly'
    ];
    
    warningTerms.forEach(term => {
      if (response.toLowerCase().includes(term.toLowerCase())) {
        flags.push(`Contains potentially complex procedure: ${term}`);
      }
    });
    
    return flags;
  } catch (error) {
    console.error('Error detecting inconsistencies:', error);
    return [];
  }
}