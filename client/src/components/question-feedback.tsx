import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider"; 
import { ThumbsDown, ThumbsUp, Check, X, Star, HelpCircle } from "lucide-react";
import { useQuestionEffectiveness } from "@/hooks/use-question-effectiveness";
import { toast } from '@/hooks/use-toast';

interface QuestionFeedbackProps {
  repairRequestId: number | null;
  productType: string;
  question: string;
  isSpecificQuestion: boolean;
  onClose?: () => void;
  onFeedbackSubmitted?: (rating: number, leadToSolution: boolean) => void;
}

export function QuestionFeedback({
  repairRequestId,
  productType,
  question,
  isSpecificQuestion,
  onClose,
  onFeedbackSubmitted
}: QuestionFeedbackProps) {
  const [rating, setRating] = useState<number>(3);
  const [leadToSolution, setLeadToSolution] = useState<boolean | null>(null);
  const { trackQuestionFeedback } = useQuestionEffectiveness();
  
  const handleSubmit = async () => {
    if (leadToSolution === null) {
      toast({
        title: "Please answer both questions",
        description: "Let us know if this question helped solve your problem",
        variant: "destructive"
      });
      return;
    }
    
    // Track the feedback
    await trackQuestionFeedback(
      repairRequestId,
      productType,
      question,
      isSpecificQuestion,
      rating,
      leadToSolution
    );
    
    // Notify parent component
    if (onFeedbackSubmitted) {
      onFeedbackSubmitted(rating, leadToSolution);
    }
    
    // Show success message
    toast({
      title: "Feedback Submitted",
      description: "Thank you for helping us improve our diagnostic questions!",
      variant: "default"
    });
    
    // Close the feedback panel
    if (onClose) {
      onClose();
    }
  };
  
  return (
    <div className="p-4 bg-muted/30 rounded-lg">
      <div className="mb-4">
        <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
          <HelpCircle className="h-4 w-4 text-primary" />
          Was this question helpful?
        </h4>
        
        <div className="space-y-4">
          {/* Rating Slider */}
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-2">
              <span>Not helpful</span>
              <span>Very helpful</span>
            </div>
            <Slider
              value={[rating]}
              min={1}
              max={5}
              step={1}
              onValueChange={(value) => setRating(value[0])}
              className="mb-2"
            />
            <div className="flex justify-between">
              {[1, 2, 3, 4, 5].map((value) => (
                <Button
                  key={value}
                  variant={rating === value ? "default" : "ghost"}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setRating(value)}
                >
                  {value}
                </Button>
              ))}
            </div>
          </div>
          
          {/* Did it lead to a solution */}
          <div>
            <p className="text-sm mb-2">Did this question help identify the root cause?</p>
            <div className="flex gap-2">
              <Button 
                variant={leadToSolution === true ? "default" : "outline"}
                size="sm"
                onClick={() => setLeadToSolution(true)}
                className="flex items-center gap-1"
              >
                <ThumbsUp className="h-4 w-4" />
                Yes
              </Button>
              <Button 
                variant={leadToSolution === false ? "default" : "outline"}
                size="sm"
                onClick={() => setLeadToSolution(false)}
                className="flex items-center gap-1"
              >
                <ThumbsDown className="h-4 w-4" />
                No
              </Button>
            </div>
          </div>
          
          {/* Submit/Cancel Buttons */}
          <div className="flex justify-end gap-2 mt-4">
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                Cancel
              </Button>
            )}
            <Button 
              onClick={handleSubmit} 
              size="sm"
              className="flex items-center gap-1"
            >
              <Check className="h-4 w-4" />
              Submit Feedback
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}