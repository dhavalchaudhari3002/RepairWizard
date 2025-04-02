import React, { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, 
  Lightbulb, 
  HelpCircle, 
  CheckCircle2, 
  AlertTriangle,
  ThumbsUp,
  ThumbsDown
} from "lucide-react";
import { useInteractionTracking } from "@/hooks/use-interaction-tracking";
import { RepairQuestions } from "./repair-questions";
import { AnsweredQuestion } from "./repair-questions";
import DiagnosticQuestionTree, { DiagnosticAnswers } from "./diagnostic-question-tree";

// Define the RepairDiagnostic interface
export interface RepairDiagnostic {
  symptomInterpretation: string;
  possibleCauses: string[];
  informationGaps: string[];
  diagnosticSteps: string[];
  likelySolutions: string[];
  safetyWarnings: string[];
  specificQuestions?: string[]; // Specific questions to ask to determine root cause
  answeredQuestions?: AnsweredQuestion[]; // Answers to specific diagnostic questions (for context)
}

// Component props
interface DiagnosticAnalysisProps {
  productType: string;
  issueDescription: string;
  repairRequestId?: number;
  audioUrl?: string; // Add audio recording URL
  onDiagnosticComplete?: (data: RepairDiagnostic) => void;
}

export function DiagnosticAnalysisNew({ 
  productType, 
  issueDescription, 
  repairRequestId,
  audioUrl,
  onDiagnosticComplete 
}: DiagnosticAnalysisProps) {
  // Simple state management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [diagnostic, setDiagnostic] = useState<RepairDiagnostic | null>(null);
  const [activeTab, setActiveTab] = useState("analysis");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [answeredQuestions, setAnsweredQuestions] = useState<AnsweredQuestion[]>([]);
  const [diagnosticTreeAnswers, setDiagnosticTreeAnswers] = useState<DiagnosticAnswers | null>(null);
  
  const { toast } = useToast();
  const { trackInteraction } = useInteractionTracking();
  
  // Handle question answers being updated
  const handleAnswersUpdated = (newAnswers: AnsweredQuestion[]) => {
    setAnsweredQuestions(newAnswers);
    
    // Update the diagnostic data with answered questions
    if (diagnostic) {
      const updatedDiagnostic = {
        ...diagnostic,
        answeredQuestions: newAnswers
      };
      
      setDiagnostic(updatedDiagnostic);
      
      // Notify parent component of the updated diagnostic with answers
      if (onDiagnosticComplete) {
        onDiagnosticComplete(updatedDiagnostic);
      }
      
      // Track that questions were answered
      if (repairRequestId && newAnswers.length > 0) {
        trackInteraction({
          interactionType: "diagnostic_questions_answered",
          metadata: {
            productType,
            questionCount: newAnswers.length,
            specificQuestionCount: newAnswers.filter(q => q.isSpecificQuestion).length
          },
          repairRequestId
        });
      }
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    async function fetchDiagnosticData() {
      if (!loading) return;
      
      try {
        const response = await fetch('/api/repair-diagnostics', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            productType,
            issueDescription,
            repairRequestId,
            audioUrl: audioUrl || ""
          })
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch diagnostic data: ${response.status}`);
        }

        const data = await response.json();
        console.log("Received diagnostic data:", data);
        
        setDiagnostic(data);
        setLoading(false);
        
        // Call the callback function to pass diagnostic data to parent component
        if (onDiagnosticComplete) {
          onDiagnosticComplete(data);
        }
        
        // Track the successful diagnosis event
        trackInteraction({
          interactionType: "diagnostic_generated",
          metadata: {
            productType,
            issueDescription: issueDescription.substring(0, 100),
          },
          repairRequestId
        });
      } catch (err) {
        console.error("Error fetching diagnostic data:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
        setLoading(false);
      }
    }

    fetchDiagnosticData();
  }, [productType, issueDescription, repairRequestId, audioUrl, loading, trackInteraction, onDiagnosticComplete]);

  // Handle feedback submission
  const handleFeedback = (helpful: boolean) => {
    trackInteraction({
      interactionType: "diagnostic_feedback",
      metadata: {
        helpful,
        productType,
        issueDescription: issueDescription.substring(0, 100),
      },
      repairRequestId
    });
    
    setFeedbackSubmitted(true);
    
    toast({
      title: "Feedback submitted",
      description: "Thank you for your feedback!",
    });
  };

  // Retry fetching data
  const handleRetry = () => {
    setLoading(true);
    setError(null);
  };

  // Loading state
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary animate-pulse" />
            Diagnostic Analysis
          </CardTitle>
          <CardDescription>
            Analyzing your device issue...
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full mb-6" />
          <Skeleton className="h-20 w-full mb-2" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Diagnostic Analysis Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
          <Button 
            onClick={handleRetry} 
            className="mt-4 w-full"
            variant="outline"
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  // No data state
  if (!diagnostic) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Incomplete Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>No diagnostic data available</AlertTitle>
            <AlertDescription>
              The system received an incomplete response. Please try again.
            </AlertDescription>
          </Alert>
          <Button 
            onClick={handleRetry} 
            className="mt-4 w-full"
            variant="outline"
          >
            Retry Analysis
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Ensure we have valid data
  const safeData = {
    symptomInterpretation: diagnostic.symptomInterpretation || "No symptom interpretation available",
    possibleCauses: Array.isArray(diagnostic.possibleCauses) ? diagnostic.possibleCauses : [],
    informationGaps: Array.isArray(diagnostic.informationGaps) ? diagnostic.informationGaps : [],
    diagnosticSteps: Array.isArray(diagnostic.diagnosticSteps) ? diagnostic.diagnosticSteps : [],
    likelySolutions: Array.isArray(diagnostic.likelySolutions) ? diagnostic.likelySolutions : [],
    safetyWarnings: Array.isArray(diagnostic.safetyWarnings) ? diagnostic.safetyWarnings : [],
    specificQuestions: Array.isArray(diagnostic.specificQuestions) ? diagnostic.specificQuestions : []
  };

  // Success state - Display the diagnostic results
  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Diagnostic Analysis
            </CardTitle>
            <Badge variant="outline" className="ml-2">AI-powered</Badge>
          </div>
        </div>
        <CardDescription>
          Expert analysis of your {productType} issue
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="diagnostic">Structured Diagnostic</TabsTrigger>
            <TabsTrigger value="steps">Troubleshooting</TabsTrigger>
          </TabsList>
          
          <TabsContent value="analysis" className="space-y-4 pt-4">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Symptoms</h3>
              <p className="text-muted-foreground">{safeData.symptomInterpretation}</p>
            </div>
            
            {/* Show specific questions if available */}
            {safeData.specificQuestions && safeData.specificQuestions.length > 0 && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3">
                <h3 className="text-base font-medium flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-primary" />
                  Key Questions to Find Root Cause
                </h3>
                
                {/* Display the interactive questions component */}
                <div className="mt-2 mb-2">
                  <div className="border border-primary/10 rounded-lg overflow-hidden">
                    <div className="p-3 bg-white dark:bg-gray-950">
                      <h4 className="text-sm font-medium mb-2">Ask these questions to improve the diagnosis:</h4>
                      <div className="space-y-1">
                        {answeredQuestions.filter(q => q.isSpecificQuestion).length > 0 && (
                          <div className="text-xs text-green-600 dark:text-green-400 mb-2 flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>
                              {answeredQuestions.filter(q => q.isSpecificQuestion).length} of {safeData.specificQuestions.length} questions answered
                            </span>
                          </div>
                        )}
                        <div className="rounded-md overflow-hidden">
                          {/* This embeds our repair-questions component */}
                          <div className="p-3 bg-gray-50 dark:bg-gray-900">
                            <div className="text-xs text-muted-foreground mb-3">
                              Use the question input below to ask the specific questions listed above
                            </div>
                            {/* Use the RepairQuestions component */}
                            <RepairQuestions
                              productType={productType}
                              issueDescription={issueDescription}
                              repairRequestId={repairRequestId}
                              specificQuestions={safeData.specificQuestions}
                              onAnswersUpdated={handleAnswersUpdated}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="causes">
                <AccordionTrigger className="text-base font-medium">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-yellow-500" />
                    Possible Causes
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-2 ml-6 list-disc">
                    {safeData.possibleCauses.map((cause, i) => (
                      <li key={i} className="text-muted-foreground">{cause}</li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="info-gaps">
                <AccordionTrigger className="text-base font-medium">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-blue-500" />
                    Information Gaps
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-2 ml-6 list-disc">
                    {safeData.informationGaps.map((gap, i) => (
                      <li key={i} className="text-muted-foreground">{gap}</li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="solutions">
                <AccordionTrigger className="text-base font-medium">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Likely Solutions
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-2 ml-6 list-disc">
                    {safeData.likelySolutions.map((solution, i) => (
                      <li key={i} className="text-muted-foreground">{solution}</li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="warnings">
                <AccordionTrigger className="text-base font-medium">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    Safety Warnings
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-2 ml-6 list-disc">
                    {safeData.safetyWarnings.map((warning, i) => (
                      <li key={i} className="text-muted-foreground">{warning}</li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>

          <TabsContent value="diagnostic" className="pt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Structured Diagnostic Questions</h3>
                <Badge variant="outline" className="bg-primary/5">Interactive</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Answer these questions to help pinpoint the exact issue with your {productType}.
                This interactive diagnostic tree will guide you through relevant questions based on your specific problem.
              </p>
              
              <div className="border rounded-lg p-4 bg-card">
                <DiagnosticQuestionTree
                  productCategory={productType}
                  onComplete={(diagnosticAnswers: DiagnosticAnswers) => {
                    console.log('Diagnostic question tree completed with answers:', diagnosticAnswers);
                    // Update the diagnostic data with the new answers if needed
                    if (diagnostic && onDiagnosticComplete) {
                      const updatedDiagnostic = {
                        ...diagnostic,
                        // Add the answers to the diagnostic data
                        // We could convert the answers to a format compatible with answeredQuestions
                        answeredQuestions: [
                          ...(diagnostic.answeredQuestions || []),
                          // Add new answered questions from the diagnostic tree
                          ...Object.entries(diagnosticAnswers.answers).map(([question, answer]) => ({
                            question,
                            answer: Array.isArray(answer) ? answer.join(', ') : answer.toString(),
                            timestamp: Date.now(),
                            isSpecificQuestion: true
                          }))
                        ]
                      };
                      
                      setDiagnostic(updatedDiagnostic);
                      onDiagnosticComplete(updatedDiagnostic);
                      
                      // Track that structured questions were answered
                      trackInteraction({
                        interactionType: "diagnostic_questions_answered",
                        metadata: {
                          productType,
                          questionCount: diagnosticAnswers.questionPath.length,
                          isStructuredDiagnostic: true
                        },
                        repairRequestId
                      });
                    }
                  }}
                />
              </div>
              
              <Alert className="mt-4">
                <HelpCircle className="h-4 w-4" />
                <AlertTitle>How it works</AlertTitle>
                <AlertDescription className="text-sm">
                  This diagnostic tree adapts based on your answers. Each response helps narrow down 
                  the possible issues with your device, leading to more accurate repair recommendations.
                </AlertDescription>
              </Alert>
            </div>
          </TabsContent>
          
          <TabsContent value="steps" className="pt-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Diagnostic Steps</h3>
              <div className="space-y-3">
                {safeData.diagnosticSteps.map((step, i) => (
                  <div key={i} className="flex gap-3 p-3 rounded-md border">
                    <div className="bg-primary/10 rounded-full h-6 w-6 flex items-center justify-center shrink-0 text-primary text-sm font-medium">
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-sm">{step}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <Alert className="mt-6 border-yellow-500/50 bg-yellow-500/10">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <AlertTitle>Safety First</AlertTitle>
              <AlertDescription className="text-sm">
                Always prioritize your safety. If you're not comfortable with these steps, 
                consider seeking professional help.
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>
        
        {!feedbackSubmitted && (
          <div className="pt-4 border-t flex flex-col items-center space-y-2">
            <p className="text-sm text-muted-foreground">Was this diagnosis helpful?</p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleFeedback(true)}
                className="flex items-center gap-1"
              >
                <ThumbsUp className="h-4 w-4" />
                Yes
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleFeedback(false)}
                className="flex items-center gap-1"
              >
                <ThumbsDown className="h-4 w-4" />
                No
              </Button>
            </div>
          </div>
        )}
        
        {feedbackSubmitted && (
          <div className="pt-4 border-t text-center">
            <p className="text-sm text-muted-foreground">Thanks for your feedback!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}