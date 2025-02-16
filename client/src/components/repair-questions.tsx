import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export function RepairQuestions({ productType }: { productType: string }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAskQuestion = async () => {
    if (!question.trim()) return;
    
    setIsLoading(true);
    try {
      const response = await apiRequest(
        "POST", 
        "/api/repair-questions",
        { question, productType }
      );
      const data = await response.json();
      setAnswer(data.answer);
    } catch (error) {
      console.error("Failed to get answer:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question about your repair..."
          onKeyPress={(e) => e.key === "Enter" && handleAskQuestion()}
        />
        <Button 
          onClick={handleAskQuestion}
          disabled={isLoading || !question.trim()}
        >
          {isLoading ? "Thinking..." : "Ask"}
        </Button>
      </div>
      
      {answer && (
        <div className="rounded-lg bg-muted p-4">
          <div className="flex gap-2 items-start">
            <MessageCircle className="h-5 w-5 mt-0.5 text-primary" />
            <p className="text-sm">{answer}</p>
          </div>
        </div>
      )}
    </div>
  );
}
