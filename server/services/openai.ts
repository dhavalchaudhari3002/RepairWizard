import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function getRepairAnswer(question: string, productType: string): Promise<{ answer: string }> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: 
            "You are a repair expert specializing in electronics and appliances. " +
            "Provide helpful, accurate, and concise answers to repair-related questions. " +
            "Focus on safety and practical solutions. When uncertain, recommend professional help."
        },
        {
          role: "user",
          content: `Product Type: ${productType}\nQuestion: ${question}`
        }
      ],
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
