import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { insertRepairRequestSchema, type InsertRepairRequest } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { CostEstimate } from "./cost-estimate";
import { RepairGuidance } from "./repair-guidance";
import { DiagnosticAnalysisNew as DiagnosticAnalysis, RepairDiagnostic } from "./diagnostic-analysis-new";
import { ImagePlus, X, Brain, Stethoscope, ArrowRight, Image, CircleAlert, Check, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RepairQuestions } from "./repair-questions";

interface RepairFormProps {
  onSubmit?: (data: any) => void;
  onResetForm?: () => void;
}

interface ImageAnalysisResult {
  detected_issue: string;
  confidence: number;
  additional_questions: string[];
  recommendations: string[];
}

export function RepairForm({ onSubmit, onResetForm }: RepairFormProps) {
  const [step, setStep] = useState(1); // 1: Form, 2: Image Analysis & Confirm, 3: Results
  const [estimateData, setEstimateData] = useState<any>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [useML, setUseML] = useState<boolean>(true);
  const [repairRequestId, setRepairRequestId] = useState<number | null>(null);
  const [diagnosticData, setDiagnosticData] = useState<RepairDiagnostic | null>(null);
  const [imageAnalysisResult, setImageAnalysisResult] = useState<ImageAnalysisResult | null>(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState<boolean>(false);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [confirmationReady, setConfirmationReady] = useState<boolean>(false);
  const [isSubmittingForm, setIsSubmittingForm] = useState<boolean>(false);
  const [confirmedIssue, setConfirmedIssue] = useState<string>('');
  const { toast } = useToast();

  const form = useForm<InsertRepairRequest>({
    resolver: zodResolver(insertRepairRequestSchema),
    defaultValues: {
      productType: "",
      issueDescription: "",
      imageUrl: "",
    },
  });

  // Check if we have enough information to proceed
  useEffect(() => {
    // If we have image analysis and user has answered all questions or no questions were needed
    if (imageAnalysisResult) {
      if (imageAnalysisResult.additional_questions.length === 0 || 
          Object.keys(userAnswers).length >= imageAnalysisResult.additional_questions.length) {
        setConfirmationReady(true);
      } else {
        setConfirmationReady(false);
      }
    }
  }, [imageAnalysisResult, userAnswers]);

  // Handle image analysis when proceeding to confirmation step
  const handleAnalyzeImage = async () => {
    const productType = form.getValues('productType');
    const issueDescription = form.getValues('issueDescription');
    
    if (!productType || !issueDescription) {
      toast({
        title: "Missing information",
        description: "Please provide both product type and issue description",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzingImage(true);
    
    try {
      // Call the API to analyze the image and get AI insights
      const res = await apiRequest(
        "POST",
        "/api/repair-questions",
        {
          question: "Analyze this image and identify the issue with this " + productType + ". " +
                   "The user says: '" + issueDescription + "'. " +
                   "Provide a detailed analysis of what you see in the image and if it confirms the reported issue.",
          productType,
          issueDescription,
          imageUrl: imagePreview,
          context: [],
        }
      );
      
      if (!res.ok) {
        throw new Error('Failed to analyze image');
      }
      
      const data = await res.json();
      console.log("Image analysis result:", data);
      
      // Create a structured analysis result
      const analysisResult: ImageAnalysisResult = {
        detected_issue: data.detected_issue || issueDescription,
        confidence: data.confidence || 0.7,
        additional_questions: data.additional_questions || [
          "Can you describe when the issue first appeared?",
          "Have you tried any solutions already?"
        ],
        recommendations: data.recommendations || []
      };
      
      setImageAnalysisResult(analysisResult);
      setStep(2);
    } catch (error) {
      console.error("Error analyzing image:", error);
      toast({
        title: "Error",
        description: "Failed to analyze image. Proceeding with text description only.",
        variant: "destructive",
      });
      // Even if image analysis fails, still proceed to confirmation step
      setImageAnalysisResult({
        detected_issue: issueDescription,
        confidence: 0.5,
        additional_questions: [
          "Can you provide more details about the issue?",
          "When did you first notice this problem?"
        ],
        recommendations: []
      });
      setStep(2);
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  // Handle question answers from the user
  const handleQuestionAnswer = (question: string, answer: string) => {
    setUserAnswers(prev => ({
      ...prev,
      [question]: answer
    }));
  };

  // Submit the final, confirmed repair request
  const submitFinalRequest = () => {
    const productType = form.getValues('productType');
    const originalIssueDescription = form.getValues('issueDescription');
    
    // Combine original description with confirmed issue and user answers
    let enhancedDescription = originalIssueDescription;
    
    if (confirmedIssue && confirmedIssue !== originalIssueDescription) {
      enhancedDescription += "\n\nConfirmed issue: " + confirmedIssue;
    }
    
    // Add user answers to additional questions
    if (Object.keys(userAnswers).length > 0) {
      enhancedDescription += "\n\nAdditional information:";
      Object.entries(userAnswers).forEach(([question, answer]) => {
        enhancedDescription += `\n- ${question}: ${answer}`;
      });
    }
    
    // Update the form with enhanced description
    form.setValue('issueDescription', enhancedDescription, { shouldValidate: true });
    
    // Submit the enhanced form
    setIsSubmittingForm(true);
    mutation.mutate({
      ...form.getValues(),
      issueDescription: enhancedDescription
    });
  };

  const mutation = useMutation({
    mutationFn: async (values: InsertRepairRequest) => {
      // First, submit the repair request
      const res = await apiRequest(
        "POST", 
        "/api/repair-requests", 
        values
      );
      if (!res.ok) throw new Error('Failed to submit repair request');

      const data = await res.json();

      // Store the repair request ID
      setRepairRequestId(data.id);

      // Then, get the estimate
      const estimateUrl = `/api/repair-requests/${data.id}/estimate?productType=${encodeURIComponent(values.productType)}&useML=${useML}`;
      const estimateRes = await apiRequest(
        "GET",
        estimateUrl
      );
      if (!estimateRes.ok) throw new Error('Failed to get repair estimate');

      return await estimateRes.json();
    },
    onSuccess: (data) => {
      setEstimateData(data);
      setStep(3); // Move to final results step
      setIsSubmittingForm(false);
      toast({
        title: "Success!",
        description: "Your repair request has been submitted.",
      });
      // Call the onSubmit prop if provided
      if (onSubmit) {
        onSubmit(data);
      }
    },
    onError: (error: Error) => {
      setIsSubmittingForm(false);
      toast({
        title: "Error",
        description: error.message || "Failed to submit repair request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleImageUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64String = e.target?.result as string;
      setImagePreview(base64String);
      form.setValue('imageUrl', base64String, { shouldValidate: true });
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    form.setValue('imageUrl', '', { shouldValidate: true });
  };

  // Handler for diagnostic data
  const handleDiagnosticComplete = (data: RepairDiagnostic) => {
    console.log("Diagnostic data received in parent:", data);
    setDiagnosticData(data);
  };

  // Final results step
  if (step === 3) {
    const productType = form.getValues('productType');
    const issueDescription = form.getValues('issueDescription');

    return (
      <div className="space-y-8">
        <CostEstimate data={estimateData} />
        <DiagnosticAnalysis 
          productType={productType}
          issueDescription={issueDescription}
          repairRequestId={repairRequestId || undefined}
          onDiagnosticComplete={handleDiagnosticComplete}
        />
        <RepairGuidance data={{ 
          ...estimateData, 
          productType,
          issueDescription,
          repairRequestId: repairRequestId || undefined,
          // Pass diagnostic data to repair guidance for contextual repair guide generation
          diagnosticData: diagnosticData
        }} />
        <Button 
          onClick={() => {
            setStep(1);
            form.reset();
            setImagePreview(null);
            setRepairRequestId(null);
            setImageAnalysisResult(null);
            setUserAnswers({});
            setConfirmedIssue('');
            // Call the onResetForm callback if it exists
            if (onResetForm) {
              onResetForm();
            }
          }}
          variant="outline"
          className="w-full"
        >
          Submit Another Request
        </Button>
      </div>
    );
  }

  // Step 2: Image Analysis & Confirmation step
  if (step === 2) {
    const productType = form.getValues('productType');
    const issueDescription = form.getValues('issueDescription');
    
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              AI Analysis Results
            </CardTitle>
            <CardDescription>
              We've analyzed your {productType} issue
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {isAnalyzingImage ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <Skeleton className="h-4 w-[250px]" />
                </div>
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Image and Analysis */}
                <div className="flex flex-col md:flex-row gap-4">
                  {imagePreview && (
                    <div className="relative md:w-1/3">
                      <img 
                        src={imagePreview} 
                        alt="Uploaded issue" 
                        className="rounded-lg max-h-[200px] object-cover"
                      />
                      <Badge 
                        variant="outline" 
                        className="absolute top-2 right-2 bg-background/80"
                      >
                        <Image className="h-3 w-3 mr-1" />
                        Uploaded Image
                      </Badge>
                    </div>
                  )}
                  
                  <div className={`${imagePreview ? 'md:w-2/3' : 'w-full'}`}>
                    <h3 className="text-lg font-medium mb-2">Issue Analysis</h3>
                    <Alert>
                      <Brain className="h-4 w-4" />
                      <AlertTitle>AI-Detected Issue</AlertTitle>
                      <AlertDescription className="mt-2">
                        <div className="flex flex-col gap-2">
                          <div>
                            {imageAnalysisResult?.detected_issue}
                            <Badge 
                              variant={imageAnalysisResult && imageAnalysisResult.confidence > 0.7 ? "default" : "outline"} 
                              className="ml-2"
                            >
                              {imageAnalysisResult && imageAnalysisResult.confidence > 0.7 ? 'High confidence' : 'Medium confidence'}
                            </Badge>
                          </div>
                          
                          <div className="mt-2 text-sm">
                            <p className="font-medium">Original description:</p>
                            <p className="text-muted-foreground">{issueDescription}</p>
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  </div>
                </div>
                
                {/* Clarification Questions */}
                {imageAnalysisResult && imageAnalysisResult.additional_questions.length > 0 && (
                  <Card className="border-blue-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <MessageCircle className="h-4 w-4 text-blue-500" />
                        Please Answer These Questions
                      </CardTitle>
                      <CardDescription>
                        To better diagnose your issue, we need a few more details
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {imageAnalysisResult.additional_questions.map((question, index) => (
                          <div key={index} className="space-y-2">
                            <div className="font-medium text-sm">{question}</div>
                            <Textarea
                              placeholder="Type your answer here..."
                              value={userAnswers[question] || ''}
                              onChange={(e) => handleQuestionAnswer(question, e.target.value)}
                              className="w-full h-20"
                            />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {/* Recommendations if any */}
                {imageAnalysisResult && imageAnalysisResult.recommendations.length > 0 && (
                  <div>
                    <h3 className="text-base font-medium mb-2 flex items-center gap-2">
                      <Stethoscope className="h-4 w-4 text-green-500" />
                      Initial Recommendations
                    </h3>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 pl-2">
                      {imageAnalysisResult.recommendations.map((rec, index) => (
                        <li key={index}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Final Confirmation */}
                <div className="pt-4 border-t">
                  <div className="mb-4">
                    <div className="font-medium mb-2">Confirm the issue:</div>
                    <Textarea 
                      value={confirmedIssue || imageAnalysisResult?.detected_issue || issueDescription}
                      onChange={(e) => setConfirmedIssue(e.target.value)}
                      className="w-full"
                      placeholder="Edit the issue description if needed"
                    />
                  </div>
                  
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setStep(1)}
                    >
                      Go Back
                    </Button>
                    <Button
                      disabled={!confirmationReady || isSubmittingForm}
                      onClick={submitFinalRequest}
                      className="relative"
                    >
                      {isSubmittingForm ? (
                        "Submitting..." 
                      ) : (
                        <>
                          Submit Request
                          {confirmationReady && <Check className="ml-2 h-4 w-4" />}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 1: Initial information entry
  return (
    <Form {...form}>
      <form onSubmit={(e) => {
        e.preventDefault();
        if (form.formState.isValid) {
          handleAnalyzeImage();
        } else {
          form.handleSubmit(() => {})();
        }
      }} className="space-y-6">
        <FormField
          control={form.control}
          name="productType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product Type</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Enter product type (e.g., Phone, Laptop, Chair)" 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="issueDescription"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Describe the Issue</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="What's wrong with your device?"
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="imageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Upload Image</FormLabel>
              <FormControl>
                <div className="space-y-4">
                  {/* Image Preview */}
                  {imagePreview && (
                    <div className="relative inline-block">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="h-[120px] rounded-lg object-cover"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 shadow-sm"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  {/* Upload Button */}
                  <div className="flex items-center gap-2">
                    <input
                      id="file-upload"
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleImageUpload(e.target.files[0]);
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => document.getElementById('file-upload')?.click()}
                    >
                      <ImagePlus className="h-4 w-4 mr-2" />
                      {imagePreview ? "Change Image" : "Upload Image"}
                    </Button>
                  </div>
                  
                  {!imagePreview && (
                    <div className="text-sm text-muted-foreground">
                      <p>Uploading an image helps us better diagnose your issue</p>
                    </div>
                  )}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center justify-between mb-4 p-3 border rounded-md bg-muted/30">
          <div className="flex items-center space-x-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Brain className={`h-5 w-5 ${useML ? 'text-primary' : 'text-muted-foreground'}`} />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Machine learning provides more accurate estimates based on thousands of repair data points</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <span className="text-sm font-medium">Use AI-powered cost estimates</span>
          </div>
          <Switch
            checked={useML}
            onCheckedChange={setUseML}
            aria-label="Toggle ML-based estimation"
          />
        </div>

        <Button 
          type="submit" 
          className="w-full" 
          disabled={isAnalyzingImage}
        >
          {isAnalyzingImage ? (
            "Analyzing Image & Issue..." 
          ) : (
            <>
              <ArrowRight className="mr-2 h-4 w-4" />
              Continue to Verification
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}