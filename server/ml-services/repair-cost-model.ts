import * as tf from '@tensorflow/tfjs';
import csv from 'csvtojson';
import * as path from 'path';
import * as fs from 'fs';

// Define interfaces for our data
interface RepairData {
  device_type: string;
  issue_type: string;
  parts_cost: number;
  labor_hours: number;
  complexity: 'low' | 'medium' | 'high';
  total_cost: number;
}

interface ModelFeatures {
  device_type: string[];
  issue_type: string[];
  complexity: string[];
}

interface TrainedModel {
  model: tf.LayersModel;
  features: ModelFeatures;
  deviceMap: Map<string, number>;
  issueMap: Map<string, number>;
  complexityMap: Map<string, number>;
  meanStdValues: {
    parts_cost: { mean: number; std: number };
    labor_hours: { mean: number; std: number };
  };
}

let trainedModel: TrainedModel | null = null;

/**
 * Load and process the repair dataset
 */
async function loadDataset(): Promise<RepairData[]> {
  const dataPath = path.join(__dirname, 'data', 'repair_dataset.csv');
  console.log('Loading dataset from:', dataPath);
  
  try {
    const csvConverter = csv();
    const rawData = await csvConverter.fromFile(dataPath);
    return rawData.map((row: any) => ({
      device_type: row.device_type,
      issue_type: row.issue_type,
      parts_cost: parseFloat(row.parts_cost),
      labor_hours: parseFloat(row.labor_hours),
      complexity: row.complexity as 'low' | 'medium' | 'high',
      total_cost: parseFloat(row.total_cost)
    }));
  } catch (error) {
    console.error('Error loading dataset:', error);
    throw new Error('Failed to load repair cost dataset');
  }
}

/**
 * Prepare data for training by extracting features and creating mappings
 */
function prepareData(data: RepairData[]): {
  features: tf.Tensor;
  labels: tf.Tensor;
  deviceMap: Map<string, number>;
  issueMap: Map<string, number>;
  complexityMap: Map<string, number>;
  featureMeta: ModelFeatures;
  meanStdValues: {
    parts_cost: { mean: number; std: number };
    labor_hours: { mean: number; std: number };
  };
} {
  // Extract unique values
  const deviceTypesSet = new Set(data.map(d => d.device_type));
  const issueTypesSet = new Set(data.map(d => d.issue_type));
  const complexityLevelsSet = new Set(data.map(d => d.complexity));
  
  const deviceTypes = Array.from(deviceTypesSet);
  const issueTypes = Array.from(issueTypesSet);
  const complexityLevels = Array.from(complexityLevelsSet);

  // Create maps for categorical features
  const deviceMap = new Map(deviceTypes.map((type, i) => [type, i]));
  const issueMap = new Map(issueTypes.map((type, i) => [type, i]));
  const complexityMap = new Map(complexityLevels.map((level, i) => [level, i]));

  // Calculate mean and standard deviation for numerical features
  const partsCosts = data.map(d => d.parts_cost);
  const laborHours = data.map(d => d.labor_hours);
  
  const partsMean = partsCosts.reduce((a, b) => a + b, 0) / partsCosts.length;
  const partsStd = Math.sqrt(partsCosts.map(x => Math.pow(x - partsMean, 2)).reduce((a, b) => a + b, 0) / partsCosts.length);
  
  const laborMean = laborHours.reduce((a, b) => a + b, 0) / laborHours.length;
  const laborStd = Math.sqrt(laborHours.map(x => Math.pow(x - laborMean, 2)).reduce((a, b) => a + b, 0) / laborHours.length);

  // Create feature arrays
  const features = data.map(d => [
    deviceMap.get(d.device_type) as number,
    issueMap.get(d.issue_type) as number,
    complexityMap.get(d.complexity) as number,
    (d.parts_cost - partsMean) / partsStd,  // Normalize parts cost
    (d.labor_hours - laborMean) / laborStd   // Normalize labor hours
  ]);

  const labels = data.map(d => d.total_cost);

  return {
    features: tf.tensor2d(features),
    labels: tf.tensor1d(labels),
    deviceMap,
    issueMap,
    complexityMap,
    featureMeta: {
      device_type: deviceTypes,
      issue_type: issueTypes,
      complexity: complexityLevels
    },
    meanStdValues: {
      parts_cost: { mean: partsMean, std: partsStd },
      labor_hours: { mean: laborMean, std: laborStd }
    }
  };
}

/**
 * Create and train the machine learning model
 */
