import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Wrench, AlertTriangle, Clock, PlayCircle, ShoppingCart, MessageCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { RepairQuestions, AnsweredQuestion } from "./repair-questions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useInteractionTracking } from "@/hooks/use-interaction-tracking";
import { useQuestionEffectiveness } from "@/hooks/use-question-effectiveness";
import { RepairDiagnostic } from "./diagnostic-analysis-new";

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

interface RepairGuideProps {
  productType: string;
  issueDescription: string;
  repairRequestId?: number;
  diagnostic?: RepairDiagnostic | null;
}

export function RepairGuide({ productType, issueDescription, repairRequestId, diagnostic }: RepairGuideProps) {
  const [guide, setGuide] = useState<RepairGuide | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [generationAttempted, setGenerationAttempted] = useState(false);
  const [answeredQuestions, setAnsweredQuestions] = useState<AnsweredQuestion[]>([]);
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const { 
    trackGuideView,
    trackStepView,
    trackStepSkip,
    trackGuideCompletion,
    trackGuideAbandonment,
    trackVideoSearch,
    trackGuideUpdatedWithAnswers
  } = useInteractionTracking();
  
  const { trackSuccessfulGuideCreation } = useQuestionEffectiveness();
  
  // Reference for guide start time to calculate duration
  const startTimeRef = useRef<Date | null>(null);
  
  // Track guide completion when reaching the last step
  useEffect(() => {
    if (guide && repairRequestId && currentStep === guide.steps.length - 1) {
      // User has reached the last step - this could be considered completion
      // We'll track this event only once when they first reach the last step
      if (startTimeRef.current) {
        const durationSeconds = Math.round((new Date().getTime() - startTimeRef.current.getTime()) / 1000);
        trackGuideCompletion(repairRequestId, productType, guide.title, durationSeconds);
      }
    }
  }, [currentStep, guide, productType, repairRequestId, trackGuideCompletion]);
  
  // Track initial step view
  useEffect(() => {
    if (guide && repairRequestId && currentStep === 0) {
      // Track viewing the first step
      trackStepView(repairRequestId, productType, guide.title, guide.steps[0].step);
    }
  }, [guide, productType, repairRequestId, trackStepView]);
  
  // Cleanup effect to track abandonment if the component unmounts
  useEffect(() => {
    return () => {
      if (guide && repairRequestId && startTimeRef.current) {
        // Check if guide wasn't completed
        if (currentStep < guide.steps.length - 1) {
          const durationSeconds = Math.round((new Date().getTime() - startTimeRef.current.getTime()) / 1000);
          trackGuideAbandonment(
            repairRequestId, 
            productType, 
            guide.title, 
            guide.steps[currentStep].step, 
            durationSeconds
          );
        }
      }
    };
  }, [guide, currentStep, productType, repairRequestId, trackGuideAbandonment]);

  const generateGuide = async () => {
    if (!productType || !issueDescription) {
      toast({
        title: "Missing Information",
        description: "Product type and issue description are required.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Include diagnostic data and answered questions in the request if available
      const diagnosticInfo = diagnostic ? {
        possibleCauses: diagnostic.possibleCauses,
        likelySolutions: diagnostic.likelySolutions,
        safetyWarnings: diagnostic.safetyWarnings,
        // Also include any answered questions for more personalized guide generation
        answeredQuestions: diagnostic.answeredQuestions || []
      } : null;
      
      console.log("Attempting to generate guide for:", { 
        productType, 
        issueDescription, 
        repairRequestId,
        hasDiagnosticData: !!diagnostic
      });
      
      const response = await apiRequest(
        "POST",
        "/api/repair-guides",
        { 
          productType, 
          issue: issueDescription, 
          repairRequestId,
          diagnosticInfo
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Guide generation API error:", errorData);
        throw new Error(errorData.details || errorData.error || "Failed to generate guide");
      }

      const data = await response.json();
      console.log("Received guide data:", data);

      if (!data || !data.title || !Array.isArray(data.steps)) {
        console.error("Invalid guide data received:", data);
        throw new Error("Invalid guide data received");
      }

      setGuide(data);
      setCurrentStep(0);
      
      // Start tracking time
      startTimeRef.current = new Date();
      
      // Track guide view
      if (repairRequestId) {
        trackGuideView(repairRequestId, productType, data.title);
      }
      
      toast({
        title: "Success",
        description: "Repair guide generated successfully.",
      });
    } catch (error) {
      console.error("Failed to generate guide:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate repair guide. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Regenerate the guide with updated answered questions
  const regenerateGuideWithAnswers = async () => {
    if (!productType || !issueDescription || !repairRequestId) {
      return;
    }

    setLoading(true);
    try {
      // Combine diagnostic data with the latest answered questions
      const combinedQuestions = [
        ...(diagnostic?.answeredQuestions || []),
        ...answeredQuestions
      ];
      
      // Remove duplicates by using the question text as a key
      const uniqueQuestions = Array.from(
        new Map(combinedQuestions.map(q => [q.question, q])).values()
      );
      
      // Create diagnostic info with all available data
      const enhancedDiagnosticInfo = {
        possibleCauses: diagnostic?.possibleCauses || [],
        likelySolutions: diagnostic?.likelySolutions || [],
        safetyWarnings: diagnostic?.safetyWarnings || [],
        answeredQuestions: uniqueQuestions
      };
      
      console.log("Regenerating guide with updated answers:", { 
        questionCount: uniqueQuestions.length,
        specificQuestionCount: uniqueQuestions.filter(q => q.isSpecificQuestion).length
      });
      
      const response = await apiRequest(
        "POST",
        "/api/repair-guides",
        { 
          productType, 
          issue: issueDescription, 
          repairRequestId,
          diagnosticInfo: enhancedDiagnosticInfo
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Guide regeneration API error:", errorData);
        throw new Error(errorData.details || errorData.error || "Failed to regenerate guide");
      }

      const data = await response.json();
      console.log("Received updated guide data:", data);

      if (!data || !data.title || !Array.isArray(data.steps)) {
        console.error("Invalid guide data received:", data);
        throw new Error("Invalid guide data received");
      }

      setGuide(data);
      // Keep the current step position when regenerating
      
      // Track guide update
      if (repairRequestId) {
        trackGuideUpdatedWithAnswers(
          repairRequestId,
          productType,
          data.title,
          { questionCount: uniqueQuestions.length }
        );
        
        // Also track that these questions led to a solution
        const specificQuestions = uniqueQuestions.filter(q => q.isSpecificQuestion);
        if (specificQuestions.length > 0) {
          trackSuccessfulGuideCreation(
            repairRequestId, 
            productType,
            specificQuestions.map(q => ({ 
              question: q.question, 
              isSpecificQuestion: q.isSpecificQuestion 
            }))
          );
        }
      }
      
      toast({
        title: "Guide Updated",
        description: "The repair guide has been updated based on your answers.",
      });
    } catch (error) {
      console.error("Failed to regenerate guide:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update repair guide. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openYoutubeSearch = () => {
    if (!guide) return;
    const searchQuery = encodeURIComponent(`${guide.title} ${guide.videoKeywords.join(' ')}`);
    
    // Track the video search interaction
    if (repairRequestId) {
      trackVideoSearch(repairRequestId, productType, { searchTerms: guide.videoKeywords });
    }
    
    window.open(`https://www.youtube.com/results?search_query=${searchQuery}`, '_blank');
  };

  // Component will only show the guide when the "Generate Repair Guide" button is clicked
  useEffect(() => {
    // Initialize the component (empty to avoid automatic generation)
  }, []);

  if (!guide) {
    return (
      <Card className="shadow-md border-primary/10">
        <CardContent className="pt-6">
          <div className="w-full flex items-center justify-center py-2">
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating Repair Guide...
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const step = guide.steps[currentStep];

  return (
    <div className="space-y-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{guide.title}</CardTitle>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Wrench className="h-4 w-4" />
              <span>{guide.difficulty}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{guide.estimatedTime}</span>
            </div>
            <div className="flex gap-2 ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={openYoutubeSearch}
              >
                <PlayCircle className="h-4 w-4 mr-2" />
                Video Tutorials
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Safety Warnings */}
          {guide.warnings.length > 0 && (
            <div className="bg-destructive/10 rounded-lg p-4">
              <div className="flex items-center gap-2 text-destructive mb-2">
                <AlertTriangle className="h-5 w-5" />
                <h3 className="font-semibold">Safety Warnings</h3>
              </div>
              <ul className="list-disc list-inside space-y-1">
                {guide.warnings.map((warning, i) => (
                  <li key={i} className="text-sm">{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Tools Required */}
          <div>
            <div className="flex justify-between items-center">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Tools Required
              </h3>
            </div>
            <div className="space-y-4">
              {guide.tools.map((tool, i) => {
                const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(tool)}&tag=youraffiliateID-20`;
                return (
                  <div key={i} className="flex justify-between items-center border-b pb-2">
                    <span className="text-sm">{tool}</span>
                    <a
                      href={searchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary text-xs flex items-center gap-1"
                    >
                      <ShoppingCart className="h-3 w-3" />
                      Find on Amazon
                    </a>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step Instructions with Interactive Q&A */}
          <div className="border rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Step {step.step} of {guide.steps.length}</h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const newStep = Math.max(0, currentStep - 1);
                    setCurrentStep(newStep);
                    
                    // Track step view when navigating to previous step
                    if (repairRequestId && newStep !== currentStep) {
                      trackStepView(
                        repairRequestId, 
                        productType, 
                        guide.title, 
                        guide.steps[newStep].step
                      );
                    }
                  }}
                  disabled={currentStep === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const newStep = Math.min(guide.steps.length - 1, currentStep + 1);
                    setCurrentStep(newStep);
                    
                    // Track step view when navigating to next step
                    if (repairRequestId && newStep !== currentStep) {
                      trackStepView(
                        repairRequestId, 
                        productType, 
                        guide.title, 
                        guide.steps[newStep].step
                      );
                    }
                  }}
                  disabled={currentStep === guide.steps.length - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-6">
              {/* Instructions Section */}
              <div className="mb-6">
                <div className="bg-primary/5 p-3 rounded-t-lg">
                  <h4 className="font-medium">Instructions</h4>
                </div>
                <div className="p-4 border border-t-0 rounded-b-lg">
                  <h4 className="font-medium mb-2">{step.title}</h4>
                  <p className="text-sm mb-4">{step.description}</p>

                  {step.safetyWarnings && step.safetyWarnings.length > 0 && (
                    <div className="bg-yellow-50 dark:bg-yellow-950/20 rounded p-3 mb-4">
                      <h5 className="text-sm font-medium mb-1">Step-specific Safety Notes:</h5>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {step.safetyWarnings.map((warning, i) => (
                          <li key={i}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="bg-muted rounded p-3">
                    <h5 className="text-sm font-medium mb-1">Visual Guide:</h5>
                    <p className="text-sm text-muted-foreground">{step.imageDescription}</p>
                  </div>
                </div>
              </div>
              
              {/* Questions Section */}
              <div>
                <div className="bg-muted p-3 rounded-t-lg flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  <h4 className="font-medium">Questions</h4>
                </div>
                <div className="p-4 border border-t-0 rounded-b-lg">
                  <div className="bg-muted/30 rounded-lg p-3 mb-4">
                    <p className="text-sm">
                      Have questions about <strong>"{step.title}"</strong>? Ask for help or clarification about this specific step.
                    </p>
                  </div>
                  <RepairQuestions 
                    productType={productType} 
                    issueDescription={issueDescription}
                    currentStep={currentStep}
                    repairRequestId={repairRequestId}
                    specificQuestions={diagnostic?.specificQuestions}
                    onAnswersUpdated={(answers) => {
                      // When answers are updated, save them and offer to regenerate the guide
                      if (answers.length > 0 && repairRequestId) {
                        // Update local state with answered questions
                        setAnsweredQuestions(answers);

                        // If there are multiple specific questions answered, offer to regenerate
                        const specificAnswers = answers.filter(a => a.isSpecificQuestion);
                        if (specificAnswers.length >= 2 && !loading) {
                          // Show toast with option to regenerate
                          toast({
                            title: "Questions Answered",
                            description: (
                              <div className="space-y-2">
                                <p>You've answered {specificAnswers.length} diagnostic questions. Would you like to update your repair guide based on these answers?</p>
                                <Button 
                                  onClick={() => regenerateGuideWithAnswers()}
                                  size="sm"
                                  className="mt-2"
                                >
                                  Update Repair Guide
                                </Button>
                              </div>
                            ),
                            duration: 8000,
                          });
                        }
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}