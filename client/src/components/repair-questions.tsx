import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, Upload, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface RepairQuestionsProps {
  productType: string;
  issueDescription?: string;
}

export function RepairQuestions({ productType, issueDescription }: RepairQuestionsProps) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

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

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageUpload(e.dataTransfer.files[0]);
    }
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
      setAnswer(data.answer);
    } catch (error) {
      console.error("Failed to get answer:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {imagePreview ? (
        <div className="relative w-full rounded-lg overflow-hidden">
          <img 
            src={imagePreview} 
            alt="Preview" 
            className="max-w-full h-auto max-h-[200px] mx-auto rounded-lg"
          />
          <button
            type="button"
            onClick={removeImage}
            className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div
          className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors
            ${dragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => document.getElementById('question-image-upload')?.click()}
        >
          <input
            id="question-image-upload"
            type="file"
            className="hidden"
            accept="image/*"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleImageUpload(e.target.files[0]);
              }
            }}
          />
          <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Drag and drop an image here, or click to select
          </p>
        </div>
      )}

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