async function trainModel(
  features: tf.Tensor, 
  labels: tf.Tensor
): Promise<tf.LayersModel> {
  // Define the model architecture
  const model = tf.sequential();
  
  // Input layer with 5 features
  model.add(tf.layers.dense({
    units: 16,
    activation: 'relu',
    inputShape: [5]
  }));
  
  // Hidden layer
  model.add(tf.layers.dense({
    units: 8,
    activation: 'relu'
  }));
  
  // Output layer - regression for cost prediction
  model.add(tf.layers.dense({
    units: 1
  }));
  
  // Compile the model
  model.compile({
    optimizer: tf.train.adam(),
    loss: 'meanSquaredError',
    metrics: ['mse']
  });
  
  // Train the model
  await model.fit(features, labels, {
    epochs: 100,
    batchSize: 8,
    shuffle: true,
    validationSplit: 0.2,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        if (epoch % 10 === 0) {
          console.log(`Epoch ${epoch}: loss = ${logs?.loss.toFixed(3)}, mse = ${logs?.mse.toFixed(3)}`);
        }
      }
    }
  });
  
  return model;
}

/**
 * Train or load the repair cost estimation model
 */
export async function initializeModel(): Promise<void> {
  try {
    console.log('Initializing repair cost prediction model...');
    
    // Load and prepare the dataset
    const data = await loadDataset();
    const {
      features,
      labels,
      deviceMap,
      issueMap,
      complexityMap,
      featureMeta,
      meanStdValues
    } = prepareData(data);
    
    // Train the model
    console.log('Training repair cost model...');
    const model = await trainModel(features, labels);
    
    // Save the trained model and metadata
    trainedModel = {
      model,
      features: featureMeta,
      deviceMap,
      issueMap,
      complexityMap,
      meanStdValues
    };
    
    console.log('Model training complete!');
  } catch (error) {
    console.error('Failed to initialize repair cost model:', error);
    throw error;
  }
}

/**
 * Predict the repair cost based on input parameters
 */
export async function predictRepairCost(
  deviceType: string,
  issueType: string = 'general_repair',
  partsCost: number = 0,
  laborHours: number = 1,
  complexity: 'low' | 'medium' | 'high' = 'medium'
): Promise<{
  predictedCost: number;
  costRange: { min: number; max: number };
  confidence: number;
}> {
  // Ensure model is loaded
  if (!trainedModel) {
    await initializeModel();
  }
  
  if (!trainedModel) {
    throw new Error('Failed to initialize model');
  }
  
  // Normalize the device type input
  const normalizedDeviceType = deviceType.toLowerCase().trim();
  
  // Get device type index (use closest match if exact match not found)
  let deviceIndex = -1;
  
  // Try exact match first
  if (trainedModel.deviceMap.has(normalizedDeviceType)) {
    deviceIndex = trainedModel.deviceMap.get(normalizedDeviceType) as number;
  } else {
    // Try to find the closest matching device
    const possibleDevices = Array.from(trainedModel.deviceMap.keys());
    const matchingDevice = possibleDevices.find(device => 
      normalizedDeviceType.includes(device) || device.includes(normalizedDeviceType)
    );
    
    if (matchingDevice) {
      deviceIndex = trainedModel.deviceMap.get(matchingDevice) as number;
    } else {
      // If no match found, use general default
      console.warn(`No matching device found for "${normalizedDeviceType}", using first available device`);
      deviceIndex = 0; // Use the first device as default
    }
  }
  
  // Handle issue type similarly
  const normalizedIssueType = issueType.toLowerCase().trim();
  let issueIndex = -1;
  
  if (trainedModel.issueMap.has(normalizedIssueType)) {
    issueIndex = trainedModel.issueMap.get(normalizedIssueType) as number;
  } else {
    console.warn(`No matching issue type found for "${normalizedIssueType}", using default`);
    issueIndex = 0; // Use the first issue as default
  }
  
  // Get complexity index
  const complexityIndex = trainedModel.complexityMap.get(complexity) as number;
  
  // Normalize numerical features
  const normalizedPartsCost = 
    (partsCost - trainedModel.meanStdValues.parts_cost.mean) / 
    trainedModel.meanStdValues.parts_cost.std;
    
  const normalizedLaborHours = 
    (laborHours - trainedModel.meanStdValues.labor_hours.mean) / 
    trainedModel.meanStdValues.labor_hours.std;
  
  // Prepare input tensor
  const inputTensor = tf.tensor2d([
    [deviceIndex, issueIndex, complexityIndex, normalizedPartsCost, normalizedLaborHours]
  ]);
  
  // Make prediction
  const predictionTensor = trainedModel.model.predict(inputTensor) as tf.Tensor;
  const prediction = await predictionTensor.array();
  // Handle the nested array structure safely
  const predictionArray = prediction as number[][];
  const predictedCost = Math.round(predictionArray[0][0]);
  
  // Clean up tensors
  inputTensor.dispose();
  predictionTensor.dispose();
  
  // Create cost range based on complexity
  let rangePercentage = 0.15; // Default 15% variation
  
  if (complexity === 'low') {
    rangePercentage = 0.1; // 10% variation for low complexity
  } else if (complexity === 'high') {
    rangePercentage = 0.25; // 25% variation for high complexity
  }
  
  const costRange = {
    min: Math.round(predictedCost * (1 - rangePercentage)),
    max: Math.round(predictedCost * (1 + rangePercentage))
  };
  
  // Calculate confidence score (simplified)
  const confidence = complexity === 'low' ? 0.9 : 
                     complexity === 'medium' ? 0.8 : 0.7;
  
  return {
    predictedCost,
    costRange,
    confidence
  };
}

