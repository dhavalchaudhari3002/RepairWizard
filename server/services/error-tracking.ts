import { db } from "../db";
import { errors } from "@shared/schema";
import { and, eq, gte } from "drizzle-orm";

// In-memory error cache to reduce database load
let errorCache = {
  errors: [] as any[],
  lastCleared: Date.now()
};

// Clear cache every hour
const CACHE_DURATION = 3600000;

export async function trackError(error: Error, userId?: number) {
  const errorData = {
    message: error.message,
    stack: error.stack,
    userId,
    timestamp: new Date(),
    type: error.name,
  };

  // Add to cache
  errorCache.errors.push(errorData);

  // Persist to database periodically or when cache gets too large
  if (errorCache.errors.length >= 100 || Date.now() - errorCache.lastCleared >= CACHE_DURATION) {
    await flushErrorCache();
  }
}

async function flushErrorCache() {
  if (errorCache.errors.length === 0) return;

  try {
    await db.insert(errors).values(errorCache.errors);
    errorCache.errors = [];
    errorCache.lastCleared = Date.now();
  } catch (error) {
    console.error("Failed to flush error cache:", error);
  }
}

export async function getErrorStats() {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  try {
    // Flush any pending errors in the cache
    await flushErrorCache();
    
    // Get all errors from the last 24 hours
    const recentErrors = await db
      .select()
      .from(errors)
      .where(gte(errors.timestamp, dayAgo));

    console.log(`Found ${recentErrors.length} errors in the last 24 hours`);

    // We need to calculate the error rate compared to total requests
    // For demonstration, we're assuming all entries in the errors table represent errors
    // In a real application, you would compare with a total request count from another table
    
    // For now, let's assume a 1:1 error to request ratio for demonstration (100%)
    // In a real app, you'd calculate: (errors / total_requests) * 100
    const errorRate = 100;

    // Get most common error types
    const errorTypes = recentErrors.reduce((acc: Record<string, number>, curr) => {
      acc[curr.type] = (acc[curr.type] || 0) + 1;
      return acc;
    }, {});

    const commonErrors = Object.entries(errorTypes)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Create timeline data (hourly)
    const timeline = Array.from({ length: 24 }, (_, i) => {
      const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
      const count = recentErrors.filter(e => 
        e.timestamp.getTime() >= hour.getTime() &&
        e.timestamp.getTime() < hour.getTime() + 60 * 60 * 1000
      ).length;
      return { hour: hour.toISOString(), count };
    }).reverse();

    const maxCount = Math.max(...timeline.map(t => t.count), 1); // Ensure we don't divide by zero

    return {
      errorRate: parseFloat(errorRate.toFixed(2)),
      commonErrors,
      timeline,
      maxCount,
    };
  } catch (error) {
    console.error("Error calculating error statistics:", error);
    // Return default values in case of error
    return {
      errorRate: 0,
      commonErrors: [],
      timeline: Array.from({ length: 24 }, (_, i) => ({ 
        hour: new Date(now.getTime() - i * 60 * 60 * 1000).toISOString(),
        count: 0 
      })).reverse(),
      maxCount: 1,
    };
  }
}
