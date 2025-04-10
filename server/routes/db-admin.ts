/**
 * Database administration routes
 * These routes provide information about user database usage
 */
import { Router } from 'express';
import { getUserDatabaseStats, checkUserTableScaling, optimizeUserTableIndexes } from '../utils/db-helpers';
import { getDatabaseInfo } from '../db';

export const dbAdminRouter = Router();

// Public endpoint for database connection status - available to all users
dbAdminRouter.get('/connection-info', async (req, res) => {
  try {
    const info = getDatabaseInfo();
    // Return limited information to regular users
    res.json({
      status: 'connected',
      provider: info.provider,
      message: 'Database is configured to store user information only. Other application data is stored in Google Cloud Storage.',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting database connection info:', error);
    res.status(500).json({
      error: 'Failed to get database connection info',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get user database statistics
dbAdminRouter.get('/stats', async (req, res) => {
  try {
    // Check if user is authenticated and has admin role
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Unauthorized access',
        message: 'Only admin users can access database statistics'
      });
    }
    
    const stats = await getUserDatabaseStats();
    res.json(stats);
  } catch (error) {
    console.error('Error getting database stats:', error);
    res.status(500).json({
      error: 'Failed to get database statistics',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Check if database scaling is needed
dbAdminRouter.get('/scaling-check', async (req, res) => {
  try {
    // Check if user is authenticated and has admin role
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Unauthorized access',
        message: 'Only admin users can access scaling information'
      });
    }
    
    const scalingInfo = await checkUserTableScaling();
    res.json(scalingInfo);
  } catch (error) {
    console.error('Error checking scaling needs:', error);
    res.status(500).json({
      error: 'Failed to check scaling needs',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Optimize user table indexes for better performance
dbAdminRouter.post('/optimize-indexes', async (req, res) => {
  try {
    // Check if user is authenticated and has admin role
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Unauthorized access',
        message: 'Only admin users can optimize database indexes'
      });
    }
    
    const result = await optimizeUserTableIndexes();
    res.json(result);
  } catch (error) {
    console.error('Error optimizing indexes:', error);
    res.status(500).json({
      error: 'Failed to optimize indexes',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});