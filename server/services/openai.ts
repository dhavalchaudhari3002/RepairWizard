import OpenAI from "openai";
import { env } from "process";
import { trackRepairAnalytics, calculateConsistencyScore, detectInconsistencies } from "./repair-analytics";
import { InsertRepairAnalytics } from "@shared/schema";
import { db } from "../db";
import { repairRequests } from "@shared/schema";
import { eq } from "drizzle-orm";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY
});

interface RepairStep {
  step: number;
  title: string;
  description: string;
  imageDescription: string;
  safetyWarnings?: string[];
  tools?: string[];
}

interface RepairGuide {
  title: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  estimatedTime: string;
  steps: RepairStep[];
  warnings: string[];
  tools: string[];
  videoKeywords: string[];
}

interface RepairDiagnostic {
  symptomInterpretation: string;
  possibleCauses: string[];
  informationGaps: string[];
  diagnosticSteps: string[];
  likelySolutions: string[];
  safetyWarnings: string[];
}

interface RepairQuestionInput {
  question: string;
  productType: string;
  issueDescription?: string;
  imageUrl?: string;
  context?: { role: "user" | "assistant"; content: string }[];
  currentStep?: number;
}

export async function generateRepairGuide(productType: string, issue: string, repairRequestId?: number): Promise<RepairGuide> {
  try {
    console.log("Starting guide generation for:", { productType, issue });
    const startTime = Date.now();

    const systemPrompt = `You are a repair expert specializing in electronics and appliances.
Generate comprehensive, step-by-step repair guides with a focus on safety and best practices.
Provide your response in this exact JSON format:
{
  "title": "Guide title",
  "difficulty": "Beginner|Intermediate|Advanced",
  "estimatedTime": "Estimated completion time",
  "steps": [
    {
      "step": 1,
      "title": "Step title",
      "description": "Detailed step description",
      "imageDescription": "Description of what image would be helpful here",
      "safetyWarnings": ["List of safety warnings specific to this step"],
      "tools": ["Tools needed for this step"]
    }
  ],
  "warnings": ["General safety warnings"],
  "tools": ["All required tools"],
  "videoKeywords": ["Keywords for finding relevant video tutorials"]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Generate a repair guide for ${productType}. Issue: ${issue}`
        }
      ],
      temperature: 0.3, // Set to 0.3 for balanced consistency and slight variability
      max_tokens: 2000
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    console.log("Received response from OpenAI:", content);
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    let result: RepairGuide;
    try {
      result = JSON.parse(content);
    } catch (error) {
      console.error("Failed to parse JSON response:", content);
      throw new Error("Invalid JSON response from OpenAI");
    }

    // Validate guide structure
    if (!result.title || !Array.isArray(result.steps) || result.steps.length === 0) {
      console.error("Invalid guide structure:", result);
      throw new Error("Generated guide does not match required format");
    }

    // Validate each step
    result.steps.forEach((step, index) => {
      if (!step.title || !step.description || !step.imageDescription) {
        throw new Error(`Step ${index + 1} is missing required fields`);
      }
    });

    // Track analytics if repairRequestId is provided
    if (repairRequestId) {
      // Create a summary of the AI response for analysis
      const stepsSummary = result.steps.map(step => 
        `Step ${step.step}: ${step.title}`
      ).join('. ');
      
      const responseSummary = `${result.title}. Difficulty: ${result.difficulty}. Time: ${result.estimatedTime}. ${stepsSummary}`;
      
      try {
        // Calculate tokens (approximate method - production would use exact counts)
        const promptTokens = systemPrompt.length + productType.length + issue.length;
        const completionTokens = content.length;
        
        // Get repair request details
        const repairRequest = await db.query.repairRequests.findFirst({
          where: eq(repairRequests.id, repairRequestId)
        });
        
        if (repairRequest) {
          // Calculate consistency score
          const consistencyScore = await calculateConsistencyScore(
            productType,
            issue,
            responseSummary
          );
          
          // Check for potential inconsistencies
          const inconsistencyFlags = await detectInconsistencies(
            productType,
            responseSummary
          );
          
          // Track the analytics data
          await trackRepairAnalytics({
            repairRequestId,
            productType,
            issueDescription: issue,
            promptTokens,
            completionTokens,
            responseTime,
            consistencyScore,
            aiResponseSummary: responseSummary,
            inconsistencyFlags
          });
          
          console.log("Tracked repair guide analytics with consistency score:", consistencyScore);
        }
      } catch (analyticsError) {
        // Don't fail the main operation if analytics tracking fails
        console.error("Failed to track analytics:", analyticsError);
      }
    }

    return result;
  } catch (error) {
    console.error("Error in generateRepairGuide:", error);
    throw new Error("Failed to generate repair guide: " + 
      (error instanceof Error ? error.message : String(error))
    );
  }
}

