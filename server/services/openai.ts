import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface RepairQuestionInput {
  question: string;
  productType: string;
  issueDescription?: string;
  imageUrl?: string;
}

interface RepairGuideStep {
  step: number;
  title: string;
  description: string;
  imageDescription: string;
  safetyWarnings?: string[];
  tools?: string[];
}

interface RepairGuide {
  title: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  estimatedTime: string;
  steps: RepairGuideStep[];
  warnings: string[];
  tools: string[];
  videoKeywords: string[];
}

export async function generateRepairGuide(productType: string, issue: string): Promise<RepairGuide> {
  try {
    console.log("Starting repair guide generation for:", { productType, issue });

    const systemPrompt = `You are an expert repair technician creating detailed repair guides.
Generate a comprehensive, step-by-step guide with safety warnings, required tools, and descriptions for helpful images.
Include search keywords for relevant tutorial videos.

Your response MUST be a valid JSON object with this exact structure:
{
  "title": "string",
  "difficulty": "Beginner" | "Intermediate" | "Advanced",
  "estimatedTime": "string",
  "steps": [
    {
      "step": number,
      "title": "string",
      "description": "string",
      "imageDescription": "string",
      "safetyWarnings": ["string"],
      "tools": ["string"]
    }
  ],
  "warnings": ["string"],
  "tools": ["string"],
  "videoKeywords": ["string"]
}

Important formatting rules:
1. Use double quotes (") for ALL strings
2. Use proper JSON syntax with commas between items
3. Do not include explanations or markdown formatting
4. Only return the JSON object, nothing else`;

    console.log("Calling OpenAI API...");
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { 
          role: "user", 
          content: `Create a detailed repair guide for ${productType} with the following issue: ${issue}`
        }
      ],
      temperature: 0.7,
      max_tokens: 1500,
      response_format: { type: "json_object" }
    });

    console.log("OpenAI API response received");
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    console.log("Raw response content:", content);

    let result: RepairGuide;
    try {
      result = JSON.parse(content);
    } catch (parseError) {
      console.error("Failed to parse OpenAI response:", content);
      throw new Error("Invalid JSON response from OpenAI");
    }

    if (!result.title || !Array.isArray(result.steps)) {
      console.error("Invalid guide format:", result);
      throw new Error("Generated guide does not match expected format");
    }

    console.log("Successfully generated repair guide:", result);
    return result;
  } catch (error) {
    console.error("Error in generateRepairGuide:", error);
    throw new Error(
      "Failed to generate repair guide: " + 
      (error instanceof Error ? error.message : String(error))
    );
  }
}

export async function getRepairAnswer({ question, productType, issueDescription, imageUrl }: RepairQuestionInput): Promise<{ answer: string }> {
  try {
    const systemPrompt = `You are a repair expert specializing in electronics and appliances.
Provide helpful, accurate, and concise answers to repair-related questions.
Focus on safety and practical solutions. When uncertain, recommend professional help.

Format your response as a JSON object:
{
  "answer": "your detailed response here"
}

Use double quotes and proper JSON syntax.`;

    const messages: any[] = [
      { role: "system", content: systemPrompt }
    ];

    const contextPrompt = `Product Type: ${productType}${
      issueDescription ? `\nReported Issue: ${issueDescription}` : ''
    }`;

    if (imageUrl) {
      messages.push({
        role: "user",
        content: [
          {
            type: "text",
            text: `${contextPrompt}\nAnalyze this image and answer this question: ${question}`
          },
          {
            type: "image_url",
            image_url: { url: imageUrl }
          }
        ],
      });
    } else {
      messages.push({
        role: "user",
        content: `${contextPrompt}\nQuestion: ${question}`
      });
    }

    const response = await openai.chat.completions.create({
      model: imageUrl ? "gpt-4-vision-preview" : "gpt-4",
      messages,
      temperature: 0.7,
      max_tokens: 500,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    try {
      const result = JSON.parse(content);
      return { answer: result.answer };
    } catch (error) {
      console.error("Failed to parse OpenAI response:", content);
      throw new Error("Invalid JSON response from OpenAI");
    }
  } catch (error) {
    console.error("Error in getRepairAnswer:", error);
    throw new Error(
      "Failed to get repair answer: " + 
      (error instanceof Error ? error.message : String(error))
    );
  }
}