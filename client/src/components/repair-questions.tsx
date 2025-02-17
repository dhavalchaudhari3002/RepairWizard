import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, ImagePlus, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface RepairQuestionsProps {
  productType: string;
  issueDescription?: string;
}

interface QuestionAnswer {
  question: string;
  answer: string;
  imageUrl?: string;
}

export function RepairQuestions({ productType, issueDescription }: RepairQuestionsProps) {
  const [question, setQuestion] = useState("");
  const [conversation, setConversation] = useState<QuestionAnswer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleImageUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64String = e.target?.result as string;
      setImagePreview(base64String);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
  };

  const handleAskQuestion = async () => {
    if (!question.trim()) return;

    setIsLoading(true);
    try {
      const response = await apiRequest(
        "POST", 
        "/api/repair-questions",
        { 
          question, 
          productType, 
          issueDescription,
          imageUrl: imagePreview 
        }
      );
      const data = await response.json();
      setConversation(prev => [...prev, { 
        question, 
        answer: data.answer,
        imageUrl: imagePreview 
      }]);
      setQuestion(""); // Clear input after successful response
      setImagePreview(null); // Clear image after sending
    } catch (error) {
      console.error("Failed to get answer:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Conversation History */}
      {conversation.map((qa, index) => (
        <div key={index} className="space-y-2">
          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="text-sm font-medium">You asked:</p>
            <p className="text-sm">{qa.question}</p>
            {qa.imageUrl && (
              <div className="mt-2">
                <img 
                  src={qa.imageUrl} 
                  alt="Question context" 
                  className="max-h-[100px] rounded-md object-cover"
                />
              </div>
            )}
          </div>
          <div className="bg-muted p-3 rounded-lg">
            <div className="flex gap-2 items-start">
              <MessageCircle className="h-5 w-5 mt-0.5 text-primary" />
              <p className="text-sm">{qa.answer}</p>
            </div>
          </div>
        </div>
      ))}

      {/* Question Input with Compact Image Upload */}
      <div className="flex gap-2">
        <div className="flex-1 flex gap-2 items-center bg-background rounded-lg border p-2">
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question about your repair..."
            onKeyPress={(e) => e.key === "Enter" && handleAskQuestion()}
            className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
          />
          <input
            type="file"
            id="question-image-upload"
            className="hidden"
            accept="image/*"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleImageUpload(e.target.files[0]);
              }
            }}
          />
          <label 
            htmlFor="question-image-upload" 
            className={`cursor-pointer p-1 rounded-md hover:bg-muted transition-colors ${imagePreview ? 'text-primary' : 'text-muted-foreground'}`}
          >
            <ImagePlus className="h-5 w-5" />
          </label>
        </div>
        <Button 
          onClick={handleAskQuestion}
          disabled={isLoading || !question.trim()}
        >
          {isLoading ? "Thinking..." : "Ask"}
        </Button>
      </div>

      {/* Small Image Preview */}
      {imagePreview && (
        <div className="relative inline-block">
          <img 
            src={imagePreview} 
            alt="Preview" 
            className="h-[60px] rounded-md object-cover"
          />
          <button
            type="button"
            onClick={removeImage}
            className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 shadow-sm"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}