export async function generateRepairDiagnostic(productType: string, issueDescription: string, repairRequestId?: number): Promise<RepairDiagnostic> {
  try {
    console.log("Starting diagnostic generation for:", { productType, issueDescription });
    const startTime = Date.now();

    const systemPrompt = `You are an AI assistant simulating a highly experienced diagnostic technician for electronic devices and other products. 
Your goal is to analyze the user's description, identify the most likely root cause(s) of the problem, and suggest logical next steps for diagnosis or repair, prioritizing safety and accuracy.

Provide your response in this exact JSON format:
{
  "symptomInterpretation": "Re-state the key symptoms described by the user",
  "possibleCauses": [
    "First potential root cause (most probable) - explain why it's possible",
    "Second potential root cause - explain why it's possible",
    "Additional causes as needed"
  ],
  "informationGaps": [
    "Crucial missing information #1",
    "Crucial missing information #2",
    "Additional information gaps as needed"
  ],
  "diagnosticSteps": [
    "Simple, non-invasive diagnostic step #1 - indicate if caution is needed",
    "Simple, non-invasive diagnostic step #2 - indicate if caution is needed",
    "Additional diagnostic steps as needed"
  ],
  "likelySolutions": [
    "Likely repair solution path #1 - component replacement, software configuration, etc.",
    "Likely repair solution path #2",
    "Additional solution paths as needed"
  ],
  "safetyWarnings": [
    "Relevant safety precaution #1 (electricity, static, batteries, etc.)",
    "Statement about limited analysis based on information provided",
    "Disclaimer about professional help requirements",
    "Warning NOT to perform complex/dangerous steps without expertise"
  ]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Analyze the following repair request:

Product Type: ${productType}
Issue Description: ${issueDescription}

Based on the Product Type and Issue Description, please perform a detailed analysis.`
        }
      ],
      temperature: 0.5,
      max_tokens: 1000
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    console.log("Received diagnostic response from OpenAI");
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    let result: RepairDiagnostic;
    try {
      result = JSON.parse(content);
    } catch (error) {
      console.error("Failed to parse JSON response:", content);
      throw new Error("Invalid JSON response from OpenAI");
    }

    // Validate diagnostic structure
    if (!result.symptomInterpretation || !Array.isArray(result.possibleCauses) || !Array.isArray(result.diagnosticSteps)) {
      console.error("Invalid diagnostic structure:", result);
      throw new Error("Generated diagnostic does not match required format");
    }

    // Track analytics if repairRequestId is provided
    if (repairRequestId) {
      try {
        // Create a summary of the AI response for analysis
        const causesSummary = result.possibleCauses.join('. ');
        const stepsSummary = result.diagnosticSteps.join('. ');
        
        const responseSummary = `Symptoms: ${result.symptomInterpretation}. Causes: ${causesSummary}. Steps: ${stepsSummary}`;
        
        // Calculate tokens (approximate method)
        const promptTokens = systemPrompt.length + productType.length + issueDescription.length;
        const completionTokens = content.length;
        
        // Get repair request details
        const repairRequest = await db.query.repairRequests.findFirst({
          where: eq(repairRequests.id, repairRequestId)
        });
        
        if (repairRequest) {
          // Calculate consistency score
          const consistencyScore = await calculateConsistencyScore(
            productType,
            issueDescription,
            responseSummary
          );
          
          // Check for potential inconsistencies
          const inconsistencyFlags = await detectInconsistencies(
            productType,
            responseSummary
          );
          
          // Track the analytics data
          await trackRepairAnalytics({
            repairRequestId,
            productType,
            issueDescription,
            promptTokens,
            completionTokens,
            responseTime,
            consistencyScore,
            aiResponseSummary: responseSummary,
            inconsistencyFlags
          });
          
          console.log("Tracked diagnostic analytics with consistency score:", consistencyScore);
        }
      } catch (analyticsError) {
        // Don't fail the main operation if analytics tracking fails
        console.error("Failed to track analytics:", analyticsError);
      }
    }

    return result;
  } catch (error) {
    console.error("Error in generateRepairDiagnostic:", error);
    throw new Error("Failed to generate repair diagnostic: " + 
      (error instanceof Error ? error.message : String(error))
    );
  }
}

