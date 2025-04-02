import OpenAI from "openai";
import { env } from "process";
import { trackRepairAnalytics, calculateConsistencyScore, detectInconsistencies } from "./repair-analytics";
import { InsertRepairAnalytics } from "@shared/schema";
import { db } from "../db";
import { repairRequests } from "@shared/schema";
import { eq } from "drizzle-orm";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY
});

// Simple in-memory cache for diagnostic responses to improve performance
interface CacheEntry {
  timestamp: number;
  data: any;
}

const CACHE_TTL = 30 * 60 * 1000; // 30 minutes cache TTL
const diagnosticCache = new Map<string, CacheEntry>();
const API_TIMEOUT = 8000; // 8 second timeout

/**
 * Track diagnostic analytics in a consistent way
 * This helps avoid duplicate code and ensures all analytics are tracked properly
 */
async function trackDiagnosticAnalytics(
  startTime: number,
  productType: string,
  issueDescription: string,
  repairRequestId: number,
  diagnostic: any,
  rawContent?: string,
  systemPrompt?: string
): Promise<void> {
  try {
    // Create a summary of the AI response for analysis
    const causesSummary = diagnostic.possibleCauses.join('. ');
    const stepsSummary = diagnostic.diagnosticSteps.join('. ');
    
    // Create a string-based summary for consistency calculations
    const responseSummaryText = `
      Symptoms: ${diagnostic.symptomInterpretation}
      Causes: ${causesSummary}
      Steps: ${stepsSummary}
    `;

    // Create a detailed object for analytics storage
    const analyticsData = {
      response_time: Date.now() - startTime,
      product_category: productType,
      issue_complexity: issueDescription.length > 100 ? "Complex" : "Simple"
    };
    
    // Calculate tokens (approximate method)
    const promptTokens = (systemPrompt?.length || 0) + productType.length + issueDescription.length;
    const completionTokens = rawContent?.length || responseSummaryText.length;
    
    // Get repair request details
    const repairRequest = await db.query.repairRequests.findFirst({
      where: eq(repairRequests.id, repairRequestId)
    });
    
    if (repairRequest) {
      // Calculate consistency score
      const consistencyScore = await calculateConsistencyScore(
        productType,
        issueDescription,
        responseSummaryText
      );
      
      // Check for potential inconsistencies
      const inconsistencyFlags = await detectInconsistencies(
        productType,
        responseSummaryText
      );
      
      // Calculate response time
      const responseTime = Date.now() - startTime;
      
      // Track the analytics data
      await trackRepairAnalytics({
        repairRequestId,
        productType,
        issueDescription,
        promptTokens,
        completionTokens,
        responseTime,
        consistencyScore,
        aiResponseSummary: responseSummaryText,
        inconsistencyFlags
      });
      
      console.log("Tracked diagnostic analytics with consistency score:", consistencyScore);
      return;
    }
    
    throw new Error("Repair request not found");
  } catch (error) {
    console.error("Failed to track analytics:", error);
    throw error;
  }
}

/**
 * Generate a cache key based on input parameters
 */
function generateCacheKey(productType: string, issueDescription: string, audioUrl?: string): string {
  // Create a simple hash by combining product type and issue description
  const normalizedProductType = productType.trim().toLowerCase();
  const normalizedIssueDescription = issueDescription.trim().toLowerCase();
  // Add audio indicator to the cache key if audio is provided
  return `${normalizedProductType}:${normalizedIssueDescription}${audioUrl ? ':audio' : ''}`;
}

/**
 * Check if a response exists in the cache
 */
async function getCachedResponse(key: string) {
  const cached = diagnosticCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log("Using cached response");
    return cached.data;
  }
  return null;
}

interface RepairStep {
  step: number;
  title: string;
  description: string;
  imageDescription: string;
  safetyWarnings?: string[];
  tools?: string[];
}

interface RepairGuide {
  title: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  estimatedTime: string;
  steps: RepairStep[];
  warnings: string[];
  tools: string[];
  videoKeywords: string[];
}

export interface RepairDiagnostic {
  symptomInterpretation: string;
  possibleCauses: string[];
  informationGaps: string[];
  diagnosticSteps: string[];
  likelySolutions: string[];
  safetyWarnings: string[];
  specificQuestions?: string[]; // Specific questions to ask to determine root cause
}

interface RepairQuestionInput {
  question: string;
  productType: string;
  issueDescription?: string;
  imageUrl?: string;
  imageUrls?: string[]; // New field for multiple images
  context?: { role: "user" | "assistant"; content: string }[];
  currentStep?: number;
}

/**
 * Provides pre-written responses for very common issues to avoid unnecessary API calls
 */
