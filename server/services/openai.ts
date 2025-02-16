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
    const systemPrompt = 
      "You are an expert repair technician creating detailed repair guides. " +
      "Generate a comprehensive, step-by-step guide in JSON format with safety warnings, " +
      "required tools, and descriptions for helpful images. Include search keywords for relevant tutorial videos.";

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
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 1500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    const result = JSON.parse(content);
    return result as RepairGuide;
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to generate repair guide");
  }
}

export async function getRepairAnswer({ question, productType, issueDescription, imageUrl }: RepairQuestionInput): Promise<{ answer: string }> {
  try {
    const systemPrompt = 
      "You are a repair expert specializing in electronics and appliances. " +
      "Provide helpful, accurate, and concise answers to repair-related questions. " +
      "Focus on safety and practical solutions. When uncertain, recommend professional help. " +
      "Respond with JSON in this format: { 'answer': 'your detailed answer here' }";

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
            text: `${contextPrompt}\nAnalyze this image and answer this question: ${question}\nRespond in JSON format.`
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
        content: `${contextPrompt}\nQuestion: ${question}\nRespond in JSON format.`
      });
    }

    const response = await openai.chat.completions.create({
      model: imageUrl ? "gpt-4-vision-preview" : "gpt-4",
      messages,
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    const result = JSON.parse(content);
    return { answer: result.answer };
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to get repair answer");
  }
}