export async function getRepairAnswer(input: RepairQuestionInput, repairRequestId?: number): Promise<{ answer: string }> {
  try {
    const startTime = Date.now();
    
    const systemPrompt = `You are a repair expert specializing in electronics and appliances.
Provide helpful, accurate, and concise answers to repair-related questions.
Focus on safety and practical solutions. When uncertain, recommend professional help.
Format your response as a JSON object with an "answer" field containing your response.`;

    const contextPrompt = `Product Type: ${input.productType}${
      input.issueDescription ? `\nReported Issue: ${input.issueDescription}` : ''
    }${
      input.currentStep !== undefined ? `\nCurrent Repair Guide Step: ${input.currentStep + 1}` : ''
    }`;

    const messages: any[] = [
      { role: "system", content: systemPrompt }
    ];
    
    // Add previous conversation context if it exists
    if (input.context && input.context.length > 0) {
      messages.push(...input.context);
    }
    
    // Add the current question as the most recent message
    if (input.imageUrl) {
      messages.push({
        role: "user",
        content: [
          {
            type: "text",
            text: `${contextPrompt}\nAnalyze this image and answer this question: ${input.question}`
          },
          {
            type: "image_url",
            image_url: { url: input.imageUrl }
          }
        ]
      });
    } else {
      messages.push({
        role: "user",
        content: `${contextPrompt}\nQuestion: ${input.question}`
      });
    }

    // Use a longer context window for conversation history
    const response = await openai.chat.completions.create({
      model: input.imageUrl ? "gpt-4-vision-preview" : "gpt-4",
      messages,
      temperature: 0.3, // Set to 0.3 for balanced consistency and slight variability
      max_tokens: 800
    });

    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    let answer: string;
    try {
      const result = JSON.parse(content);
      answer = result.answer || content;
    } catch (error) {
      // If parsing fails, use the raw content
      answer = content;
    }
    
    // Track analytics if repairRequestId is provided
    if (repairRequestId) {
      try {
        // Calculate tokens (approximate method)
        const promptTokens = systemPrompt.length + contextPrompt.length + input.question.length;
        const completionTokens = content.length;
        
        // Calculate consistency score
        const consistencyScore = await calculateConsistencyScore(
          input.productType,
          input.question,
          answer
        );
        
        // Check for potential inconsistencies
        const inconsistencyFlags = await detectInconsistencies(
          input.productType,
          answer
        );
        
        // Track the analytics data
        await trackRepairAnalytics({
          repairRequestId,
          productType: input.productType,
          issueDescription: input.question,
          promptTokens,
          completionTokens,
          responseTime,
          consistencyScore,
          aiResponseSummary: answer,
          inconsistencyFlags
        });
        
        console.log("Tracked Q&A analytics with consistency score:", consistencyScore);
      } catch (analyticsError) {
        // Don't fail the main operation if analytics tracking fails
        console.error("Failed to track Q&A analytics:", analyticsError);
      }
    }

    return { answer };
  } catch (error) {
    console.error("Error getting repair answer:", error);
    throw new Error("Failed to get repair answer: " + 
      (error instanceof Error ? error.message : String(error))
    );
  }
}