function getPrewrittenResponse(productType: string, issueDescription: string): RepairDiagnostic | null {
  // Convert to lowercase for case-insensitive matching
  const type = productType.toLowerCase();
  const issue = issueDescription.toLowerCase();
  
  // Common laptop issues
  if (type === 'laptop' && (issue.includes('overheat') || issue.includes('hot'))) {
    return {
      symptomInterpretation: "Laptop overheating (too hot to touch, shutdowns, or fans running loudly)",
      possibleCauses: [
        "Dust buildup in cooling system",
        "Blocked air vents",
        "Failing cooling fan",
        "Poor thermal paste application",
        "High ambient temperature",
        "Resource-intensive software"
      ],
      informationGaps: [
        "Laptop age and model",
        "When overheating occurs",
        "Any recent changes to the system"
      ],
      diagnosticSteps: [
        "Check for dust in vents and fans",
        "Monitor CPU temperature with software tools",
        "Test fan operation",
        "Run diagnostics in safe mode to rule out software causes",
        "Check for airflow blockage (using on soft surfaces)"
      ],
      likelySolutions: [
        "Clean dust from vents and internal components",
        "Replace thermal paste on CPU/GPU",
        "Use a cooling pad",
        "Replace faulty cooling fan",
        "Close resource-intensive applications"
      ],
      safetyWarnings: [
        "Never use water to clean electronics",
        "Disconnect power before opening laptop",
        "Seek professional help if uncomfortable with internal components"
      ]
    };
  }
  
  // Common smartphone issues
  if (type === 'phone' && (issue.includes('battery') || issue.includes('charge'))) {
    return {
      symptomInterpretation: "Phone battery drains quickly or doesn't hold charge",
      possibleCauses: [
        "Battery age/wear",
        "Power-hungry apps running in background",
        "Screen brightness too high",
        "Poor cellular signal causing increased power use",
        "Outdated system software",
        "Hardware defect"
      ],
      informationGaps: [
        "Phone age and model",
        "When battery problems started",
        "Recent app installations"
      ],
      diagnosticSteps: [
        "Check battery usage statistics in settings",
        "Test with brightness reduced",
        "Check for system updates",
        "Test in airplane mode to eliminate signal issues",
        "Close all background apps"
      ],
      likelySolutions: [
        "Uninstall power-hungry apps",
        "Enable battery saving mode",
        "Replace battery (if possible)",
        "Factory reset if software issue suspected",
        "Reduce screen brightness and timeout"
      ],
      safetyWarnings: [
        "Only use manufacturer-approved batteries and chargers",
        "Never puncture or expose batteries to heat",
        "Seek professional repair for built-in batteries"
      ]
    };
  }
  
  // Default - no pre-written response available
  return null;
}

/**
 * Helper function to get diagnostic response with optimized settings
 */
async function getDiagnosticResponse(productType: string, issueDescription: string, systemPrompt: string, audioUrl?: string): Promise<RepairDiagnostic> {
  const cacheKey = `${productType}-${issueDescription}${audioUrl ? '-audio' : ''}`;
  
  // Check cache first with product category matching
  const cachedResponse = await getCachedResponse(cacheKey);
  if (cachedResponse) {
    // Just use the cached response if it exists
    console.log("Using cached diagnostic response");
    return cachedResponse;
  }

  // Quick response for common issues
  if (issueDescription.length < 10) {
    try {
      const quickResponse = getPrewrittenResponse(productType, issueDescription);
      if (quickResponse) {
        diagnosticCache.set(cacheKey, { data: quickResponse, timestamp: Date.now() });
        console.log("Using pre-written response");
        return quickResponse;
      }
    } catch (e) {
      console.log("Quick response failed, using API");
    }
  }

  // Prepare enhanced context if audio recording is provided
  let userContent = `Analyze: ${productType} with issue: ${issueDescription}.`;
  
  if (audioUrl) {
    userContent += ` There is an audio recording of the issue which contains sound patterns that may help diagnose the problem. Consider any abnormal sounds, clicking, grinding, or irregular operational noises in your analysis.`;
  }
  
  userContent += ` Be brief and ensure valid JSON format.`;
  
  // Optimized API call
  const response = await Promise.race([
    openai.chat.completions.create({
      model: "gpt-3.5-turbo-0125",
      messages: [
        { 
          role: "system", 
          content: systemPrompt + "\n\nIMPORTANT: Ensure your entire response is valid JSON. Keep your analysis brief and concise. Always include closing brackets for all objects and arrays." 
        },
        { 
          role: "user", 
          content: userContent 
        }
      ],
      temperature: 0.2,
      max_tokens: 500, // Increased for complete responses
      presence_penalty: 0,
      frequency_penalty: 0,
      response_format: { type: "json_object" } // Ensure JSON formatting
    }),
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error("OpenAI API timeout")), API_TIMEOUT)
    )
  ]) as OpenAI.Chat.Completions.ChatCompletion;

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Empty response from OpenAI");
  }

  console.log("Received diagnostic response from OpenAI");

  let result: RepairDiagnostic;
  try {
    // First attempt to parse JSON directly
    try {
      result = JSON.parse(content);
    } catch (parseError) {
      // If parsing fails, try to fix common JSON issues
      console.log("Initial JSON parsing failed, attempting to fix JSON:", content);
      
      // Sometimes the JSON response gets cut off in the middle of a string
      // Let's try to fix it by closing any unclosed elements
      let fixedContent = content;
      
      // Check if content ends with a quote without closing the string
      if (fixedContent.trim().endsWith('"')) {
        fixedContent = fixedContent + '"}';
      }
      
      // Check if the safety warnings array is incomplete
      if (fixedContent.includes('"safetyWarnings": [') && !fixedContent.includes(']}')) {
        // Add closing brackets for array and object
        fixedContent = fixedContent + '"]}';
      }
      
      try {
        result = JSON.parse(fixedContent);
        console.log("Successfully parsed fixed JSON");
      } catch (secondError) {
        // If still failing, create a minimal valid diagnostic structure
        console.error("Could not fix JSON response, using fallback structure");
        result = {
          symptomInterpretation: "Analysis incomplete due to technical issues.",
          possibleCauses: ["Unable to determine - please try again"],
          informationGaps: ["Complete diagnostic information"],
          diagnosticSteps: ["Retry the diagnostic analysis", "Provide more detailed information about the issue"],
          likelySolutions: ["Try again with more specific information"],
          safetyWarnings: ["Always consult a professional for safety-critical repairs"]
        };
      }
    }
  } catch (error) {
    console.error("Failed to parse or fix JSON response:", content);
    throw new Error("Invalid JSON response from OpenAI");
  }

  // Validate diagnostic structure
  if (!result.symptomInterpretation || !Array.isArray(result.possibleCauses) || !Array.isArray(result.diagnosticSteps)) {
    console.error("Invalid diagnostic structure:", result);
    throw new Error("Generated diagnostic does not match required format");
  }

  // Cache the result for future use
  diagnosticCache.set(cacheKey, {
    timestamp: Date.now(),
    data: result
  });
  
  return result;
}

