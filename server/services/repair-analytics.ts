import { db } from "../db";
import { repairAnalytics, type InsertRepairAnalytics, type RepairAnalytics } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

/**
 * Track analytics for a repair request and AI response
 */
export async function trackRepairAnalytics(data: InsertRepairAnalytics): Promise<RepairAnalytics> {
  try {
    // First convert Sets to Arrays where necessary
    const analyticsRecord = {
      repair_request_id: data.repairRequestId,
      product_type: data.productType,
      issue_description: data.issueDescription,
      prompt_tokens: data.promptTokens,
      completion_tokens: data.completionTokens,
      response_time_ms: data.responseTime,
      consistency_score: data.consistencyScore,
      user_feedback: data.userFeedback,
      feedback_notes: data.feedbackNotes,
      ai_response_summary: data.aiResponseSummary,
      inconsistency_flags: data.inconsistencyFlags || []
    };
    
    // Use raw SQL query for insertion to work around TypeScript issues
    const result = await db.execute(
      sql`INSERT INTO repair_analytics 
          (repair_request_id, product_type, issue_description, prompt_tokens, 
           completion_tokens, response_time_ms, consistency_score, user_feedback, 
           feedback_notes, ai_response_summary, inconsistency_flags) 
          VALUES 
          (${analyticsRecord.repair_request_id}, ${analyticsRecord.product_type}, 
           ${analyticsRecord.issue_description}, ${analyticsRecord.prompt_tokens}, 
           ${analyticsRecord.completion_tokens}, ${analyticsRecord.response_time_ms}, 
           ${analyticsRecord.consistency_score}, ${analyticsRecord.user_feedback}, 
           ${analyticsRecord.feedback_notes}, ${analyticsRecord.ai_response_summary}, 
           ${analyticsRecord.inconsistency_flags})
          RETURNING *`
    );
    
    // Get the newly created record
    if (result.rows && result.rows.length > 0) {
      return result.rows[0] as RepairAnalytics;
    }
    
    throw new Error("Failed to insert repair analytics record");
  } catch (error) {
    console.error("Failed to track repair analytics:", error);
    throw new Error("Failed to track repair analytics");
  }
}

/**
 * Calculate consistency score by comparing with similar requests
 * Returns a value between 0 and 1, where 1 indicates perfect consistency
 */
export async function calculateConsistencyScore(
  productType: string,
  issueDescription: string,
  aiResponseSummary: string
): Promise<number> {
  try {
    // Find similar requests based on product type
    const similarRequests = await db.query.repairAnalytics.findMany({
      where: eq(repairAnalytics.productType, productType),
      orderBy: repairAnalytics.timestamp,
      limit: 10
    });

    if (similarRequests.length < 2) {
      // Not enough data to calculate consistency
      return 1.0; // Default to perfect score when not enough comparison data
    }

    // Compare response summary similarity (simplified approach)
    // In a production implementation, you'd use more sophisticated NLP techniques
    const responseSimilarities = similarRequests.map(request => {
      const summaryA = request.aiResponseSummary || "";
      const summaryB = aiResponseSummary;
      
      // Calculate Jaccard similarity between words in summaries
      const wordsAArray = summaryA.toLowerCase().split(/\s+/).filter(Boolean);
      const wordsBArray = summaryB.toLowerCase().split(/\s+/).filter(Boolean);
      
      // Create sets as arrays for compatibility
      const wordsA = Array.from(new Set(wordsAArray));
      const wordsB = Array.from(new Set(wordsBArray));
      
      // Calculate intersection and union sizes manually
      const intersection = wordsA.filter(word => wordsBArray.includes(word));
      const union = Array.from(new Set([...wordsAArray, ...wordsBArray]));
      
      return intersection.length / union.length;
    });

    // Average the similarities for a final score
    const avgSimilarity = responseSimilarities.reduce((sum, val) => sum + val, 0) / responseSimilarities.length;
    return avgSimilarity;
  } catch (error) {
    console.error("Failed to calculate consistency score:", error);
    return 1.0; // Default to perfect score on error
  }
}

/**
 * Detect potential inconsistencies in AI responses
 */
export async function detectInconsistencies(
  productType: string, 
  aiResponseSummary: string
): Promise<string[]> {
  const inconsistencyFlags: string[] = [];
  
  try {
    // Get previous responses for this product type
    const previousResponses = await db.query.repairAnalytics.findMany({
      where: eq(repairAnalytics.productType, productType),
      orderBy: repairAnalytics.timestamp,
      limit: 5
    });
    
    if (previousResponses.length === 0) {
      return inconsistencyFlags;
    }
    
    // Compare with each previous response
    for (const prevResponse of previousResponses) {
      if (!prevResponse.aiResponseSummary) continue;
      
      // Extract repair steps or key information (simplified)
      const prevKeywords = extractKeyPhrases(prevResponse.aiResponseSummary);
      const currentKeywords = extractKeyPhrases(aiResponseSummary);
      
      // Check for contradictions in repair steps
      const contradictions = findContradictions(prevKeywords, currentKeywords);
      if (contradictions.length > 0) {
        inconsistencyFlags.push(`Contradictions detected: ${contradictions.join(', ')}`);
      }
      
      // Check if common repair steps are missing
      const commonSteps = findCommonRepairSteps(prevResponse.aiResponseSummary, aiResponseSummary);
      if (commonSteps.missing.length > 0) {
        inconsistencyFlags.push(`Missing common steps: ${commonSteps.missing.join(', ')}`);
      }
      
      // Check for significant length discrepancies (indicating missing content)
      const lengthRatio = aiResponseSummary.length / prevResponse.aiResponseSummary.length;
      if (lengthRatio < 0.5 || lengthRatio > 2) {
        inconsistencyFlags.push(`Significant length difference (ratio: ${lengthRatio.toFixed(2)})`);
      }
    }
    
    // Remove duplicates manually without using spread operator on Set
    return inconsistencyFlags.filter((value, index, self) => self.indexOf(value) === index);
  } catch (error) {
    console.error("Failed to detect inconsistencies:", error);
    return inconsistencyFlags;
  }
}

