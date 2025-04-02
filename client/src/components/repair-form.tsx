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
import { ImagePlus, X, Brain, Stethoscope, ArrowRight, Image, CircleAlert, Check, MessageCircle, ExternalLink, Volume2 } from "lucide-react";
import AudioUpload from "./audio-upload";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { useLocation } from "wouter";
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
  const [multipleImages, setMultipleImages] = useState<string[]>([]);
  const [audioRecording, setAudioRecording] = useState<string | null>(null);
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
  const [_, navigate] = useLocation();

  const form = useForm<InsertRepairRequest>({
    resolver: zodResolver(insertRepairRequestSchema),
    defaultValues: {
      productType: "",
      issueDescription: "",
      imageUrl: "",
      imageUrls: [],
      audioUrl: "",
    },
  });

  // Check if we have enough information to proceed
  useEffect(() => {
    // If we have image analysis and user has answered all questions or no questions were needed
    if (imageAnalysisResult && imageAnalysisResult.additional_questions) {
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
      // If no image is uploaded, we'll proceed with text-based analysis only
      if (!imagePreview && (!multipleImages || multipleImages.length === 0)) {
        console.log("No image uploaded, proceeding with text-based analysis only");
        
        // Generate more specific questions based on the product type
        const additionalQuestions = getContextSpecificQuestions(productType, issueDescription);
        
        // We still need to make an API request for text-based analysis to ensure server-side processing
        const requestPayload = {
          question: `Analyze this ${productType} with the following issue: ${issueDescription}`,
          productType,
          issueDescription,
          context: [],
        };
        
        // Make API request for text analysis only
        try {
          const res = await apiRequest(
            "POST",
            "/api/repair-questions",
            requestPayload
          );
          
          if (!res.ok) {
            throw new Error('Failed to process text analysis');
          }
          
          const data = await res.json();
          console.log("API response for text analysis:", data);
          
          // Always ensure we have the additional questions even if API doesn't return them
          const enhancedData = {
            ...data,
            detected_issue: data.detected_issue || issueDescription,
            confidence: data.confidence || 0.7,
            // Use our local questions if the API doesn't return any
            additional_questions: (data.additional_questions && Array.isArray(data.additional_questions) && 
                                data.additional_questions.length > 0) ? 
                                data.additional_questions : additionalQuestions,
            recommendations: data.recommendations || []
          };
          
          console.log("Enhanced data with questions:", enhancedData);
          setImageAnalysisResult(enhancedData);
        } catch (error) {
          console.error("Text analysis failed, using fallback method:", error);
          
          // Fallback to client-side analysis if API fails
          setImageAnalysisResult({
            detected_issue: issueDescription,
            confidence: 0.7,
            additional_questions: additionalQuestions,
            recommendations: []
          });
        }
        
        setStep(2);
        return;
      }
      
      // If image is provided, call the API to analyze it with enhanced prompt
      const analysisPrompt = `Analyze this image and identify the issue with this ${productType}. 
The user describes the issue as: "${issueDescription}"

IMPORTANT ANALYSIS REQUIREMENTS:
1. Focus PRIMARILY on what you can see in the actual image
2. Compare the visual evidence with the user's text description
3. Identify specific parts that are broken or malfunctioning
4. Look for signs of damage, wear, unusual conditions or error indicators
5. Determine if the image confirms or contradicts the user's description

REQUIRED OUTCOME:
- Provide a comprehensive diagnosis that integrates BOTH visual evidence AND the text description
- Ask highly specific diagnostic questions about exactly what's visible in the image`;

      // Use multiple images if available
      const requestPayload = {
        question: analysisPrompt,
        productType,
        issueDescription,
        context: [],
      };

      // If we have multiple images, use imageUrls instead of imageUrl
      if (multipleImages && multipleImages.length > 1) {
        Object.assign(requestPayload, { 
          imageUrls: multipleImages,
          // Keep imageUrl for backwards compatibility (first image)
          imageUrl: multipleImages[0]
        });
        console.log(`Analyzing ${multipleImages.length} images for this repair request`);
      } else if (imagePreview) {
        // Single image case
        Object.assign(requestPayload, { imageUrl: imagePreview });
      }
      
      const res = await apiRequest(
        "POST",
        "/api/repair-questions",
        requestPayload
      );
      
      if (!res.ok) {
        throw new Error('Failed to analyze image');
      }
      
      const data = await res.json();
      console.log("Image analysis result:", data);
      
      // Create a structured analysis result that intelligently combines AI and fallback questions
      // Generate context-specific questions as fallback
      const specificQuestions = getContextSpecificQuestions(productType, issueDescription);
      
      // If we have high confidence AI-generated questions, prioritize those
      let combinedQuestions: string[] = [];
      
      if (data.additional_questions && data.additional_questions.length > 0 && data.confidence > 0.5) {
        // Use AI questions as primary source
        combinedQuestions = data.additional_questions;
        
        // Add any unique context-specific questions if we don't have enough
        if (combinedQuestions.length < 3) {
          specificQuestions.forEach((q: string) => {
            if (!combinedQuestions.some((aiQ: string) => aiQ.toLowerCase().includes(q.toLowerCase().substring(0, 15)))) {
              if (combinedQuestions.length < 4) {
                combinedQuestions.push(q);
              }
            }
          });
        }
      } else {
        // If AI confidence is low, use our context-specific questions but add any unique AI ones
        combinedQuestions = specificQuestions;
        
        if (data.additional_questions && data.additional_questions.length > 0) {
          data.additional_questions.forEach((q: string) => {
            if (!combinedQuestions.some((specificQ: string) => specificQ.toLowerCase().includes(q.toLowerCase().substring(0, 15)))) {
              if (combinedQuestions.length < 5) {
                combinedQuestions.push(q);
              }
            }
          });
        }
      }
      
      const analysisResult: ImageAnalysisResult = {
        detected_issue: data.detected_issue || issueDescription,
        confidence: data.confidence || 0.7,
        additional_questions: combinedQuestions,
        recommendations: data.recommendations || []
      };
      
      setImageAnalysisResult(analysisResult);
      setStep(2);
    } catch (error) {
      console.error("Error analyzing image:", error);
      // Add more detailed error information
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log("Error details:", errorMessage);
      
      toast({
        title: "Error",
        description: "Failed to analyze image. Proceeding with text description only.",
        variant: "destructive",
      });
      // Even if image analysis fails, still proceed to confirmation step with specific questions
      const specificQuestions = getContextSpecificQuestions(productType, issueDescription);
      setImageAnalysisResult({
        detected_issue: issueDescription,
        confidence: 0.5,
        additional_questions: specificQuestions,
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

  // Get specific diagnostic questions based on product type and issue description
  const getContextSpecificQuestions = (productType: string, issueDescription: string): string[] => {
    const productTypeLower = productType.toLowerCase();
    const issueDescriptionLower = issueDescription.toLowerCase();
    
    // Enhanced default questions for any product
    const defaultQuestions = [
      "When did you first notice this issue?",
      "Does the problem occur consistently or intermittently?",
      "Have you attempted any repairs or troubleshooting already?",
      "On a scale of 1-10, how severely does this issue affect the product's functionality?"
    ];
    
    // VEHICLE DIAGNOSTICS
    if (productTypeLower.includes("car") || productTypeLower.includes("vehicle") || productTypeLower.includes("auto")) {
      // Brake system issues
      if (issueDescriptionLower.includes("brake") || issueDescriptionLower.includes("break") || 
          issueDescriptionLower.includes("stop") || issueDescriptionLower.includes("pedal")) {
        return [
          "Do you hear any unusual sounds when applying the brakes (squealing, grinding, etc.)?",
          "Does the brake pedal feel soft, spongy, or go too far down when pressed?",
          "Does the car pull to one side when braking?",
          "Have you checked the brake fluid level and condition (color)?",
          "When was the last time you had your brakes serviced?",
          "Does the brake pedal pulsate or vibrate when pressed?",
          "Do the brakes feel less responsive when the vehicle is wet or after driving through water?"
        ];
      } 
      // Engine issues
      else if (issueDescriptionLower.includes("engine") || issueDescriptionLower.includes("start") || 
               issueDescriptionLower.includes("crank") || issueDescriptionLower.includes("power")) {
        return [
          "Does the engine turn over (crank) but not start?",
          "Are there any warning lights illuminated on the dashboard?",
          "Have you checked the battery connections and battery age?",
          "Have you noticed any unusual sounds when attempting to start the engine?",
          "Any unusual odors (fuel smell, burning smell, etc.)?",
          "When was your last oil change and other routine maintenance?",
          "Have you had any fuel or electrical issues recently?",
          "Does the issue occur when the engine is cold, warm, or both?"
        ];
      } 
      // Transmission issues
      else if (issueDescriptionLower.includes("transmission") || issueDescriptionLower.includes("gear") || 
               issueDescriptionLower.includes("shift") || issueDescriptionLower.includes("clutch")) {
        return [
          "Is there any unusual shifting, delay, or slippage between gears?",
          "Have you noticed any fluid leaks under your car (color of the fluid)?",
          "Does the transmission make grinding, whining, or clunking noises?",
          "Do you feel vibrations or shuddering when the car is in specific gears?",
          "Does the issue occur when the transmission is cold, warm, or both?",
          "For manual transmissions: Is the clutch pedal functioning normally?",
          "For automatic transmissions: Does it ever get stuck in a particular gear?"
        ];
      }
      // Electrical system issues
      else if (issueDescriptionLower.includes("electric") || issueDescriptionLower.includes("light") || 
               issueDescriptionLower.includes("battery") || issueDescriptionLower.includes("alternator") ||
               issueDescriptionLower.includes("fuse") || issueDescriptionLower.includes("power window")) {
        return [
          "Which specific electrical components are affected?",
          "Does the issue happen consistently or intermittently?",
          "Have you checked the battery voltage and connections?",
          "Have you inspected related fuses in the fuse box?",
          "Does the problem occur only when using certain accessories?",
          "Have you noticed dimming lights or other electrical issues?",
          "When was the last time your car's battery or alternator was checked?"
        ];
      }
      // Suspension/steering issues
      else if (issueDescriptionLower.includes("steering") || issueDescriptionLower.includes("suspension") || 
               issueDescriptionLower.includes("bumpy") || issueDescriptionLower.includes("alignment") ||
               issueDescriptionLower.includes("wheel") || issueDescriptionLower.includes("shock")) {
        return [
          "Do you feel vibrations in the steering wheel?",
          "Does the car pull to one side during normal driving?",
          "Do you hear any unusual noises when going over bumps?",
          "Have you noticed uneven tire wear?",
          "Does the steering feel loose or have excessive play?",
          "When was the last wheel alignment or suspension check?",
          "Does the ride feel unusually hard, soft, or bouncy?"
        ];
      }
      
      // General car questions if specific issue wasn't matched
      return [
        "What make, model, and year is your car?",
        "What is the current mileage on your vehicle?",
        "When did you first notice the problem?",
        "Does the issue happen all the time or only under certain conditions (weather, speed, etc.)?",
        "Have you had any recent repairs or maintenance done on the vehicle?",
        "Are there any warning lights or messages on the dashboard?",
        "Have you noticed any unusual sounds, smells, or physical sensations when driving?"
      ];
    }
    
    // FURNITURE DIAGNOSTICS
    else if (productTypeLower.includes("chair") || productTypeLower.includes("sofa") || 
             productTypeLower.includes("furniture") || productTypeLower.includes("table")) {
      // Broken furniture issues
      if (issueDescriptionLower.includes("broken") || issueDescriptionLower.includes("crack") || 
          issueDescriptionLower.includes("snap") || issueDescriptionLower.includes("split")) {
        return [
          "Which specific part of the furniture is broken or cracked?",
          "Do you hear any sounds (cracking, creaking) when using the furniture?",
          "Did it break suddenly due to an event, or gradually over time?",
          "What material is the broken part made of (wood, metal, plastic, etc.)?",
          "Approximately how old is the furniture?",
          "Has the furniture been exposed to extreme conditions (humidity, heat, etc.)?",
          "Have you attempted any repairs already?"
        ];
      } 
      // Stability issues
      else if (issueDescriptionLower.includes("wobble") || issueDescriptionLower.includes("unstable") || 
               issueDescriptionLower.includes("balance") || issueDescriptionLower.includes("uneven") ||
               issueDescriptionLower.includes("tilt")) {
        return [
          "Are all the legs of equal length, or is there a gap under one of them?",
          "Does the wobbling happen on all floor types or just certain surfaces?",
          "Have you tried tightening any screws, bolts, or fasteners?",
          "Has the furniture been disassembled and reassembled previously?",
          "Is the furniture level, or is the floor possibly uneven?",
          "Are there any visible signs of damage to the base or legs?",
          "Does the wobbling occur only when weight is applied in specific areas?"
        ];
      }
      // Upholstery issues
      else if (issueDescriptionLower.includes("fabric") || issueDescriptionLower.includes("upholstery") || 
               issueDescriptionLower.includes("cushion") || issueDescriptionLower.includes("leather") ||
               issueDescriptionLower.includes("stain") || issueDescriptionLower.includes("tear")) {
        return [
          "What type of upholstery material is affected (leather, fabric, etc.)?",
          "Is the issue a stain, tear, wear, or something else?",
          "How large is the affected area?",
          "Have you attempted to clean or repair the area already?",
          "How old is the furniture?",
          "Is the issue in a high-use area of the furniture?",
          "For cushions: have they lost their shape or firmness?"
        ];
      }
      
      // General furniture questions
      return [
        "What type of furniture is it (office chair, dining table, sofa, etc.)?",
        "What material is the furniture primarily made of?",
        "How old is the furniture?",
        "Has it been moved or relocated recently?",
        "Is this furniture regularly used or more decorative?",
        "Was it purchased assembled or did you assemble it yourself?",
        "Has it been exposed to unusual conditions (high humidity, direct sunlight, etc.)?"
      ];
    } 
    
    // SMARTPHONE DIAGNOSTICS
    else if (productTypeLower.includes("phone") || productTypeLower.includes("smartphone") || 
             productTypeLower.includes("iphone") || productTypeLower.includes("android")) {
      // Screen issues
      if (issueDescriptionLower.includes("screen") || issueDescriptionLower.includes("display") || 
          issueDescriptionLower.includes("crack") || issueDescriptionLower.includes("touch")) {
        return [
          "Is the screen physically cracked, or just having display issues?",
          "Are there visible lines, discoloration, or dead pixels on the screen?",
          "Can you still use the touchscreen functionality? If not, completely or partially?",
          "Did you drop the phone before the issue started?",
          "Did the issue start suddenly or develop gradually?",
          "Have you tried restarting the phone or resetting any settings?",
          "Does the issue persist in safe mode (for Android devices)?"
        ];
      } 
      // Battery/charging issues
      else if (issueDescriptionLower.includes("battery") || issueDescriptionLower.includes("charging") || 
               issueDescriptionLower.includes("power") || issueDescriptionLower.includes("won't turn on") ||
               issueDescriptionLower.includes("dies quickly")) {
        return [
          "How long does your battery currently last compared to when it was new?",
          "Have you tried using different charging cables, adapters, or outlets?",
          "Does the phone get unusually hot while charging or during use?",
          "Does the battery percentage drop suddenly or display incorrectly?",
          "Are there any specific apps that seem to drain the battery faster?",
          "How old is your phone and when did this issue begin?",
          "Have you installed any recent updates before the issue started?"
        ];
      }
      // Software/performance issues
      else if (issueDescriptionLower.includes("slow") || issueDescriptionLower.includes("freeze") || 
               issueDescriptionLower.includes("crash") || issueDescriptionLower.includes("app") ||
               issueDescriptionLower.includes("update") || issueDescriptionLower.includes("hang")) {
        return [
          "Which specific apps or functions are affected by the slowdown/freezing?",
          "When did your phone start having these performance issues?",
          "How much storage space is available on your device?",
          "Have you tried closing background apps or restarting the device?",
          "Did this issue start after an operating system update or app installation?",
          "Have you cleared the cache or app data for problematic apps?",
          "Does the problem occur in safe mode (for Android devices)?"
        ];
      }
      // Camera issues
      else if (issueDescriptionLower.includes("camera") || issueDescriptionLower.includes("photo") || 
               issueDescriptionLower.includes("picture") || issueDescriptionLower.includes("blurry") ||
               issueDescriptionLower.includes("focus")) {
        return [
          "Which camera is affected (front, back, or both)?",
          "What specific issues are you experiencing (blurry photos, camera not opening, etc.)?",
          "Have you tried clearing the camera app cache/data?",
          "Does the issue occur in all lighting conditions?",
          "Is the camera lens clean and free from scratches?",
          "Does the issue happen with third-party camera apps as well?",
          "Have you dropped your phone recently or exposed it to moisture?"
        ];
      }
      
      // General phone questions
      return [
        "What model of phone do you have and which operating system version?",
        "When did you purchase the phone?",
        "Have you installed any new apps or updates before the issue started?",
        "Have you tried basic troubleshooting like restarting the device?",
        "Is your phone in a case? If so, have you tried removing it?",
        "Has your phone been exposed to water, extreme temperatures, or been dropped recently?",
        "Have you noticed any other issues besides the main problem you're reporting?"
      ];
    }
    
    // COMPUTER/LAPTOP DIAGNOSTICS
    else if (productTypeLower.includes("laptop") || productTypeLower.includes("computer") || 
             productTypeLower.includes("pc") || productTypeLower.includes("mac")) {
      // Performance issues
      if (issueDescriptionLower.includes("slow") || issueDescriptionLower.includes("performance") || 
          issueDescriptionLower.includes("freeze") || issueDescriptionLower.includes("lag") ||
          issueDescriptionLower.includes("hang")) {
        return [
          "When did your computer start slowing down?",
          "How much free storage space do you have available?",
          "Are there specific programs or situations that cause the slowdown?",
          "Have you checked for malware or viruses recently?",
          "How much RAM does your computer have?",
          "Have you tried restarting or resetting your computer?",
          "Does the problem persist in safe mode?",
          "Have you checked Task Manager (Windows) or Activity Monitor (Mac) to see what's using resources?"
        ];
      } 
      // Keyboard issues
      else if (issueDescriptionLower.includes("keyboard") || issueDescriptionLower.includes("key") || 
               issueDescriptionLower.includes("typing") || issueDescriptionLower.includes("stuck")) {
        return [
          "Which specific keys are affected?",
          "Do the keys physically feel different, or just not register when pressed?",
          "Have you tried cleaning the keyboard?",
          "Did you spill any liquid on the keyboard recently?",
          "Does the issue persist with an external keyboard?",
          "Have you updated your keyboard drivers recently?",
          "For laptop keyboards: are there any visible signs of damage or wear?"
        ];
      }
      // Display issues
      else if (issueDescriptionLower.includes("screen") || issueDescriptionLower.includes("display") || 
               issueDescriptionLower.includes("monitor") || issueDescriptionLower.includes("flicker") ||
               issueDescriptionLower.includes("blue screen") || issueDescriptionLower.includes("BSOD")) {
        return [
          "What specific display issues are you experiencing (blank screen, flickering, distorted colors)?",
          "Does the issue persist with an external monitor?",
          "Have you updated your graphics drivers recently?",
          "Does the problem occur immediately at startup or after the computer has been running?",
          "Have you checked display connections and cables?",
          "Do you see any error messages before or during the display issue?",
          "Have you adjusted display settings recently?"
        ];
      }
      // Overheating/noise issues
      else if (issueDescriptionLower.includes("hot") || issueDescriptionLower.includes("overheat") || 
               issueDescriptionLower.includes("fan") || issueDescriptionLower.includes("noise") ||
               issueDescriptionLower.includes("temperature") || issueDescriptionLower.includes("loud")) {
        return [
          "When does the overheating or noise occur (during specific tasks or all the time)?",
          "Have you cleaned the fan vents and internal cooling system recently?",
          "Is your computer placed on a hard, flat surface that allows proper ventilation?",
          "Have you used temperature monitoring software to check actual temperatures?",
          "Does the fan run constantly or intermittently?",
          "Have you noticed decreased performance when the computer gets hot?",
          "How old is your computer? Has this issue developed gradually or suddenly?"
        ];
      }
      // Connection/WiFi issues
      else if (issueDescriptionLower.includes("wifi") || issueDescriptionLower.includes("internet") || 
               issueDescriptionLower.includes("network") || issueDescriptionLower.includes("connection") ||
               issueDescriptionLower.includes("bluetooth") || issueDescriptionLower.includes("wireless")) {
        return [
          "Is the issue with WiFi, Bluetooth, or another type of connection?",
          "Does the problem occur on all networks or just specific ones?",
          "Have you tried restarting your router and computer?",
          "Have you checked if other devices can connect to the same network?",
          "Have you updated network drivers recently?",
          "Do you see any error messages when trying to connect?",
          "Does the connection drop intermittently or fail to connect at all?"
        ];
      }
      
      // General computer questions
      return [
        "What brand and model is your computer/laptop?", 
        "What operating system and version are you using?",
        "How old is the computer?",
        "Have you installed any new software or hardware recently?",
        "When did this issue start, and was there any specific event that triggered it?",
        "Have you attempted any troubleshooting steps already?",
        "Do you keep your operating system and drivers updated regularly?"
      ];
    }
    
    // APPLIANCE DIAGNOSTICS (New category)
    else if (productTypeLower.includes("appliance") || productTypeLower.includes("refrigerator") || 
             productTypeLower.includes("washer") || productTypeLower.includes("dryer") ||
             productTypeLower.includes("dishwasher") || productTypeLower.includes("oven") ||
             productTypeLower.includes("microwave") || productTypeLower.includes("stove")) {
      // Refrigerator issues
      if (productTypeLower.includes("refrigerator") || productTypeLower.includes("fridge")) {
        return [
          "Is the refrigerator not cooling properly, making noise, or having another issue?",
          "Have you checked the temperature settings?",
          "Is there adequate airflow around the refrigerator?",
          "When was the last time you cleaned the coils?",
          "Are there any unusual sounds (buzzing, clicking, etc.)?",
          "Is the issue with the refrigerator section, freezer section, or both?",
          "Have you noticed any water leakage or ice buildup?"
        ];
      }
      // Washer/dryer issues
      else if (productTypeLower.includes("washer") || productTypeLower.includes("dryer") ||
               productTypeLower.includes("laundry")) {
        return [
          "What specific issue are you experiencing (not starting, noise, leaking, etc.)?",
          "Have you checked for error codes on the display?",
          "Is the appliance properly leveled on the floor?",
          "Have you cleaned any filters or lint traps recently?",
          "Does the issue happen with every cycle or only specific ones?",
          "For washers: Have you noticed any leaks or water drainage issues?",
          "For dryers: Are clothes taking longer than normal to dry?"
        ];
      }
      // Dishwasher issues
      else if (productTypeLower.includes("dishwasher")) {
        return [
          "What's the specific issue (not cleaning properly, leaking, not draining, etc.)?",
          "Have you checked for and cleaned any food debris in filters or spray arms?",
          "Are you using the appropriate detergent for your dishwasher?",
          "Have you checked for any error codes on the display?",
          "Is water entering the dishwasher properly during the cycle?",
          "Are there any unusual sounds during operation?",
          "Has the issue developed gradually or suddenly?"
        ];
      }
      // Cooking appliance issues
      else if (productTypeLower.includes("oven") || productTypeLower.includes("stove") ||
               productTypeLower.includes("microwave") || productTypeLower.includes("range")) {
        return [
          "Which part of the appliance is malfunctioning?",
          "For ovens: Is it not heating, heating unevenly, or not maintaining temperature?",
          "For stoves: Are all burners affected or just specific ones?",
          "For microwaves: Is it not heating, making unusual sounds, or having display issues?",
          "Have you checked for any error codes on the display?",
          "When did this issue start?",
          "Have you already attempted any troubleshooting or repairs?"
        ];
      }
      
      // General appliance questions
      return [
        "What brand and model is your appliance?",
        "How old is the appliance?",
        "When did you first notice the issue?",
        "Have you checked the power supply and connections?",
        "Have you consulted the owner's manual for troubleshooting steps?",
        "Are there any unusual sounds, smells, or visible issues?",
        "Has the appliance received any maintenance or repairs previously?"
      ];
    }
    
    // ELECTRONICS DIAGNOSTICS (Additional category)
    else if (productTypeLower.includes("tv") || productTypeLower.includes("speaker") || 
             productTypeLower.includes("headphone") || productTypeLower.includes("tablet") ||
             productTypeLower.includes("console") || productTypeLower.includes("camera")) {
      // TV issues
      if (productTypeLower.includes("tv") || productTypeLower.includes("television")) {
        return [
          "What specific issue are you experiencing (no picture, no sound, picture quality, etc.)?",
          "Have you checked all cable connections?",
          "Does the issue occur with all input sources or just specific ones?",
          "Have you tried a factory reset?",
          "Are there any visible issues on the screen (dead pixels, lines, discoloration)?",
          "Does the remote control work properly?",
          "When did this issue start, and was there a specific event that triggered it?"
        ];
      }
      // Audio device issues
      else if (productTypeLower.includes("speaker") || productTypeLower.includes("headphone") ||
               productTypeLower.includes("sound") || productTypeLower.includes("audio")) {
        return [
          "Is the issue with sound quality, connectivity, power, or something else?",
          "Does the issue happen with all audio sources or just specific ones?",
          "For wireless devices: have you tried re-pairing the device?",
          "Have you checked audio settings and volume levels?",
          "Is the audio distorted, intermittent, or completely absent?",
          "For headphones: do both ears have the same issue?",
          "Have you tried different audio cables (if applicable)?"
        ];
      }
      // Gaming console issues
      else if (productTypeLower.includes("console") || productTypeLower.includes("playstation") ||
               productTypeLower.includes("xbox") || productTypeLower.includes("nintendo")) {
        return [
          "What specific issue are you experiencing with your console?",
          "Are there any error codes or messages displayed?",
          "Have you checked all cable connections?",
          "Does the issue occur with all games or just specific ones?",
          "Have you tried resetting or power cycling the console?",
          "Is there adequate ventilation around the console?",
          "When did this issue start? Did it follow a system update or new game installation?"
        ];
      }
      
      // General electronics questions
      return [
        "What brand and model is your device?",
        "How old is the device?",
        "When did you first notice the issue?",
        "Have you checked all power and connection cables?",
        "Have you tried resetting or restarting the device?",
        "Is the device receiving power correctly?",
        "Has the device been exposed to water, extreme temperatures, or physical damage?"
      ];
    }
    
    // If nothing else matches, return enhanced default questions
    return defaultQuestions;
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
    
    // Note if audio was provided
    if (audioRecording) {
      enhancedDescription += "\n\nAudio recording of the issue has been provided.";
    }
    
    // Update the form with enhanced description
    form.setValue('issueDescription', enhancedDescription, { shouldValidate: true });
    
    // Submit the enhanced form
    setIsSubmittingForm(true);
    mutation.mutate({
      ...form.getValues(),
      issueDescription: enhancedDescription,
      audioUrl: audioRecording || ""
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
      
      // Set the first image as the preview and as imageUrl for backward compatibility
      setImagePreview(base64String);
      form.setValue('imageUrl', base64String, { shouldValidate: true });
      
      // Add to the multipleImages array
      const updatedImages = [...multipleImages, base64String];
      setMultipleImages(updatedImages);
      form.setValue('imageUrls', updatedImages, { shouldValidate: true });
      
      toast({
        title: "Image added",
        description: `Added image ${updatedImages.length} of your ${form.getValues('productType')}`,
      });
    };
    reader.readAsDataURL(file);
  };

  const removeImage = (imageToRemove?: string) => {
    if (!imageToRemove) {
      // If no specific image is specified, clear all images
      setImagePreview(null);
      setMultipleImages([]);
      form.setValue('imageUrl', '', { shouldValidate: true });
      form.setValue('imageUrls', [], { shouldValidate: true });
      return;
    }
    
    // Remove specific image
    const updatedImages = multipleImages.filter(img => img !== imageToRemove);
    setMultipleImages(updatedImages);
    form.setValue('imageUrls', updatedImages, { shouldValidate: true });
    
    // Update preview if needed
    if (imagePreview === imageToRemove) {
      const newPreview = updatedImages.length > 0 ? updatedImages[0] : null;
      setImagePreview(newPreview);
      form.setValue('imageUrl', newPreview || '', { shouldValidate: true });
    }
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
          audioUrl={audioRecording || undefined}
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
            setMultipleImages([]);
            setAudioRecording(null);
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
              {multipleImages && multipleImages.length > 0 
                ? multipleImages && multipleImages.length > 1 
                  ? ` based on ${multipleImages.length} uploaded images` 
                  : " based on your uploaded image"
                : " based on your description"
              }
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
                  {multipleImages && multipleImages.length > 0 && (
                    <div className={`${multipleImages && multipleImages.length > 1 ? 'md:w-1/2' : 'md:w-1/3'}`}>
                      {/* Show primary image larger */}
                      <div className="relative mb-2">
                        <img 
                          src={typeof imagePreview === 'string' ? imagePreview : (multipleImages && multipleImages.length > 0 ? multipleImages[0] : '')} 
                          alt="Primary uploaded issue" 
                          className="rounded-lg max-h-[200px] w-full object-cover"
                        />
                        <Badge 
                          variant="outline" 
                          className="absolute top-2 right-2 bg-background/80"
                        >
                          <Image className="h-3 w-3 mr-1" />
                          Primary Image
                        </Badge>
                      </div>
                      
                      {/* Show additional images as thumbnails */}
                      {multipleImages && multipleImages.length > 1 && (
                        <div className="flex gap-1 flex-wrap">
                          {multipleImages && multipleImages.slice(0, 3).map((img, idx) => {
                            if (typeof imagePreview === 'string' && img === imagePreview) {
                              return null; // Skip the primary image
                            }
                            return (
                              <div key={idx} className="relative">
                                <img 
                                  src={img} 
                                  alt={`Additional image ${idx + 1}`} 
                                  className="h-16 w-16 rounded-md object-cover"
                                />
                              </div>
                            );
                          })}
                          {multipleImages && multipleImages.length > 4 && (
                            <div className="h-16 w-16 rounded-md bg-muted flex items-center justify-center text-muted-foreground text-sm">
                              +{multipleImages.length - 4} more
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className={`${multipleImages && multipleImages.length > 0 ? 'md:w-2/3' : 'w-full'}`}>
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
                {imageAnalysisResult && imageAnalysisResult.additional_questions && imageAnalysisResult.additional_questions.length > 0 && (
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
                {imageAnalysisResult && imageAnalysisResult.recommendations && imageAnalysisResult.recommendations.length > 0 && (
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
      <form onSubmit={form.handleSubmit((data) => {
        console.log("Form submitted with data:", data);
        handleAnalyzeImage();
      })} className="space-y-6">
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
              <FormLabel>Upload Images <span className="ml-2 text-xs text-muted-foreground">(Upload multiple for better diagnosis)</span></FormLabel>
              <FormControl>
                <div className="space-y-4">
                  {/* Multiple Images Preview */}
                  {multipleImages && multipleImages.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {multipleImages.map((image, index) => (
                        <div key={index} className="relative inline-block">
                          <img 
                            src={image} 
                            alt={`Preview ${index + 1}`} 
                            className="h-[120px] rounded-lg object-cover"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              removeImage(image);
                            }}
                            className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 shadow-sm"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
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
                      {multipleImages && multipleImages.length > 0 ? `Add Another Image (${multipleImages.length})` : "Upload Image"}
                    </Button>
                  </div>
                  
                  {(!multipleImages || multipleImages.length === 0) && (
                    <div className="text-sm text-muted-foreground space-y-2">
                      <p>Upload multiple images to help us diagnose your issue more accurately</p>
                      <p>Different angles and closeups of the problem area are most helpful</p>
                    </div>
                  )}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Audio Upload Component */}
        <FormField
          control={form.control}
          name="audioUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                <div className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4" />
                  <span>Add Sound Recording</span>
                  <span className="ml-2 text-xs text-muted-foreground">(Optional - helpful for mechanical issues)</span>
                </div>
              </FormLabel>
              <FormControl>
                <AudioUpload
                  onAudioCaptured={(audioData) => {
                    setAudioRecording(audioData);
                    field.onChange(audioData);
                  }}
                  onAudioRemoved={() => {
                    setAudioRecording(null);
                    field.onChange("");
                  }}
                  existingAudio={audioRecording || ""}
                  className="w-full"
                />
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
            multipleImages && multipleImages.length > 0 
              ? `Analyzing ${multipleImages.length} ${multipleImages.length === 1 ? 'Image' : 'Images'} & Issue...` 
              : "Analyzing Issue..."
          ) : (
            <>
              <ArrowRight className="mr-2 h-4 w-4" />
              {multipleImages && multipleImages.length > 0 
                ? `Continue with ${multipleImages.length} ${multipleImages.length === 1 ? 'Image' : 'Images'}` 
                : "Continue with Text Analysis"}
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}