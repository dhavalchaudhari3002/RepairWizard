import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface RepairQuestionInput {
  question: string;
  productType: string;
  imageUrl?: string;
}

export async function getRepairAnswer({ question, productType, imageUrl }: RepairQuestionInput): Promise<{ answer: string }> {
  try {
    const messages: any[] = [
      {
        role: "system",
        content: 
          "You are a repair expert specializing in electronics and appliances. " +
          "Provide helpful, accurate, and concise answers to repair-related questions. " +
          "Focus on safety and practical solutions. When uncertain, recommend professional help."
      }
    ];

    if (imageUrl) {
      messages.push({
        role: "user",
        content: [
          {
            type: "text",
            text: `Product Type: ${productType}\nQuestion: ${question}\nPlease analyze the image and provide repair guidance.`
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
        content: `Product Type: ${productType}\nQuestion: ${question}`
      });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 500,
    });

    const result = JSON.parse(response.choices[0].message.content);
    return { answer: result.answer };
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to get repair answer");
  }
}