/**
 * Get repair analytics statistics
 */
export async function getRepairAnalyticsStats() {
  try {
    // Get average consistency score
    const avgConsistencyResult = await db.select({ 
      average: sql<number>`avg(${repairAnalytics.consistencyScore})` 
    }).from(repairAnalytics);
    
    // Get product types with most inconsistencies
    const productTypesWithIssues = await db.execute(
      sql`SELECT product_type as "productType", count(*) as "issueCount"
          FROM repair_analytics 
          WHERE array_length(inconsistency_flags, 1) > 0
          GROUP BY product_type
          ORDER BY count(*) DESC
          LIMIT 5`
    ).then(result => result.rows as { productType: string; issueCount: number }[]);
    
    // Get average user feedback score
    const avgFeedbackResult = await db.select({ 
      average: sql<number>`avg(${repairAnalytics.userFeedback})` 
    }).from(repairAnalytics);
    
    // Get average response time
    const avgResponseTimeResult = await db.select({ 
      average: sql<number>`avg(${repairAnalytics.responseTime})` 
    }).from(repairAnalytics);
    
    return {
      averageConsistencyScore: avgConsistencyResult[0]?.average || 0,
      averageUserFeedback: avgFeedbackResult[0]?.average || 0,
      averageResponseTimeMs: avgResponseTimeResult[0]?.average || 0,
      productTypesWithIssues: productTypesWithIssues,
      totalRecordsAnalyzed: await db.select({ count: sql<number>`count(*)` }).from(repairAnalytics).then(res => res[0]?.count || 0)
    };
  } catch (error) {
    console.error("Failed to get repair analytics stats:", error);
    throw new Error("Failed to get repair analytics statistics");
  }
}

// Helper functions for inconsistency detection

function extractKeyPhrases(text: string): string[] {
  // Simple implementation - extract sentences with important keywords
  const importantKeywords = ['first', 'then', 'next', 'finally', 'must', 'never', 'always', 'caution'];
  
  return text.split(/[.!?]+/)
    .map(sentence => sentence.trim())
    .filter(sentence => {
      const lower = sentence.toLowerCase();
      return importantKeywords.some(keyword => lower.includes(keyword));
    });
}

function findContradictions(phrases1: string[], phrases2: string[]): string[] {
  const contradictions: string[] = [];
  
  // Simple implementation - look for opposite instructions
  const opposites: [string, string][] = [
    ['clockwise', 'counterclockwise'],
    ['hot', 'cold'],
    ['high', 'low'],
    ['turn on', 'turn off'],
    ['open', 'close'],
    ['remove', 'install'],
    ['increase', 'decrease']
  ];
  
  for (const phrase1 of phrases1) {
    for (const phrase2 of phrases2) {
      for (const [word1, word2] of opposites) {
        if (phrase1.toLowerCase().includes(word1) && phrase2.toLowerCase().includes(word2) && 
            phrase1.toLowerCase().includes(word2) === false && 
            phrase2.toLowerCase().includes(word1) === false) {
          contradictions.push(`"${phrase1}" vs "${phrase2}"`);
        }
      }
    }
  }
  
  return contradictions;
}

function findCommonRepairSteps(text1: string, text2: string): { common: string[], missing: string[] } {
  // Extract steps - look for numbered lists or step markers
  const stepRegex = /(?:step|[0-9]+)[.:]?\s*([^.!?]+)/gi;
  
  const steps1: string[] = [];
  const steps2: string[] = [];
  
  let match;
  while ((match = stepRegex.exec(text1)) !== null) {
    if (match[1]) steps1.push(match[1].trim());
  }
  
  stepRegex.lastIndex = 0; // Reset regex
  
  while ((match = stepRegex.exec(text2)) !== null) {
    if (match[1]) steps2.push(match[1].trim());
  }
  
  // Find common steps using simple word overlap
  const common: string[] = [];
  const missing: string[] = [];
  
  for (const step1 of steps1) {
    const words1Array = step1.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    
    let foundMatch = false;
    for (const step2 of steps2) {
      const words2Array = step2.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      
      // Check if they share significant words
      const intersection = words1Array.filter(word => words2Array.includes(word));
      if (intersection.length >= 2 && intersection.length / words1Array.length > 0.3) {
        common.push(step1);
        foundMatch = true;
        break;
      }
    }
    
    if (!foundMatch) {
      missing.push(step1);
    }
  }
  
  return { common, missing };
}