/**
 * Get device types and issue types from the model
 */
export function getModelFeatures(): ModelFeatures | null {
  return trainedModel?.features || null;
}

/**
 * Determines repair difficulty based on cost and complexity
 */
export function getRepairDifficulty(cost: number, complexity: string): 'Easy' | 'Moderate' | 'Hard' {
  if (complexity === 'low' || cost < 80) {
    return 'Easy';
  } else if (complexity === 'high' || cost > 200) {
    return 'Hard';
  } else {
    return 'Moderate';
  }
}

/**
 * Estimate the repair time based on complexity and cost
 */
export function estimateRepairTime(cost: number, complexity: string): string {
  if (complexity === 'low' || cost < 80) {
    return '30-60 minutes';
  } else if (complexity === 'medium' || (cost >= 80 && cost <= 200)) {
    return '1-2 hours';
  } else {
    return '2-4 hours';
  }
}

/**
 * Generate common issues and recommendations based on device type
 */
export function getIssuesAndRecommendations(deviceType: string): {
  commonIssues: string[];
  recommendations: string[];
} {
  // Default responses
  const defaultResponse = {
    commonIssues: [
      "General wear and tear",
      "Power issues",
      "Performance problems"
    ],
    recommendations: [
      "Professional assessment recommended",
      "Consider replacement if repair cost exceeds 50% of replacement value",
      "Backup data or take photos before repairs"
    ]
  };

  // Normalized device type
  const normalizedType = deviceType.toLowerCase().trim();
  
  // Device-specific information
  const deviceInfo: Record<string, {
    commonIssues: string[];
    recommendations: string[];
  }> = {
    laptop: {
      commonIssues: [
        "Won't power on",
        "Screen problems",
        "Keyboard issues",
        "Battery not charging",
        "Overheating"
      ],
      recommendations: [
        "Backup data before repair",
        "Professional repair recommended for internal components",
        "Consider upgrading RAM or SSD during repair",
        "Compare repair costs to replacement value"
      ]
    },
    phone: {
      commonIssues: [
        "Cracked screen",
        "Battery draining quickly",
        "Charging port issues",
        "Water damage",
        "Camera not working"
      ],
      recommendations: [
        "Backup data before repair",
        "Screen repairs often require professional tools",
        "Consider upgrading if device is over 3 years old",
        "Use a case and screen protector after repair"
      ]
    },
    chair: {
      commonIssues: [
        "Wobbly legs",
        "Torn upholstery",
        "Broken armrests",
        "Damaged casters",
        "Seat cushion compression"
      ],
      recommendations: [
        "Most wooden chair repairs can be done DIY with wood glue and clamps",
        "Office chair parts are often available online for replacement",
        "Consider professional reupholstering for antique or high-value chairs",
        "Preventative maintenance extends chair life"
      ]
    },
    refrigerator: {
      commonIssues: [
        "Not cooling properly",
        "Ice maker issues",
        "Water leaking",
        "Strange noises",
        "Door seal problems"
      ],
      recommendations: [
        "Refrigerant issues require professional service",
        "Clean coils every 6 months to prevent issues",
        "Some mechanical parts can be replaced DIY",
        "Consider energy efficiency when evaluating repair vs. replace"
      ]
    }
  };
  
  // Find matching device type
  for (const [key, value] of Object.entries(deviceInfo)) {
    if (normalizedType.includes(key) || key.includes(normalizedType)) {
      return value;
    }
  }
  
  return defaultResponse;
}