/**
 * Type definition for diagnostic information that can be passed to guide generation
 */
export interface DiagnosticInfo {
  possibleCauses?: string[];
  likelySolutions?: string[];
  safetyWarnings?: string[];
  answeredQuestions?: AnsweredQuestion[];
}

interface AnsweredQuestion {
  question: string;
  answer: string;
  timestamp: number;
  isSpecificQuestion: boolean;
}

/**
 * Generate a repair guide for a specific product and issue
 * @param productType The type of product (e.g., "smartphone", "refrigerator")
 * @param issue The issue description
 * @param repairRequestId Optional ID of the repair request for analytics tracking
 * @param diagnosticInfo Optional diagnostic information to enhance guide relevance
 * @returns A structured repair guide
 */
export async function generateRepairGuide(
  productType: string, 
  issue: string, 
  repairRequestId?: number, 
  diagnosticInfo?: DiagnosticInfo | null
): Promise<RepairGuide> {
  try {
    console.log("Starting guide generation for:", { 
      productType, 
      issue, 
      hasDiagnosticInfo: !!diagnosticInfo 
    });
    const startTime = Date.now();

    const systemPrompt = `You are a senior repair expert specializing in electronics and appliances with over 20 years of experience.
Generate comprehensive, step-by-step repair guides with a focus on thorough diagnostics, safety, and best practices.

CRITICAL REPAIR RULES:
1. For computer stability/crash issues:
   - ALWAYS include a Power Supply Unit (PSU) inspection and testing step
   - Include checking for inadequate wattage, failing capacitors, or loose power connections
   - Suggest PSU stress testing software when applicable

2. For RAM troubleshooting:
   - ALWAYS include a dedicated step for memory testing with MemTest86
   - ALWAYS include a separate step for checking/disabling XMP/DOCP profiles in BIOS
   - Include testing with individual memory modules BEFORE suggesting replacement

3. For USB issues, especially wake-from-sleep problems:
   - PRIORITIZE checking USB selective suspend settings in Windows power options
   - Include checking BIOS/UEFI USB legacy support and power management settings
   - Include updating motherboard chipset drivers BEFORE suggesting hardware fixes

4. For hardware diagnostics, order steps as follows:
   - Software diagnostics FIRST (drivers, OS settings, BIOS configuration)
   - Monitoring tools SECOND (temperature, voltage, performance monitoring)
   - External hardware tests THIRD (bootable diagnostics, connection tests)
   - Internal hardware checks LAST (opening case, reseating components)

IMPORTANT GUIDE REQUIREMENTS:
1. Organize steps in LOGICAL DIAGNOSTIC ORDER - start with simple, non-invasive tests before suggesting replacement
2. For each potential issue, provide EXHAUSTIVE troubleshooting steps with SPECIFIC INSTRUCTIONS
3. Include detailed explanations of WHY each test helps identify the root cause
4. NEVER jump directly from basic tests to "replace the component" - always include intermediate diagnostic steps
5. Each step's tool list should ONLY include items actually needed for that specific step
6. When a step addresses a USB/hardware issue, include driver updates, BIOS checks, and software troubleshooting BEFORE hardware replacement
7. Each step must directly connect to a specific symptom or cause identified in the diagnostics

Provide your response in this exact JSON format:
{
  "title": "Guide title",
  "difficulty": "Beginner|Intermediate|Advanced",
  "estimatedTime": "Estimated completion time",
  "steps": [
    {
      "step": 1,
      "title": "Step title",
      "description": "Detailed step description with specifics about HOW to perform each test, what to look for, and what the results mean. Include signal values, menu locations, etc. where applicable.",
      "imageDescription": "Description of what image would be helpful here",
      "safetyWarnings": ["List of safety warnings specific to this step"],
      "tools": ["ONLY tools needed for THIS specific step"]
    }
  ],
  "warnings": ["General safety warnings"],
  "tools": ["All required tools across ALL steps"],
  "videoKeywords": ["Keywords for finding relevant video tutorials"]
}`;

    // Prepare the user message with diagnostic information if available
    let userContent = `Generate a detailed, comprehensive repair guide for ${productType}. 
Issue: ${issue}

CRITICAL REQUIREMENTS:
1. Create a logical troubleshooting flow from software to hardware, simple to complex
2. Include specific steps for each potential cause, with exact details (values, menu paths, etc.)
3. Focus on diagnostic procedures that pinpoint the exact cause before suggesting replacements
4. Make each step self-contained with its own tools and precautions
5. Prefer software/driver/firmware solutions before suggesting hardware replacement

ISSUE-SPECIFIC DIAGNOSTIC REQUIREMENTS:
- For computer instability under load (crashes, freezes during gaming): ALWAYS include PSU testing
- For ANY memory issue symptoms: ALWAYS include MemTest86 and BIOS XMP/DOCP profile checking
- For wake-from-sleep USB issues: ALWAYS prioritize power settings and chipset driver updates
- For ALL hardware troubleshooting: Start with software/firmware, then monitoring tools, then hardware checks`;
    
    if (diagnosticInfo && Object.keys(diagnosticInfo).length > 0) {
      userContent += "\n\nThe following expert diagnostic analysis MUST be incorporated into your repair guide. Structure each step to specifically address these identified causes and their respective solutions:";
      
      if (diagnosticInfo.possibleCauses && diagnosticInfo.possibleCauses.length > 0) {
        userContent += `\n\nIDENTIFIED POSSIBLE CAUSES (each must be addressed with thorough diagnostic steps):\n${diagnosticInfo.possibleCauses.map((cause, index) => `${index + 1}. ${cause}`).join('\n')}`;
      }
      
      if (diagnosticInfo.likelySolutions && diagnosticInfo.likelySolutions.length > 0) {
        userContent += `\n\nRECOMMENDED SOLUTIONS (implement these in logical order after proper diagnosis):\n${diagnosticInfo.likelySolutions.map((solution, index) => `${index + 1}. ${solution}`).join('\n')}`;
      }
      
      if (diagnosticInfo.safetyWarnings && diagnosticInfo.safetyWarnings.length > 0) {
        userContent += `\n\nCRITICAL SAFETY WARNINGS (must be included where appropriate):\n${diagnosticInfo.safetyWarnings.map((warning, index) => `${index + 1}. ${warning}`).join('\n')}`;
      }
      
      // Include the user's answers to specific diagnostic questions
      if (diagnosticInfo.answeredQuestions && diagnosticInfo.answeredQuestions.length > 0) {
        userContent += "\n\nUSER DIAGNOSTIC RESPONSES (use these to personalize and refine the repair guide):";
        
        // Group questions by whether they were specific diagnostic questions or general
        const specificQuestions = diagnosticInfo.answeredQuestions.filter(q => q.isSpecificQuestion);
        const generalQuestions = diagnosticInfo.answeredQuestions.filter(q => !q.isSpecificQuestion);
        
        if (specificQuestions.length > 0) {
          userContent += "\n\nSPECIFIC DIAGNOSTIC QUESTIONS ANSWERED BY USER:";
          specificQuestions.forEach((qa, index) => {
            userContent += `\n${index + 1}. Q: ${qa.question}\n   A: ${qa.answer}`;
          });
        }
        
        if (generalQuestions.length > 0) {
          userContent += "\n\nADDITIONAL USER QUESTIONS AND RESPONSES:";
          generalQuestions.forEach((qa, index) => {
            userContent += `\n${index + 1}. Q: ${qa.question}\n   A: ${qa.answer}`;
          });
        }
        
        userContent += "\n\nIMPORTANT: Tailor your repair steps based on the user's responses above. If specific issues or conditions were mentioned, prioritize steps that address those exact conditions.";
      }
      
      userContent += "\n\nIMPORTANT: Your guide must explicitly address EACH of the causes/solutions above with detailed steps. For any step suggesting a hardware replacement, you MUST first include MULTIPLE software, driver, and diagnostic steps to confirm the hardware is truly at fault.";
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent }
      ],
      temperature: 0.3, // Set to 0.3 for balanced consistency and slight variability
      max_tokens: 2000
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    console.log("Received response from OpenAI:", content);
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    let result: RepairGuide;
    try {
      result = JSON.parse(content);
    } catch (error) {
      console.error("Failed to parse JSON response:", content);
      throw new Error("Invalid JSON response from OpenAI");
    }

    // Validate guide structure
    if (!result.title || !Array.isArray(result.steps) || result.steps.length === 0) {
      console.error("Invalid guide structure:", result);
      throw new Error("Generated guide does not match required format");
    }

    // Validate each step
    result.steps.forEach((step, index) => {
      if (!step.title || !step.description || !step.imageDescription) {
        throw new Error(`Step ${index + 1} is missing required fields`);
      }
    });

    // Track analytics if repairRequestId is provided
    if (repairRequestId) {
      // Create a summary of the AI response for analysis
      const stepsSummary = result.steps.map(step => 
        `Step ${step.step}: ${step.title}`
      ).join('. ');
      
      const responseSummary = `${result.title}. Difficulty: ${result.difficulty}. Time: ${result.estimatedTime}. ${stepsSummary}`;
      
      try {
        // Calculate tokens (approximate method - production would use exact counts)
        const promptTokens = systemPrompt.length + productType.length + issue.length;
        const completionTokens = content.length;
        
        // Get repair request details
        const repairRequest = await db.query.repairRequests.findFirst({
          where: eq(repairRequests.id, repairRequestId)
        });
        
        if (repairRequest) {
          // Calculate consistency score
          const consistencyScore = await calculateConsistencyScore(
            productType,
            issue,
            responseSummary
          );
          
          // Check for potential inconsistencies
          const inconsistencyFlags = await detectInconsistencies(
            productType,
            responseSummary
          );
          
          // Track the analytics data
          await trackRepairAnalytics({
            repairRequestId,
            productType,
            issueDescription: issue,
            promptTokens,
            completionTokens,
            responseTime,
            consistencyScore,
            aiResponseSummary: responseSummary,
            inconsistencyFlags
          });
          
          console.log("Tracked repair guide analytics with consistency score:", consistencyScore);
        }
      } catch (analyticsError) {
        // Don't fail the main operation if analytics tracking fails
        console.error("Failed to track analytics:", analyticsError);
      }
    }

    return result;
  } catch (error) {
    console.error("Error in generateRepairGuide:", error);
    throw new Error("Failed to generate repair guide: " + 
      (error instanceof Error ? error.message : String(error))
    );
  }
}

