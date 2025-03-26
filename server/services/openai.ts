import OpenAI from "openai";
import { env } from "process";

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

interface RepairQuestionInput {
  question: string;
  productType: string;
  issueDescription?: string;
  imageUrl?: string;
  context?: { role: "user" | "assistant"; content: string }[];
  currentStep?: number;
}

export async function generateRepairGuide(productType: string, issue: string): Promise<RepairGuide> {
  try {
    console.log("Starting guide generation for:", { productType, issue });

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
      temperature: 0.7,
      max_tokens: 2000
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    console.log("Received response from OpenAI:", content);

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

    return result;
  } catch (error) {
    console.error("Error in generateRepairGuide:", error);
    throw new Error("Failed to generate repair guide: " + 
      (error instanceof Error ? error.message : String(error))
    );
  }
}

export async function getRepairAnswer(input: RepairQuestionInput): Promise<{ answer: string }> {
  try {
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
      temperature: 0.7,
      max_tokens: 800
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    try {
      return JSON.parse(content);
    } catch (error) {
      // If parsing fails, wrap the response in a JSON structure
      return { answer: content };
    }
  } catch (error) {
    console.error("Error getting repair answer:", error);
    throw new Error("Failed to get repair answer: " + 
      (error instanceof Error ? error.message : String(error))
    );
  }
}