import { db } from "../db";
import { errors, insertErrorSchema } from "@shared/schema";
import { and, eq, gte } from "drizzle-orm";

// App version - typically would come from package.json or environment variable
const APP_VERSION = process.env.APP_VERSION || '1.0.0';

// Default environment - typically would come from environment variable
const ENVIRONMENT = process.env.NODE_ENV || 'development';

// PII patterns to scrub from error details
const PII_PATTERNS = [
  // Email pattern
  { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, replacement: '[EMAIL REDACTED]' },
  // Credit card pattern (simple version - would use better regex in production)
  { pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g, replacement: '[CREDIT CARD REDACTED]' },
  // Phone number patterns
  { pattern: /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, replacement: '[PHONE REDACTED]' },
  // Social security number pattern
  { pattern: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g, replacement: '[SSN REDACTED]' },
  // IP address pattern
  { pattern: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, replacement: '[IP REDACTED]' },
  // Password fields (often included in error contexts)
  { pattern: /"password"\s*:\s*"[^"]+"/g, replacement: '"password":"[REDACTED]"' },
  { pattern: /"password=([^&]+)"/g, replacement: '"password=[REDACTED]"' },
  // Authentication tokens (often included in errors)
  { pattern: /Bearer\s+[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.[A-Za-z0-9-_.+/=]+/g, replacement: 'Bearer [TOKEN REDACTED]' },
  // API keys (assuming pattern like "key-" followed by alphanumeric characters)
  { pattern: /key-[a-zA-Z0-9]{16,}/g, replacement: '[API KEY REDACTED]' },
];

// Cache to reduce database load
let errorCache = {
  errors: [] as any[],
  lastCleared: Date.now()
};

// Clear cache every hour
const CACHE_DURATION = 3600000;

// Generate a request ID if one doesn't exist
function generateRequestId() {
  return `req-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
}

// Scrub PII from text
function scrubPII(text: string): string {
  if (!text) return text;
  
  let scrubbedText = text;
  
  // Apply all PII pattern replacements
  PII_PATTERNS.forEach(({ pattern, replacement }) => {
    scrubbedText = scrubbedText.replace(pattern, replacement);
  });
  
  return scrubbedText;
}

// Utility to extract severity from error
function determineSeverity(error: Error, context?: any): 'low' | 'medium' | 'high' | 'critical' {
  // Implement logic to determine severity based on error type or context
  // This is a simple implementation - in a real app you'd have more sophisticated rules
  
  // Critical errors that affect app stability
  if (
    error.name === 'ReferenceError' ||
    error.name === 'TypeError' ||
    error.message.includes('database') ||
    error.message.includes('authentication') ||
    error.message.toLowerCase().includes('critical')
  ) {
    return 'critical';
  }
  
  // High severity for validation or security issues
  if (
    error.name === 'ValidationError' ||
    error.name === 'SecurityError' ||
    error.message.includes('security') ||
    error.message.includes('access denied') ||
    error.message.includes('forbidden')
  ) {
    return 'high';
  }
  
  // Medium severity for most operational errors
  if (
    error.name === 'Error' ||
    error.message.includes('failed') ||
    error.message.includes('invalid')
  ) {
    return 'medium';
  }
  
  // Low severity for everything else
  return 'low';
}

// Extract component/module from stack trace
function extractComponent(stack?: string): string | undefined {
  if (!stack) return undefined;
  
  // Try to find a meaningful component name from the stack trace
  // This is a simple implementation - in a real app you'd have better parsing logic
  const stackLines = stack.split('\n');
  
  for (const line of stackLines) {
    // Look for lines that reference your app's source code
    if (line.includes('/server/') || line.includes('/client/')) {
      // Extract the path
      const match = line.match(/\/([^/]+\/[^/]+\/[^:]+):/);
      if (match && match[1]) {
        return match[1]; // Return the identified component path
      }
    }
  }
  
  return undefined;
}

/**
 * Track an error with enhanced context information
 * 
 * @param error The error object
 * @param context Additional context about the error
 */
export async function trackError(
  error: Error, 
  context?: {
    userId?: number;
    path?: string;
    requestId?: string;
    userAgent?: string;
    component?: string;
    metadata?: Record<string, any>;
    severity?: 'low' | 'medium' | 'high' | 'critical';
  }
) {
  // Create a new request ID if one wasn't provided
  const requestId = context?.requestId || generateRequestId();
  
  // Scrub PII from error messages and stack traces
  const scrubbedMessage = scrubPII(error.message);
  const scrubbedStack = error.stack ? scrubPII(error.stack) : undefined;
  
  // Scrub PII from metadata if present
  let scrubbedMetadata: Record<string, any> | undefined;
  if (context?.metadata) {
    scrubbedMetadata = {};
    for (const [key, value] of Object.entries(context.metadata)) {
      if (typeof value === 'string') {
        scrubbedMetadata[key] = scrubPII(value);
      } else {
        // For non-string values, just copy them over
        // In a production app, you'd recursively scrub objects/arrays
        scrubbedMetadata[key] = value;
      }
    }
  }
  
  // Determine severity if not provided
  const severity = context?.severity || determineSeverity(error, context);
  
  // Extract component if not provided
  const component = context?.component || extractComponent(error.stack);
  
  // Format error data with enhanced context
  const errorData = {
    message: scrubbedMessage,
    stack: scrubbedStack,
    type: error.name,
    
    // User context
    userId: context?.userId,
    
    // Request context
    path: context?.path,
    requestId,
    userAgent: context?.userAgent,
    
    // Environment context
    environment: ENVIRONMENT,
    version: APP_VERSION,
    
    // Error context
    severity,
    component,
    metadata: scrubbedMetadata,
    
    // Initial status
    resolved: false,
    
    // Timestamp will be added automatically by defaultNow()
    timestamp: new Date(),
  };

  // Validate with zod schema
  try {
    insertErrorSchema.parse(errorData);
  } catch (validationError) {
    console.error("Error validation failed:", validationError);
    // Still try to save the error, but with just the essential fields
    errorCache.errors.push({
      message: scrubbedMessage,
      type: error.name,
      stack: scrubbedStack,
      timestamp: new Date(),
    });
    return;
  }

  // Add to cache
  errorCache.errors.push(errorData);

  // Persist to database periodically or when cache gets too large
  if (errorCache.errors.length >= 100 || Date.now() - errorCache.lastCleared >= CACHE_DURATION) {
    await flushErrorCache();
  }
}

// Export the function to allow manual flushing
export async function flushErrorCache() {
  if (errorCache.errors.length === 0) {
    console.log("No errors in cache to flush");
    return;
  }

  try {
    const count = errorCache.errors.length;
    await db.insert(errors).values(errorCache.errors);
    console.log(`Flushed ${count} errors to database`);
    
    // Clear the cache after successful insert
    errorCache.errors = [];
    errorCache.lastCleared = Date.now();
  } catch (error) {
    console.error("Failed to flush error cache:", error);
  }
}

/**
 * Enhanced error statistics fetcher with additional metrics and filtering capabilities
 * 
 * @param options Optional filters and time range
 * @returns Enhanced statistics and metrics
 */
export async function getErrorStats(options?: {
  timeRange?: 'hour' | 'day' | 'week' | 'month'; // Time range for stats
  environment?: string; // Filter by environment
  component?: string; // Filter by component
  severity?: 'low' | 'medium' | 'high' | 'critical'; // Filter by severity
  version?: string; // Filter by app version
}) {
  // Default to a day if not specified
  const timeRange = options?.timeRange || 'day';
  
  const now = new Date();
  let startDate: Date;
  
  // Calculate the start date based on the time range
  switch (timeRange) {
    case 'hour':
      startDate = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
      break;
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
      break;
    case 'month':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      break;
    case 'day':
    default:
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
      break;
  }

  try {
    // Flush any pending errors in the cache
    await flushErrorCache();
    
    // Build query with filter conditions
    let conditions = [gte(errors.timestamp, startDate)];
    
    // Add optional filters if provided
    if (options?.environment) {
      conditions.push(eq(errors.environment, options.environment));
    }
    
    if (options?.component) {
      conditions.push(eq(errors.component, options.component));
    }
    
    if (options?.severity) {
      conditions.push(eq(errors.severity, options.severity));
    }
    
    if (options?.version) {
      conditions.push(eq(errors.version, options.version));
    }
    
    // Execute the query with all conditions
    const recentErrors = await db
      .select()
      .from(errors)
      .where(and(...conditions));
    
    console.log(`Found ${recentErrors.length} errors in the selected time range`);

    // Get total number of errors
    const totalErrors = recentErrors.length;
    
    // We need to calculate the error rate compared to total requests
    // For now, let's estimate error rate or set it to a reasonable default
    // In a real app, you'd calculate: (errors / total_requests) * 100
    
    // For simplicity in this implementation, we'll use a placeholder value
    // In a production app, you would track total requests in a separate table
    const totalRequests = Math.max(totalErrors * 10, 100); // Just an estimation: assume errors occur in 10% of requests
    const errorRate = (totalErrors / totalRequests) * 100;

    // Get most common error types
    const errorTypes = recentErrors.reduce((acc: Record<string, number>, curr) => {
      acc[curr.type] = (acc[curr.type] || 0) + 1;
      return acc;
    }, {});

    const commonErrors = Object.entries(errorTypes)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    // Get error severity breakdown
    const severityCounts = recentErrors.reduce((acc: Record<string, number>, curr) => {
      // Default to medium if severity is not set
      const severity = curr.severity || 'medium';
      acc[severity] = (acc[severity] || 0) + 1;
      return acc;
    }, {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    });
    
    // Get environment breakdown
    const environmentCounts = recentErrors.reduce((acc: Record<string, number>, curr) => {
      const env = curr.environment || 'unknown';
      acc[env] = (acc[env] || 0) + 1;
      return acc;
    }, {});
    
    // Get component breakdown
    const componentCounts = recentErrors.reduce((acc: Record<string, number>, curr) => {
      // Group under "unknown" if component is not set
      const component = curr.component || 'unknown';
      acc[component] = (acc[component] || 0) + 1;
      return acc;
    }, {});

    // Calculate time interval for timeline based on selected time range
    const timeIntervals = timeRange === 'hour' ? 12 : // 5-minute intervals for hour
                         timeRange === 'day' ? 24 : // Hourly for day
                         timeRange === 'week' ? 7 : // Daily for week
                         30; // Daily for month
    
    const intervalMs = timeRange === 'hour' ? 5 * 60 * 1000 : // 5 minutes
                      timeRange === 'day' ? 60 * 60 * 1000 : // 1 hour
                      24 * 60 * 60 * 1000; // 1 day
    
    // Create timeline data with appropriate intervals
    const timeline = Array.from({ length: timeIntervals }, (_, i) => {
      const intervalStart = new Date(now.getTime() - (i + 1) * intervalMs);
      const intervalEnd = new Date(now.getTime() - i * intervalMs);
      
      const count = recentErrors.filter(e => 
        e.timestamp.getTime() >= intervalStart.getTime() &&
        e.timestamp.getTime() < intervalEnd.getTime()
      ).length;
      
      // Format the timestamp based on the time range
      let label = '';
      if (timeRange === 'hour') {
        label = intervalStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else if (timeRange === 'day') {
        label = intervalStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else {
        // For week and month, use date
        label = intervalStart.toLocaleDateString([], { month: 'short', day: 'numeric' });
      }
      
      return { 
        hour: intervalStart.toISOString(), 
        label,
        count 
      };
    }).reverse();

    const maxCount = Math.max(...timeline.map(t => t.count), 1); // Ensure we don't divide by zero

    // Enhanced statistics with additional metrics
    return {
      errorRate: parseFloat(errorRate.toFixed(2)),
      totalErrors,
      totalRequests,
      unresolvedCount: recentErrors.filter(e => !e.resolved).length,
      
      // Breakdowns for visualization
      severityCounts,
      environmentCounts,
      componentCounts,
      
      // Common error data
      commonErrors,
      
      // Timeline data
      timeline,
      maxCount,
      
      // Version data if available
      versionCounts: recentErrors.reduce((acc: Record<string, number>, curr) => {
        const version = curr.version || 'unknown';
        acc[version] = (acc[version] || 0) + 1;
        return acc;
      }, {}),
      
      // Most recent errors (useful for listings)
      recentErrors: recentErrors
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 10)
        .map(e => ({
          id: e.id,
          message: e.message,
          type: e.type,
          timestamp: e.timestamp,
          severity: e.severity || 'medium',
          component: e.component,
          resolved: e.resolved
        }))
    };
  } catch (error) {
    console.error("Error calculating error statistics:", error);
    
    // Return default values in case of error
    return {
      errorRate: 0,
      totalErrors: 0,
      totalRequests: 0,
      unresolvedCount: 0,
      
      severityCounts: { low: 0, medium: 0, high: 0, critical: 0 },
      environmentCounts: { development: 0, production: 0 },
      componentCounts: {},
      
      commonErrors: [],
      
      timeline: Array.from({ length: timeRange === 'hour' ? 12 : timeRange === 'day' ? 24 : timeRange === 'week' ? 7 : 30 }, 
        (_, i) => {
          const date = new Date(now.getTime() - i * (timeRange === 'hour' ? 5 * 60 * 1000 : timeRange === 'day' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000));
          return { 
            hour: date.toISOString(),
            label: timeRange === 'hour' || timeRange === 'day' 
              ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : date.toLocaleDateString([], { month: 'short', day: 'numeric' }),
            count: 0 
          };
        }).reverse(),
      maxCount: 1,
      
      versionCounts: {},
      recentErrors: []
    };
  }
}
