import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useInteractionTracking } from "@/hooks/use-interaction-tracking";
import { AlertTriangle, Brain, CheckCircle2, Lightbulb, HelpCircle, ArrowRight, ThumbsUp, ThumbsDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useMutation } from "@tanstack/react-query";

interface RepairDiagnostic {
  symptomInterpretation: string;
  possibleCauses: string[];
  informationGaps: string[];
  diagnosticSteps: string[];
  likelySolutions: string[];
  safetyWarnings: string[];
}

interface DiagnosticAnalysisProps {
  productType: string;
  issueDescription: string;
  repairRequestId?: number;
}

export function DiagnosticAnalysis({ productType, issueDescription, repairRequestId }: DiagnosticAnalysisProps) {
  const [diagnostic, setDiagnostic] = useState<RepairDiagnostic | null>(null);
  const [activeTab, setActiveTab] = useState("analysis");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<boolean>(false);
  const { toast } = useToast();
  const { trackInteraction } = useInteractionTracking();
  
  // Use TanStack Query's useMutation for handling the API request
  const diagnosisMutation = useMutation({
    mutationFn: async () => {
      console.log("Starting diagnostic API request for:", { productType, issueDescription, repairRequestId });
      
      try {
        const res = await fetch('/api/repair-diagnostics', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            productType,
            issueDescription,
            repairRequestId
          }),
          credentials: 'include'
        });
        
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          console.error("Diagnostic API error:", errorData);
          throw new Error(errorData.error || 'Failed to generate diagnostic analysis');
        }
        
        const data = await res.json();
        console.log("Received diagnostic data:", data);
        return data;
      } catch (error) {
        console.error("Fetch error:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("Received diagnostic data:", data);
      
      // Set data with a small delay to allow loading animation to complete
      // This helps prevent any jank during the transition
      setTimeout(() => {
        console.log("Setting diagnostic data in component state:", data);
        setDiagnostic(data);
      }, 200);
      
      // Track the successful diagnosis event if tracking is available
      trackInteraction({
        interactionType: "diagnostic_generated",
        metadata: {
          productType,
          issueDescription: issueDescription.substring(0, 100), // Truncate to reasonable length
        },
        repairRequestId
      });
    },
    onError: (error: Error) => {
      console.error("Diagnostic mutation error:", error);
      toast({
        title: "Failed to generate diagnostic analysis",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    },
  });

  // Function to handle feedback submission
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

  // Generate diagnosis when component mounts if not already fetched
  if (!diagnostic && !diagnosisMutation.isPending && !diagnosisMutation.isError) {
    console.log("Initiating diagnostic API request");
    diagnosisMutation.mutate();
  }

  // Force refresh after 500ms if we have data but UI isn't updating
  useEffect(() => {
    if (diagnostic) {
      console.log("Diagnostic data is available, ensuring UI updates");
      const timer = setTimeout(() => {
        if (diagnostic) {
          // This will cause a re-render if the UI hasn't updated
          setActiveTab(prevTab => prevTab === "analysis" ? prevTab : "analysis");
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [diagnostic]);

  // Loading state
  if (diagnosisMutation.isPending) {
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
          {diagnosisMutation.failureCount > 0 && (
            <Alert className="mb-4 border-amber-500 bg-amber-500/10">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <AlertTitle>Taking longer than usual...</AlertTitle>
              <AlertDescription>Retrying analysis ({diagnosisMutation.failureCount}/3)</AlertDescription>
            </Alert>
          )}
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
  if (diagnosisMutation.isError) {
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
              We couldn't generate a diagnostic analysis. Please try again later.
            </AlertDescription>
          </Alert>
          <Button 
            onClick={() => diagnosisMutation.mutate()} 
            className="mt-4 w-full"
            variant="outline"
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  // No data yet
  if (!diagnostic) {
    console.log("No diagnostic data available yet");
    // Return a placeholder with zero height instead of null
    // This prevents the component from disappearing and reappearing
    return <div className="h-0 overflow-hidden" id="diagnostic-placeholder" />;
  }
  
  // Ensure diagnostic has all required properties to prevent rendering errors
  const validDiagnostic = {
    symptomInterpretation: diagnostic.symptomInterpretation || "No symptom interpretation available",
    possibleCauses: Array.isArray(diagnostic.possibleCauses) ? diagnostic.possibleCauses : [],
    informationGaps: Array.isArray(diagnostic.informationGaps) ? diagnostic.informationGaps : [],
    diagnosticSteps: Array.isArray(diagnostic.diagnosticSteps) ? diagnostic.diagnosticSteps : [],
    likelySolutions: Array.isArray(diagnostic.likelySolutions) ? diagnostic.likelySolutions : [],
    safetyWarnings: Array.isArray(diagnostic.safetyWarnings) ? diagnostic.safetyWarnings : []
  };

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
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="steps">Troubleshooting</TabsTrigger>
          </TabsList>
          
          <TabsContent value="analysis" className="space-y-4 pt-4">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Symptoms</h3>
              <p className="text-muted-foreground">{validDiagnostic.symptomInterpretation}</p>
            </div>
            
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
                    {validDiagnostic.possibleCauses.map((cause, i) => (
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
                    {validDiagnostic.informationGaps.map((gap, i) => (
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
                    {validDiagnostic.likelySolutions.map((solution, i) => (
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
                    {validDiagnostic.safetyWarnings.map((warning, i) => (
                      <li key={i} className="text-muted-foreground">{warning}</li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>
          
          <TabsContent value="steps" className="pt-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Diagnostic Steps</h3>
              <div className="space-y-3">
                {validDiagnostic.diagnosticSteps.map((step, i) => (
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