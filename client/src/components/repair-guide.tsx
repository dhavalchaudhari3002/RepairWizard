import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Wrench, AlertTriangle, Clock, PlayCircle, ShoppingCart } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { RepairQuestions } from "./repair-questions";
import { useLocation } from "wouter";

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
  issue: string;
}

export function RepairGuide({ productType, issue }: RepairGuideProps) {
  const [guide, setGuide] = useState<RepairGuide | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [_, navigate] = useLocation();

  const generateGuide = async () => {
    if (!productType || !issue) {
      toast({
        title: "Missing Information",
        description: "Product type and issue description are required.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      console.log("Attempting to generate guide for:", { productType, issue });
      const response = await apiRequest(
        "POST",
        "/api/repair-guides",
        { productType, issue }
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

  const openYoutubeSearch = () => {
    if (!guide) return;
    const searchQuery = encodeURIComponent(`${guide.title} ${guide.videoKeywords.join(' ')}`);
    window.open(`https://www.youtube.com/results?search_query=${searchQuery}`, '_blank');
  };

  if (!guide) {
    return (
      <Card className="shadow-md border-primary/10">
        <CardContent className="pt-6">
          <Button
            onClick={generateGuide}
            disabled={loading || !productType || !issue}
            className="w-full font-medium text-primary-foreground bg-primary hover:bg-primary/90"
          >
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating Guide...
              </span>
            ) : (
              "Generate Repair Guide"
            )}
          </Button>
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
                const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(tool)}`;
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

          {/* Step Instructions */}
          <div className="border rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Step {step.step} of {guide.steps.length}</h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
                  disabled={currentStep === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentStep(prev => Math.min(guide.steps.length - 1, prev + 1))}
                  disabled={currentStep === guide.steps.length - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

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
        </CardContent>
      </Card>

      {/* Q&A Section - Only shown after guide is generated */}
      <Card>
        <CardHeader>
          <CardTitle>Ask about your repair</CardTitle>
          <CardDescription>Have questions about the repair process? Ask our AI assistant.</CardDescription>
        </CardHeader>
        <CardContent>
          <RepairQuestions 
            productType={productType} 
            issueDescription={issue}
          />
        </CardContent>
      </Card>
    </div>
  );
}