export async function generateRepairDiagnostic(productType: string, issueDescription: string, repairRequestId?: number, audioUrl?: string): Promise<RepairDiagnostic> {
  try {
    console.log("Starting diagnostic generation for:", { productType, issueDescription, hasAudio: !!audioUrl });
    const startTime = Date.now();

    // Try to get from cache first
    const cacheKey = generateCacheKey(productType, issueDescription, audioUrl);
    const cachedResult = diagnosticCache.get(cacheKey);
    
    // If we have a valid cache entry, return it
    if (cachedResult && (Date.now() - cachedResult.timestamp) < CACHE_TTL) {
      console.log("Using cached diagnostic result");
      
      // Even when using cache, track analytics
      if (repairRequestId) {
        try {
          // Don't wait for analytics tracking to complete
          trackDiagnosticAnalytics(
            startTime, 
            productType, 
            issueDescription, 
            repairRequestId, 
            cachedResult.data
          ).catch(error => {
            console.error("Error tracking cached analytics:", error);
          });
        } catch (error) {
          console.error("Failed to track cached analytics:", error);
        }
      }
      
      return cachedResult.data;
    }

    // Generate comprehensive diagnostic analysis
    const systemPrompt = `You are a senior repair diagnostic expert with extensive experience in electronics and appliance troubleshooting.
Analyze reported issues thoroughly to identify ALL potential causes, not just the most obvious ones.

CRITICAL DIAGNOSTIC RULES:
1. For ANY computer freezing/crashing during high-load activities (gaming, rendering):
   - ALWAYS include the Power Supply Unit (PSU) as a potential cause
   - Look for inadequate wattage, failing capacitors, or loose connections
   - Include PSU testing and inspection in your diagnostic steps

2. For ANY RAM-related issues:
   - ALWAYS include memory testing software (MemTest86) in your diagnostic steps
   - ALWAYS include checking XMP/DOCP profiles in BIOS as these can cause instability
   - Suggest running with one stick at a time as a test BEFORE suggesting replacement

3. For USB issues, especially wake-from-sleep:
   - PRIORITIZE software-based causes: USB selective suspend settings, power management
   - ALWAYS include checking BIOS/UEFI USB settings and updating motherboard chipset drivers
   - Only suggest physical USB connection checks AFTER software solutions

4. For PC hardware diagnostics, order your steps from:
   - Software diagnostics & configuration checks FIRST (drivers, settings, BIOS settings)
   - Non-invasive tests SECOND (monitoring tools, external testing)
   - Internal hardware checks LAST (opening case, removing components)

IMPORTANT REQUIREMENTS:
1. Consider multiple systems in your analysis (software, hardware, firmware, power delivery, thermal, mechanical)
2. Be specific, technical, and comprehensive - include driver-related issues, BIOS/firmware problems, and component-level failures
3. Consider non-obvious connections between symptoms (e.g., power issues causing USB problems)
4. Prioritize non-destructive tests and software-based solutions before hardware replacement
5. Include environment factors like power quality, ambient temperature, and usage patterns
6. When listing solutions, progress from simple to complex, from software to hardware

SPECIFIC QUESTIONS GUIDELINES:
1. Create 3-5 precise, targeted questions that would help pinpoint the exact root cause
2. Frame questions to distinguish between similar symptoms with different causes (e.g., "Does the freezing occur only during high GPU usage or during any activity?")
3. Include questions about timing, frequency, and specific conditions when the issue occurs
4. Ask about secondary symptoms that may not seem related but could help differentiate between causes
5. Format questions to be direct and answerable with specific technical details, not just yes/no
6. Include at least one question focused on environmental factors (e.g., "Does the issue correlate with high ambient temperature or after the device has been running for hours?")

EXAMPLES OF EFFECTIVE VS. INEFFECTIVE DIAGNOSTIC QUESTIONS:

GOOD EXAMPLES (use these as models):
- "Does the USB device disconnect issue happen with all USB devices or only specific ones?" (isolates variables)
- "At what specific point during boot does the system freeze - before BIOS, during OS logo, or after desktop appears?" (timing precision)
- "When the system crashes, does it show a blue screen with error code, freeze completely, or restart itself?" (symptom specificity)
- "Have you noticed any correlation between the overheating and specific applications or tasks?" (usage pattern identification)
- "Does the sound distortion happen at all volume levels or only when volume exceeds a certain threshold?" (threshold identification)

POOR EXAMPLES (avoid these patterns):
- "Have you tried restarting the device?" (too generic, assumes no prior troubleshooting)
- "Is the device broken?" (too vague, not actionable)
- "Do you think it's a hardware or software issue?" (puts diagnostic burden on user)
- "Has this happened before?" (lacks specific diagnostic value)
- "Do you want to try replacing the component?" (jumps to solution before diagnosis)

PRODUCT-SPECIFIC CONSIDERATIONS:
1. For computers/laptops:
   - Prioritize questions about specific error messages, timing of issues related to startup/shutdown/sleep
   - Ask about correlation with software updates, driver installations, or BIOS changes
   - Focus on temperature behavior during different activities (idle vs. load)
   - Determine if issues happen with specific hardware components or peripherals
   - Example gap: "Unknown whether the issue occurs immediately at startup or after prolonged use"

2. For smartphones/tablets:
   - Focus on battery behavior, charging patterns, and power consumption
   - Distinguish between app-specific issues vs. system-wide problems
   - Ask whether problems occur in safe mode vs. normal operation
   - Determine correlation with recent updates, app installations, or physical damage
   - Example gap: "Unknown if factory reset has been attempted and if issue persists afterward"

3. For appliances (refrigerators, washers, dishwashers):
   - Emphasize unusual noises, timing of sounds, and their characteristics (grinding, buzzing, clicking)
   - Focus on cycle behavior changes, water flow/drainage issues, or temperature regulation
   - Ask about power-related symptoms (flickering, partial operation, complete failure)
   - Determine age of appliance and maintenance history
   - Example gap: "Unknown if water supply pressure to appliance has been checked"

4. For consumer electronics (TVs, audio equipment, gaming consoles):
   - Concentrate on signal quality, input source behavior, and connection stability
   - Ask about specific content types that cause issues (high resolution, certain media formats)
   - Focus on power-related patterns (standby issues, intermittent shutoffs)
   - Determine if problems occur with all connected devices or specific ones
   - Example gap: "Unknown whether different HDMI cables have been tested"

5. For networking equipment (routers, modems, access points):
   - Ask about specific connection patterns, affected devices, and frequency of issues
   - Focus on configuration changes, firmware updates, or ISP-related changes
   - Determine environmental factors (interference sources, device placement)
   - Example gap: "Unknown if device is overheating during prolonged operation"

Return your analysis in this EXACT JSON format:
{
  "symptomInterpretation": "Detailed symptom analysis including potential relationships between reported issues",
  "possibleCauses": [
    "Specific description of cause 1 with technical details",
    "Specific description of cause 2 with technical details"
  ],
  "informationGaps": [
    "Specific information needed to better diagnose issue 1",
    "Specific information needed to better diagnose issue 2"
  ],
  "diagnosticSteps": [
    "Specific, detailed diagnostic step 1 with expected outcomes",
    "Specific, detailed diagnostic step 2 with expected outcomes"
  ],
  "likelySolutions": [
    "Specific, actionable solution 1 starting with software/settings",
    "Specific, actionable solution 2 for hardware if needed"
  ],
  "safetyWarnings": [
    "Specific safety warning 1 relevant to this specific device/repair",
    "Specific safety warning 2 relevant to this specific device/repair"
  ],
  "specificQuestions": [
    "Precise technical question 1 focused on determining root cause",
    "Precise technical question 2 focused on determining root cause"
  ]
}`;

    // Get diagnostic response through helper function
    const result = await getDiagnosticResponse(productType, issueDescription, systemPrompt, audioUrl);
  
    // Track analytics if repairRequestId is provided
    if (repairRequestId) {
      try {
        await trackDiagnosticAnalytics(
          startTime, 
          productType, 
          issueDescription, 
          repairRequestId, 
          result, 
          JSON.stringify(result), 
          systemPrompt
        );
      } catch (analyticsError) {
        // Don't fail the main operation if analytics tracking fails
        console.error("Failed to track analytics:", analyticsError);
      }
    }

    return result;
  } catch (error) {
    console.error("Error in generateRepairDiagnostic:", error);
    throw new Error("Failed to generate repair diagnostic: " + 
      (error instanceof Error ? error.message : String(error))
    );
  }
}

