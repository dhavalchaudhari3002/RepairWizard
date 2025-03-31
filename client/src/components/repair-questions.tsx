import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, ImagePlus, X, CheckCircle, ThumbsUp } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { QuestionFeedback } from "@/components/question-feedback";
import { useQuestionEffectiveness } from "@/hooks/use-question-effectiveness";

interface RepairQuestionsProps {
  productType: string;
  issueDescription?: string;
  currentStep?: number;
  repairRequestId?: number;
  specificQuestions?: string[]; // To display specific questions from diagnostic
  onAnswersUpdated?: (answers: AnsweredQuestion[]) => void; // Callback for when answers change
}

interface QuestionAnswer {
  question: string;
  answer: string;
  imageUrl?: string | null;
  role?: "user" | "assistant";
  isSpecificQuestion?: boolean; // Flag to indicate if this was one of the AI-suggested specific questions
}

// Interface for tracking specific questions that have been answered
export interface AnsweredQuestion {
  question: string;
  answer: string;
  timestamp: number;
  isSpecificQuestion: boolean;
}

export function RepairQuestions({ 
  productType, 
  issueDescription, 
  currentStep, 
  repairRequestId, 
  specificQuestions,
  onAnswersUpdated
}: RepairQuestionsProps) {
  const [question, setQuestion] = useState("");
  const [conversation, setConversation] = useState<QuestionAnswer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [answeredQuestions, setAnsweredQuestions] = useState<AnsweredQuestion[]>([]);
  
  // Track which specific questions have been answered
  const [answeredSpecificQuestions, setAnsweredSpecificQuestions] = useState<string[]>([]);
  
  // Question feedback states
  const [feedbackQuestionIndex, setFeedbackQuestionIndex] = useState<number | null>(null);
  const { trackEffectiveQuestion, trackIneffectiveQuestion } = useQuestionEffectiveness();

  // Notify parent component when answered questions change
  useEffect(() => {
    if (onAnswersUpdated && answeredQuestions.length > 0) {
      onAnswersUpdated(answeredQuestions);
    }
  }, [answeredQuestions, onAnswersUpdated]);

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

  // Check if a question is one of the specific diagnostic questions
  const isSpecificQuestion = (questionText: string): boolean => {
    if (!specificQuestions) return false;
    return specificQuestions.some(q => 
      q.toLowerCase().trim() === questionText.toLowerCase().trim()
    );
  };

  const handleAskQuestion = async () => {
    if (!question.trim()) return;
    
    // Check if this is one of the specific diagnostic questions
    const isSpecific = isSpecificQuestion(question);

    setIsLoading(true);
    try {
      // Convert conversation to the format expected by the API
      const context = conversation.flatMap(qa => [
        { role: "user", content: qa.question },
        { role: "assistant", content: qa.answer }
      ]);
      
      const response = await apiRequest(
        "POST", 
        "/api/repair-questions",
        { 
          question, 
          productType, 
          issueDescription,
          imageUrl: imagePreview,
          context,
          currentStep,
          repairRequestId,
          isSpecificDiagnosticQuestion: isSpecific // Tell the API if this is a specific diagnostic question
        }
      );
      const data = await response.json();
      
      // Add the new Q&A to the conversation history
      const newQA: QuestionAnswer = { 
        question, 
        answer: typeof data.answer === 'string' ? data.answer : JSON.stringify(data.answer),
        imageUrl: imagePreview,
        role: "user" as const, // Use const assertion to fix type issue
        isSpecificQuestion: isSpecific
      };
      
      setConversation(prev => [...prev, newQA]);
      
      // If this was a specific question, track it as answered
      if (isSpecific) {
        // Add to answered specific questions list
        setAnsweredSpecificQuestions(prev => [...prev, question]);
        
        // Add to the overall answered questions for context management
        const newAnsweredQuestion: AnsweredQuestion = {
          question,
          answer: typeof data.answer === 'string' ? data.answer : JSON.stringify(data.answer),
          timestamp: Date.now(),
          isSpecificQuestion: true
        };
        
        setAnsweredQuestions(prev => [...prev, newAnsweredQuestion]);
      } else {
        // Still track regular questions for context
        const newAnsweredQuestion: AnsweredQuestion = {
          question,
          answer: typeof data.answer === 'string' ? data.answer : JSON.stringify(data.answer),
          timestamp: Date.now(),
          isSpecificQuestion: false
        };
        
        setAnsweredQuestions(prev => [...prev, newAnsweredQuestion]);
      }
      
      setQuestion(""); // Clear input after successful response
      setImagePreview(null); // Clear image after sending
    } catch (error) {
      console.error("Failed to get answer:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to ask a specific question
  const handleSpecificQuestionClick = (questionText: string) => {
    setQuestion(questionText);
  };
  
  // Handle showing feedback for a question
  const handleShowFeedback = (index: number) => {
    setFeedbackQuestionIndex(index);
  };
  
  // Handle feedback submission
  const handleFeedbackSubmitted = (rating: number, leadToSolution: boolean, index: number) => {
    const qa = conversation[index];
    
    // Track the feedback result
    if (leadToSolution || rating >= 4) {
      trackEffectiveQuestion({
        repairRequestId: repairRequestId || null,
        productType,
        question: qa.question,
        isSpecificQuestion: !!qa.isSpecificQuestion
      });
    } else {
      trackIneffectiveQuestion({
        repairRequestId: repairRequestId || null,
        productType,
        question: qa.question,
        isSpecificQuestion: !!qa.isSpecificQuestion
      });
    }
    
    // Close the feedback panel
    setFeedbackQuestionIndex(null);
  };

  return (
    <div className="space-y-4">
      {/* Display specific diagnostic questions if available */}
      {specificQuestions && specificQuestions.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mb-4">
          <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
            <MessageCircle className="h-4 w-4 text-primary" />
            Suggested Questions to Find Root Cause
          </h4>
          <div className="space-y-2">
            {specificQuestions.map((q, i) => {
              const isAnswered = answeredSpecificQuestions.includes(q);
              return (
                <Button 
                  key={i} 
                  variant={isAnswered ? "outline" : "ghost"}
                  size="sm" 
                  className={`w-full justify-start text-sm h-auto py-2 font-normal ${
                    isAnswered ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : ''
                  }`}
                  onClick={() => handleSpecificQuestionClick(q)}
                >
                  <div className="flex items-start gap-2 w-full">
                    <div className={`${
                      isAnswered 
                        ? 'bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-100' 
                        : 'bg-primary/10 text-primary'
                    } rounded-full h-5 w-5 flex items-center justify-center shrink-0 text-xs font-medium`}>
                      {isAnswered ? <CheckCircle className="h-3 w-3" /> : (i + 1)}
                    </div>
                    <span className="text-left">{q}</span>
                  </div>
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {/* Conversation History */}
      {conversation.map((qa, index) => (
        <div key={index} className="space-y-2">
          <div className="bg-muted/50 p-3 rounded-lg">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium">You asked:</p>
                <p className="text-sm">{qa.question}</p>
              </div>
              
              {/* Only show feedback button for specific diagnostic questions */}
              {qa.isSpecificQuestion && feedbackQuestionIndex !== index && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs flex items-center gap-1 h-7"
                  onClick={() => handleShowFeedback(index)}
                >
                  <ThumbsUp className="h-3 w-3" />
                  Rate question
                </Button>
              )}
            </div>
            
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
          
          {/* Feedback component for this question */}
          {feedbackQuestionIndex === index && (
            <QuestionFeedback
              repairRequestId={repairRequestId || null}
              productType={productType}
              question={qa.question}
              isSpecificQuestion={!!qa.isSpecificQuestion}
              onClose={() => setFeedbackQuestionIndex(null)}
              onFeedbackSubmitted={(rating, leadToSolution) => 
                handleFeedbackSubmitted(rating, leadToSolution, index)
              }
            />
          )}
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