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

    const systemPrompt = 
      'You are an expert repair technician creating detailed repair guides. ' +
      'Generate a comprehensive, step-by-step guide with safety warnings, ' +
      'required tools, and descriptions for helpful images. Include search keywords for relevant tutorial videos. ' +
      'Format your response as a valid JSON object using double quotes (") instead of single quotes (\') with the following structure:\n' +
      '{\n' +
      '  "title": "string",\n' +
      '  "difficulty": "Beginner" | "Intermediate" | "Advanced",\n' +
      '  "estimatedTime": "string",\n' +
      '  "steps": [{ "step": number, "title": "string", "description": "string", "imageDescription": "string", "safetyWarnings": ["string"], "tools": ["string"] }],\n' +
      '  "warnings": ["string"],\n' +
      '  "tools": ["string"],\n' +
      '  "videoKeywords": ["string"]\n' +
      '}';

    console.log("Calling OpenAI API...");
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { 
          role: "user", 
          content: `Create a detailed repair guide for ${productType} with the following issue: ${issue}. ` +
                   `Include step-by-step instructions, required tools, safety warnings, and image descriptions for each step.`
        }
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });

    console.log("OpenAI API response received");

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    console.log("Parsing response content...");
    let result: RepairGuide;
    try {
      // Convert single quotes to double quotes if necessary
      const jsonString = content.replace(/'/g, '"').replace(/\s+/g, ' ');
      result = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("Failed to parse OpenAI response:", content);
      throw new Error("Invalid JSON response from OpenAI");
    }

    if (!result.title || !Array.isArray(result.steps)) {
      console.error("Invalid guide format:", result);
      throw new Error("Generated guide does not match expected format");
    }

    console.log("Successfully generated repair guide");
    return result;
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to generate repair guide: " + (error instanceof Error ? error.message : String(error)));
  }
}

export async function getRepairAnswer({ question, productType, issueDescription, imageUrl }: RepairQuestionInput): Promise<{ answer: string }> {
  try {
    const systemPrompt = 
      'You are a repair expert specializing in electronics and appliances. ' +
      'Provide helpful, accurate, and concise answers to repair-related questions. ' +
      'Focus on safety and practical solutions. When uncertain, recommend professional help. ' +
      'Format your response as a JSON object with an "answer" field containing your response.';

    const messages: any[] = [
      {
        role: "system",
        content: systemPrompt
      }
    ];

    const contextPrompt = `Product Type: ${productType}${issueDescription ? `\nReported Issue: ${issueDescription}` : ''}`;

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
            image_url: {
              url: imageUrl
            }
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
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    try {
      const jsonString = content.replace(/'/g, '"').replace(/\s+/g, ' ');
      const result = JSON.parse(jsonString);
      return { answer: result.answer };
    } catch (error) {
      // If JSON parsing fails, return the content directly
      return { answer: content };
    }
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to get repair answer");
  }
}