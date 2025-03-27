import { Express, Request, Response } from 'express';
import { 
  initializeModel, 
  predictRepairCost, 
  getModelFeatures,
  getRepairDifficulty,
  estimateRepairTime,
  getIssuesAndRecommendations
} from './repair-cost-model';

interface RepairEstimateRequest {
  productType: string;
  issueType?: string;
  partsCost?: number;
  laborHours?: number;
  complexity?: 'low' | 'medium' | 'high';
}

export async function setupRepairCostAPI(app: Express): Promise<void> {
  console.log('Setting up ML-based repair cost estimation API...');
  
  try {
    // Initialize the model when server starts
    await initializeModel();
    console.log('Repair cost prediction model initialized');
    
    // Get model information
    app.get('/api/repair-ml/info', (req: Request, res: Response) => {
      const features = getModelFeatures();
      if (!features) {
        return res.status(500).json({ error: 'Model not initialized' });
      }
      
      res.json({
        status: 'active',
        deviceTypes: features.device_type,
        issueTypes: features.issue_type,
        complexityLevels: features.complexity
      });
    });
    
    // Predict repair cost
    app.post('/api/repair-ml/estimate', async (req: Request, res: Response) => {
      try {
        const { 
          productType, 
          issueType = 'general_repair', 
          partsCost = 0,
          laborHours = 1,
          complexity = 'medium' 
        } = req.body as RepairEstimateRequest;
        
        if (!productType) {
          return res.status(400).json({ error: 'Product type is required' });
        }
        
        // Get cost prediction
        const prediction = await predictRepairCost(
          productType,
          issueType,
          partsCost,
          laborHours,
          complexity
        );
        
        // Get additional information
        const difficulty = getRepairDifficulty(prediction.predictedCost, complexity);
        const timeEstimate = estimateRepairTime(prediction.predictedCost, complexity);
        const { commonIssues, recommendations } = getIssuesAndRecommendations(productType);
        
        // Return complete estimation result
        res.json({
          ...prediction,
          difficulty,
          timeEstimate,
          commonIssues,
          recommendations,
          modelType: 'machine-learning'
        });
      } catch (error) {
        console.error('Error estimating repair cost:', error);
        res.status(500).json({
          error: 'Failed to estimate repair cost',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });
    
    console.log('ML-based repair cost estimation API is ready');
  } catch (error) {
    console.error('Failed to setup repair cost API:', error);
  }
}