// Define interface for image analysis results
interface ImageAnalysisResult {
  detected_issue: string;
  confidence: number;
  additional_questions: string[];
  recommendations: string[];
}

export async function getRepairAnswer(input: RepairQuestionInput, repairRequestId?: number): Promise<{ answer: string } | ImageAnalysisResult> {
  try {
    const startTime = Date.now();
    
    // Check if this is an image analysis request for the repair form
    // Support both single image and multiple images
    const hasImage = input.imageUrl || (input.imageUrls && input.imageUrls.length > 0);
    const isImageAnalysis = hasImage && input.question.includes("Analyze this image and identify the issue");
    
    if (isImageAnalysis && input.imageUrls && input.imageUrls.length > 1) {
      console.log(`Processing multiple images (${input.imageUrls.length}) for analysis`);
    }
    
    // Select the appropriate system prompt
    let systemPrompt: string;
    
    if (isImageAnalysis) {
      systemPrompt = `You are an expert AI vision analyst specializing in device and product repair diagnostics. 
Your task is to analyze images of damaged or malfunctioning products and provide detailed insights.

CRITICAL ANALYSIS REQUIREMENTS:
1. Carefully analyze all provided images of the product
2. Consider both visible damage and potential internal issues based on visual cues
3. When multiple images are provided, analyze each one and synthesize your findings
4. Compare what you see in the image(s) with the user's description of the issue
5. Identify any information gaps that require clarification
6. Provide a confidence score for your analysis (0.0-1.0)

PRODUCT-SPECIFIC CONSIDERATIONS:
1. For furniture items (chairs, tables, cabinets):
   - Focus on identifying which specific part is damaged (leg, arm, back, seat, etc.)
   - Look for structural integrity issues, broken joints, or loose fasteners
   - Note any visible cracks, breaks, or deformities in specific components

2. For electronics (computers, phones, TVs):
   - Identify specific damaged components (screen, ports, buttons, case)
   - Note any signs of water damage, physical impact, or internal damage
   - Look for bent pins, broken connectors, or cracked circuit boards

3. For appliances (refrigerator, washer, microwave):
   - Identify specific malfunctioning components or damage areas
   - Note any unusual sounds, leaks, or performance issues mentioned
   - Check for control panel, motor, or power delivery system issues

YOUR RESPONSE MUST BE A VALID JSON OBJECT with these fields:
- detected_issue: A clear, detailed description of what problem you identify in the image
- confidence: A number between 0 and 1 indicating your confidence in this assessment
- additional_questions: An array of 2-3 specific questions to ask the user for better diagnosis
- recommendations: An array of 1-3 preliminary recommendations based on your initial analysis

IMPORTANT FOR QUESTIONS:
- Always ask about SPECIFIC parts or components that appear damaged
- For example, if it's a chair, ask "Which part of the chair is broken - the leg, back, or seat?"
- Ask about the specific symptoms or behaviors related to the product type
- AVOID generic questions like "Have you tried fixing it?" or "When did it happen?"
- Focus questions on gathering technical details about the specific damage area

EXAMPLES OF EFFECTIVE DIAGNOSTIC QUESTIONS FOR IMAGES:
- "Is the clicking sound coming from the upper or lower part of the refrigerator?"
- "Does the screen discoloration appear only when showing certain colors or is it constant?"
- "When the laptop overheats, which specific area gets hottest: keyboard, bottom center, or near the fan vents?"
- "Has the device been exposed to moisture or extreme temperatures before this damage occurred?"
- "When the device is turned on, do you see any indicator lights and what colors/patterns do they show?"

AVOID INEFFECTIVE QUESTIONS LIKE:
- "Is it broken?" (too vague)
- "Have you tried turning it off and on?" (assumes basic troubleshooting wasn't done)
- "Do you want to buy a new one?" (outside diagnostic scope)
- "When did you buy it?" (not relevant to technical diagnosis)
- "Is it under warranty?" (not relevant to technical diagnosis)

IMPORTANT FOR ANALYSIS:
- Be very specific about what you can and cannot determine from the image
- If the image doesn't clearly show the issue, say so and focus on questions to clarify
- Prioritize safety in your recommendations
- Don't make assumptions beyond what's visible in the image and the user's description`;
    } else {
      systemPrompt = `You are a senior repair expert with extensive knowledge of electronics, appliances, and advanced troubleshooting methodologies.

CRITICAL DIAGNOSTIC RULES:
1. For computer instability/crashing questions:
   - ALWAYS discuss PSU issues as a potential cause
   - Recommend stress testing tools to verify power stability
   - Suggest checking PSU cables and connections

2. For RAM/memory-related questions:
   - ALWAYS mention MemTest86 for proper diagnostics
   - ALWAYS discuss BIOS XMP/DOCP profiles as potential instability sources
   - Suggest testing with individual memory modules before replacement

3. For USB issues, especially wake-from-sleep:
   - PRIORITIZE Windows power management settings and USB selective suspend
   - Emphasize updating chipset drivers from the motherboard manufacturer
   - Recommend BIOS/UEFI USB settings check before physical inspection

4. For display/monitor issues:
   - ALWAYS check cable connections and monitor input settings first
   - Suggest testing with different cables/ports before hardware diagnosis
   - Include steps to verify graphics driver versions and settings

5. For storage device problems:
   - PRIORITIZE SMART data checks and disk health analysis
   - Recommend data backup before any physical interventions
   - Include file system verification steps

6. For ALL PC hardware questions:
   - Order suggestions from software→monitoring→external tests→internal hardware
   - Provide detailed instructions including specific menu paths and expected values

When answering questions about repairs:
1. Provide detailed, technically accurate information with specific values, menu paths, and expected outcomes
2. Emphasize DIAGNOSTIC approaches rather than jumping to conclusions about hardware failure
3. Suggest multiple potential solutions in order from simplest/software-based to more complex/hardware-based
4. Include safety warnings specific to the repair situation
5. Highlight when the user should check documentation or seek professional help for dangerous procedures
6. Provide context for WHY a solution works, not just what to do

Format your response as a JSON object with an "answer" field containing your thorough response.
Ensure your answers avoid oversimplified suggestions like "just replace the component" without proper diagnostic confirmation.`;
    }

    const contextPrompt = `Product Type: ${input.productType}${
      input.issueDescription ? `\nReported Issue: ${input.issueDescription}` : ''
    }${
      input.currentStep !== undefined ? `\nCurrent Repair Guide Step: ${input.currentStep + 1}` : ''
    }`;

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt }
    ];
    
    // Add previous conversation context if it exists
    if (input.context && input.context.length > 0) {
      messages.push(...input.context);
    }
    
    // Add the current question as the most recent message
    if (input.imageUrls && input.imageUrls.length > 0) {
      // Handle multiple images
      type ContentItem = 
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } };
      
      const contentArray: ContentItem[] = [
        {
          type: "text",
          text: `${contextPrompt}\n${input.question}${input.imageUrls.length > 1 ? ` (I've provided ${input.imageUrls.length} images for analysis)` : ''}`
        }
      ];
      
      // Add each image to the content array
      input.imageUrls.forEach(imageUrl => {
        contentArray.push({
          type: "image_url",
          image_url: { url: imageUrl }
        });
      });
      
      messages.push({
        role: "user",
        content: contentArray
      } as OpenAI.Chat.Completions.ChatCompletionMessageParam); // Type assertion
    } else if (input.imageUrl) {
      // Handle single image (backwards compatibility)
      type ContentItem = 
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } };
        
      const contentArray: ContentItem[] = [
        {
          type: "text",
          text: `${contextPrompt}\n${input.question}`
        },
        {
          type: "image_url",
          image_url: { url: input.imageUrl }
        }
      ];
      
      messages.push({
        role: "user",
        content: contentArray
      } as OpenAI.Chat.Completions.ChatCompletionMessageParam); // Type assertion
    } else {
      // Text only
      messages.push({
        role: "user",
        content: `${contextPrompt}\nQuestion: ${input.question}`
      });
    }

    // Configure the OpenAI API call
    let response;
    
    if (isImageAnalysis) {
      // For image analysis - using gpt-4o which supports vision capabilities
      response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: messages,
        temperature: 0.2,
        max_tokens: 1000
      });
    } else {
      // For standard Q&A
      response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: messages,
        temperature: 0.3,
        max_tokens: 800
      });
    }

    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    // Process the response based on the request type
    if (isImageAnalysis) {
      try {
        // Sometimes GPT returns with markdown code blocks, so let's clean that up
        const cleanContent = content.replace(/```json\n|\n```/g, '');
        console.log("Attempting to parse JSON from:", cleanContent);
        
        // Parse the JSON response for image analysis
        const result = JSON.parse(cleanContent);
        
        // Ensure we have all required fields
        const validatedResult: ImageAnalysisResult = {
          detected_issue: result.detected_issue || "Unable to determine issue from image",
          confidence: typeof result.confidence === 'number' ? result.confidence : 0.5,
          additional_questions: Array.isArray(result.additional_questions) ? result.additional_questions : [
            "Can you describe the issue in more detail?",
            "When did you first notice this problem?"
          ],
          recommendations: Array.isArray(result.recommendations) ? result.recommendations : []
        };
        
        console.log("Image analysis result:", validatedResult);
        
        // Check if we should also integrate with text description
        if (input.issueDescription && validatedResult.confidence < 0.7) {
          console.log("Enriching analysis with text description:", input.issueDescription);
          // Combine image and text analysis for more accurate questions
          validatedResult.detected_issue = `${validatedResult.detected_issue} (Visual analysis combined with user description: ${input.issueDescription})`;
        }
        
        return validatedResult;
      } catch (error) {
        console.error("Failed to parse image analysis JSON:", content);
        // Return a product-specific fallback object
        const productType = input.productType?.toLowerCase() || '';
        let fallbackQuestions = [];
        
        if (productType.includes('chair') || productType.includes('table') || productType.includes('furniture')) {
          fallbackQuestions = [
            "Which specific part of the furniture is damaged (leg, back, seat, arm)?",
            "Is the damage a break, crack, or just a loose component?",
            "Is the furniture still usable or completely broken?"
          ];
        } else if (productType.includes('computer') || productType.includes('laptop') || productType.includes('phone')) {
          fallbackQuestions = [
            "Which component of your device is showing the problem (screen, keyboard, battery)?", 
            "Are there any error messages or unusual behavior?",
            "Does the problem happen all the time or only in certain situations?"
          ];
        } else if (productType.includes('appliance') || productType.includes('washer') || productType.includes('refrigerator')) {
          fallbackQuestions = [
            "Which part of the appliance is malfunctioning?",
            "Are there any unusual noises, leaks, or error codes?",
            "Did the problem start suddenly or develop gradually?"
          ];
        } else {
          // Generic but still specific questions
          fallbackQuestions = [
            "Which specific part of the " + productType + " is damaged or malfunctioning?",
            "What symptoms or behaviors indicate the problem?",
            "Can you describe the extent of the damage or malfunction?"
          ];
        }
        
        return {
          detected_issue: "Error analyzing image. " + (input.issueDescription || "Please provide more details about the " + productType + "."),
          confidence: 0.3,
          additional_questions: fallbackQuestions,
          recommendations: []
        };
      }
    } else {
      // Standard Q&A response
      let answer: string;
      try {
        const result = JSON.parse(content);
        answer = result.answer || content;
      } catch (error) {
        // If parsing fails, use the raw content
        answer = content;
      }
    
      // Track analytics if repairRequestId is provided
      if (repairRequestId) {
        try {
          // Calculate tokens (approximate method)
          const promptTokens = systemPrompt.length + contextPrompt.length + input.question.length;
          const completionTokens = content.length;
          
          // Calculate consistency score
          const consistencyScore = await calculateConsistencyScore(
            input.productType,
            input.question,
            answer
          );
          
          // Check for potential inconsistencies
          const inconsistencyFlags = await detectInconsistencies(
            input.productType,
            answer
          );
          
          // Track the analytics data
          await trackRepairAnalytics({
            repairRequestId,
            productType: input.productType,
            issueDescription: input.question,
            promptTokens,
            completionTokens,
            responseTime,
            consistencyScore,
            aiResponseSummary: answer,
            inconsistencyFlags
          });
          
          console.log("Tracked Q&A analytics with consistency score:", consistencyScore);
        } catch (analyticsError) {
          // Don't fail the main operation if analytics tracking fails
          console.error("Failed to track Q&A analytics:", analyticsError);
        }
      }

      return { answer };
    }
  } catch (error) {
    console.error("Error getting repair answer:", error);
    throw new Error("Failed to get repair answer: " + 
      (error instanceof Error ? error.message : String(error))
    );
  }
}