import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { fileToBase64 } from "@/lib/cloud-storage";
import { AlertCircle, Check, Loader2 } from "lucide-react";

// Define form schema for repair journey start
const startRepairJourneySchema = z.object({
  deviceType: z.string().min(1, "Device type is required"),
  deviceBrand: z.string().min(1, "Device brand is required"),
  deviceModel: z.string().optional(),
  issueDescription: z.string().min(10, "Please provide a detailed description of the issue"),
  symptoms: z.array(z.string()).optional(),
});

// Define form schema for diagnosis upload
const diagnosisSchema = z.object({
  diagnosticResults: z.object({
    probableCause: z.string().min(1, "Probable cause is required"),
    componentsAffected: z.array(z.string()).min(1, "At least one affected component is required"),
    severityLevel: z.enum(["low", "medium", "high"]),
    diagnosticNotes: z.string().optional(),
  }),
});

// Define form schema for issue confirmation
const issueConfirmationSchema = z.object({
  issueConfirmation: z.object({
    confirmedIssue: z.string().min(1, "Confirmed issue is required"),
    userConfirmed: z.boolean(),
    additionalNotes: z.string().optional(),
  }),
});

// Define form schema for repair guide
const repairGuideSchema = z.object({
  repairGuide: z.object({
    title: z.string().min(1, "Guide title is required"),
    introduction: z.string().min(10, "Introduction should be descriptive"),
    steps: z.array(
      z.object({
        title: z.string().min(1, "Step title is required"),
        description: z.string().min(10, "Step description should be detailed"),
        imageUrl: z.string().optional(),
      })
    ).min(1, "At least one step is required"),
    conclusion: z.string().optional(),
    difficulty: z.enum(["easy", "medium", "hard"]),
    timeRequired: z.string().min(1, "Estimated time is required"),
    toolsRequired: z.array(z.string()).optional(),
  }),
});

// Define form schema for file upload
const fileUploadSchema = z.object({
  file: z.instanceof(File, { message: "Please select a file" }),
  filePurpose: z.enum(["diagnosis", "damage_photo", "repair_step", "completed_repair"]),
  stepName: z.string().optional(),
});

type RepairSession = {
  id: number;
  deviceType: string;
  deviceBrand: string;
  deviceModel?: string;
  issueDescription: string;
  symptoms?: string[];
  status: string;
  createdAt: string;
  files?: any[];
  diagnosticResults?: any;
  issueConfirmation?: any;
  repairGuide?: any;
};

export function RepairJourneyManager() {
  const [activeTab, setActiveTab] = useState("start");
  const [isLoading, setIsLoading] = useState(false);
  const [currentSession, setCurrentSession] = useState<RepairSession | null>(null);
  const [sessions, setSessions] = useState<RepairSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePurpose, setFilePurpose] = useState<string>("diagnosis");
  const [stepName, setStepName] = useState<string>("");
  
  const { toast } = useToast();

  // Load existing repair sessions
  useEffect(() => {
    fetchSessions();
  }, []);
  
  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/repair-journeys');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.sessions) {
          setSessions(data.sessions);
        }
      }
    } catch (error) {
      console.error("Error fetching repair sessions:", error);
    }
  };

  const fetchSessionById = async (sessionId: number) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/repair-journey/${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.session) {
          setCurrentSession(data.session);
          setSelectedSessionId(sessionId);
          
          // Set the active tab based on the session status
          if (data.session.repairGuide) {
            setActiveTab("guide");
          } else if (data.session.issueConfirmation) {
            setActiveTab("confirmation");
          } else if (data.session.diagnosticResults) {
            setActiveTab("diagnosis");
          } else {
            setActiveTab("start");
          }
        }
      }
    } catch (error) {
      console.error("Error fetching repair session:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load repair session"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Form for starting a new repair journey
  const startForm = useForm<z.infer<typeof startRepairJourneySchema>>({
    resolver: zodResolver(startRepairJourneySchema),
    defaultValues: {
      deviceType: "",
      deviceBrand: "",
      deviceModel: "",
      issueDescription: "",
      symptoms: [],
    }
  });

  // Form for uploading diagnostic results
  const diagnosisForm = useForm<z.infer<typeof diagnosisSchema>>({
    resolver: zodResolver(diagnosisSchema),
    defaultValues: {
      diagnosticResults: {
        probableCause: "",
        componentsAffected: [],
        severityLevel: "medium",
        diagnosticNotes: "",
      }
    }
  });

  // Form for issue confirmation
  const confirmationForm = useForm<z.infer<typeof issueConfirmationSchema>>({
    resolver: zodResolver(issueConfirmationSchema),
    defaultValues: {
      issueConfirmation: {
        confirmedIssue: "",
        userConfirmed: false,
        additionalNotes: "",
      }
    }
  });

  // Form for repair guide
  const guideForm = useForm<z.infer<typeof repairGuideSchema>>({
    resolver: zodResolver(repairGuideSchema),
    defaultValues: {
      repairGuide: {
        title: "",
        introduction: "",
        steps: [
          {
            title: "",
            description: "",
            imageUrl: "",
          }
        ],
        conclusion: "",
        difficulty: "medium",
        timeRequired: "",
        toolsRequired: [],
      }
    }
  });

  // Form for file upload
  const fileUploadForm = useForm<z.infer<typeof fileUploadSchema>>({
    resolver: zodResolver(fileUploadSchema),
    defaultValues: {
      filePurpose: "diagnosis",
      stepName: "",
    }
  });

  // Handle starting a new repair journey
  const handleStartRepairJourney = async (values: z.infer<typeof startRepairJourneySchema>) => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/repair-journey/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCurrentSession({
            id: data.sessionId,
            ...values,
            status: 'started',
            createdAt: new Date().toISOString(),
          });
          setSelectedSessionId(data.sessionId);
          toast({
            title: "Success",
            description: "Repair journey started successfully",
          });
          setActiveTab("diagnosis");
          await fetchSessions();
        }
      } else {
        const error = await response.json();
        toast({
          variant: "destructive",
          title: "Error",
          description: error.error || "Failed to start repair journey",
        });
      }
    } catch (error) {
      console.error("Error starting repair journey:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to start repair journey",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle uploading diagnostic results
  const handleUploadDiagnosis = async (values: z.infer<typeof diagnosisSchema>) => {
    if (!currentSession?.id) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No active repair session",
      });
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`/api/repair-journey/${currentSession.id}/diagnosis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCurrentSession({
            ...currentSession,
            diagnosticResults: values.diagnosticResults,
            status: 'diagnosed',
          });
          toast({
            title: "Success",
            description: "Diagnostic results saved successfully",
          });
          setActiveTab("confirmation");
          await fetchSessions();
        }
      } else {
        const error = await response.json();
        toast({
          variant: "destructive",
          title: "Error",
          description: error.error || "Failed to save diagnostic results",
        });
      }
    } catch (error) {
      console.error("Error saving diagnostic results:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save diagnostic results",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle issue confirmation
  const handleIssueConfirmation = async (values: z.infer<typeof issueConfirmationSchema>) => {
    if (!currentSession?.id) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No active repair session",
      });
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`/api/repair-journey/${currentSession.id}/issue-confirmation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCurrentSession({
            ...currentSession,
            issueConfirmation: values.issueConfirmation,
            status: 'confirmed',
          });
          toast({
            title: "Success",
            description: "Issue confirmation saved successfully",
          });
          setActiveTab("guide");
          await fetchSessions();
        }
      } else {
        const error = await response.json();
        toast({
          variant: "destructive",
          title: "Error",
          description: error.error || "Failed to save issue confirmation",
        });
      }
    } catch (error) {
      console.error("Error saving issue confirmation:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save issue confirmation",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle repair guide
  const handleRepairGuide = async (values: z.infer<typeof repairGuideSchema>) => {
    if (!currentSession?.id) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No active repair session",
      });
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`/api/repair-journey/${currentSession.id}/repair-guide`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCurrentSession({
            ...currentSession,
            repairGuide: values.repairGuide,
            status: 'guide_generated',
          });
          toast({
            title: "Success",
            description: "Repair guide saved successfully",
          });
          await fetchSessions();
        }
      } else {
        const error = await response.json();
        toast({
          variant: "destructive",
          title: "Error",
          description: error.error || "Failed to save repair guide",
        });
      }
    } catch (error) {
      console.error("Error saving repair guide:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save repair guide",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFiles(Array.from(event.target.files));
    }
  };

  const uploadSelectedFiles = async () => {
    if (!currentSession?.id || selectedFiles.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No active repair session or files selected",
      });
      return;
    }

    try {
      setUploadingFile(true);
      for (const file of selectedFiles) {
        // Convert file to base64
        const base64Data = await fileToBase64(file);
        
        const response = await fetch(`/api/repair-journey/${currentSession.id}/files`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            file: base64Data,
            contentType: file.type,
            fileName: file.name,
            filePurpose,
            stepName: stepName || undefined,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          toast({
            variant: "destructive",
            title: "Error",
            description: error.error || `Failed to upload file ${file.name}`,
          });
        }
      }
      
      toast({
        title: "Success",
        description: `${selectedFiles.length} file(s) uploaded successfully`,
      });
      
      // Reload the session to get updated files
      await fetchSessionById(currentSession.id);
      setSelectedFiles([]);
    } catch (error) {
      console.error("Error uploading files:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to upload files",
      });
    } finally {
      setUploadingFile(false);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Repair Journey Manager</h1>

      {/* Session selection dropdown */}
      <div className="mb-6">
        <h2 className="text-lg font-medium mb-2">Select Repair Session</h2>
        <div className="flex gap-4">
          <Select
            value={selectedSessionId?.toString() || ""}
            onValueChange={(value) => {
              if (value) {
                fetchSessionById(parseInt(value));
              }
            }}
          >
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Select a repair session" />
            </SelectTrigger>
            <SelectContent>
              {sessions.map((session) => (
                <SelectItem key={session.id} value={session.id.toString()}>
                  {session.deviceBrand} {session.deviceModel} - {session.status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => {
            setCurrentSession(null);
            setSelectedSessionId(null);
            setActiveTab("start");
            startForm.reset();
          }}>
            Start New Journey
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="start">Start Journey</TabsTrigger>
            <TabsTrigger value="diagnosis" disabled={!currentSession?.id}>
              Diagnosis
            </TabsTrigger>
            <TabsTrigger value="confirmation" disabled={!currentSession?.diagnosticResults}>
              Issue Confirmation
            </TabsTrigger>
            <TabsTrigger value="guide" disabled={!currentSession?.issueConfirmation}>
              Repair Guide
            </TabsTrigger>
            <TabsTrigger value="files" disabled={!currentSession?.id}>
              Files
            </TabsTrigger>
          </TabsList>

          <TabsContent value="start">
            <Card>
              <CardHeader>
                <CardTitle>Start New Repair Journey</CardTitle>
                <CardDescription>
                  Enter details about the device and issue to begin the repair process
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...startForm}>
                  <form
                    onSubmit={startForm.handleSubmit(handleStartRepairJourney)}
                    className="space-y-4"
                  >
                    <FormField
                      control={startForm.control}
                      name="deviceType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Device Type*</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Smartphone, Laptop, Tablet" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={startForm.control}
                      name="deviceBrand"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Device Brand*</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Apple, Samsung, Dell" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={startForm.control}
                      name="deviceModel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Device Model</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. iPhone 13, Galaxy S21" {...field} />
                          </FormControl>
                          <FormDescription>
                            Optional but helpful for more accurate diagnosis
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={startForm.control}
                      name="issueDescription"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Issue Description*</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe the issue in detail..."
                              className="min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" disabled={isLoading}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Start Repair Journey
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="diagnosis">
            <Card>
              <CardHeader>
                <CardTitle>Diagnostic Results</CardTitle>
                <CardDescription>
                  Enter diagnostic information for the repair issue
                </CardDescription>
              </CardHeader>
              <CardContent>
                {currentSession && (
                  <Alert className="mb-4">
                    <AlertTitle className="flex items-center">
                      <div className="bg-primary text-primary-foreground rounded-full h-6 w-6 flex items-center justify-center mr-2">
                        <Check className="h-4 w-4" />
                      </div>
                      Device Information
                    </AlertTitle>
                    <AlertDescription className="mt-2">
                      <p><strong>Device:</strong> {currentSession.deviceBrand} {currentSession.deviceModel}</p>
                      <p><strong>Issue:</strong> {currentSession.issueDescription}</p>
                    </AlertDescription>
                  </Alert>
                )}

                <Form {...diagnosisForm}>
                  <form
                    onSubmit={diagnosisForm.handleSubmit(handleUploadDiagnosis)}
                    className="space-y-4"
                  >
                    <FormField
                      control={diagnosisForm.control}
                      name="diagnosticResults.probableCause"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Probable Cause*</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Impact damage, Circuit failure" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={diagnosisForm.control}
                      name="diagnosticResults.componentsAffected"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Components Affected*</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g. Screen, Motherboard, Battery (comma separated)" 
                              onChange={(e) => field.onChange(e.target.value.split(',').map(item => item.trim()))} 
                              value={field.value.join(', ')} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={diagnosisForm.control}
                      name="diagnosticResults.severityLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Severity Level*</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select severity level" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={diagnosisForm.control}
                      name="diagnosticResults.diagnosticNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Diagnostic Notes</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Additional diagnostic details..."
                              className="min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" disabled={isLoading}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Diagnostic Results
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="confirmation">
            <Card>
              <CardHeader>
                <CardTitle>Issue Confirmation</CardTitle>
                <CardDescription>
                  Confirm the diagnosed issue before proceeding to repair
                </CardDescription>
              </CardHeader>
              <CardContent>
                {currentSession?.diagnosticResults && (
                  <Alert className="mb-4">
                    <AlertTitle className="flex items-center">
                      <div className="bg-primary text-primary-foreground rounded-full h-6 w-6 flex items-center justify-center mr-2">
                        <Check className="h-4 w-4" />
                      </div>
                      Diagnostic Results
                    </AlertTitle>
                    <AlertDescription className="mt-2">
                      <p><strong>Probable Cause:</strong> {currentSession.diagnosticResults.probableCause}</p>
                      <p><strong>Components Affected:</strong> {Array.isArray(currentSession.diagnosticResults.componentsAffected) ? 
                        currentSession.diagnosticResults.componentsAffected.join(', ') : 
                        currentSession.diagnosticResults.componentsAffected}</p>
                      <p><strong>Severity:</strong> {currentSession.diagnosticResults.severityLevel}</p>
                    </AlertDescription>
                  </Alert>
                )}

                <Form {...confirmationForm}>
                  <form
                    onSubmit={confirmationForm.handleSubmit(handleIssueConfirmation)}
                    className="space-y-4"
                  >
                    <FormField
                      control={confirmationForm.control}
                      name="issueConfirmation.confirmedIssue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirmed Issue*</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Cracked screen with damaged digitizer" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={confirmationForm.control}
                      name="issueConfirmation.userConfirmed"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="h-4 w-4 mt-1"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>User confirmed the diagnosis</FormLabel>
                            <FormDescription>
                              Check this if the user has verified and agreed with the diagnosis
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={confirmationForm.control}
                      name="issueConfirmation.additionalNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Additional Notes</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Any additional information from the user..."
                              className="min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" disabled={isLoading}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Confirm Issue
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="guide">
            <Card>
              <CardHeader>
                <CardTitle>Repair Guide Generation</CardTitle>
                <CardDescription>
                  Create a step-by-step guide for repairing the issue
                </CardDescription>
              </CardHeader>
              <CardContent>
                {currentSession?.issueConfirmation && (
                  <Alert className="mb-4">
                    <AlertTitle className="flex items-center">
                      <div className="bg-primary text-primary-foreground rounded-full h-6 w-6 flex items-center justify-center mr-2">
                        <Check className="h-4 w-4" />
                      </div>
                      Confirmed Issue
                    </AlertTitle>
                    <AlertDescription className="mt-2">
                      <p><strong>Issue:</strong> {currentSession.issueConfirmation.confirmedIssue}</p>
                      <p><strong>User Confirmed:</strong> {currentSession.issueConfirmation.userConfirmed ? 'Yes' : 'No'}</p>
                      {currentSession.issueConfirmation.additionalNotes && (
                        <p><strong>Notes:</strong> {currentSession.issueConfirmation.additionalNotes}</p>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                <Form {...guideForm}>
                  <form
                    onSubmit={guideForm.handleSubmit(handleRepairGuide)}
                    className="space-y-4"
                  >
                    <FormField
                      control={guideForm.control}
                      name="repairGuide.title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Guide Title*</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. How to Replace a Cracked Screen on Samsung Galaxy S21" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={guideForm.control}
                      name="repairGuide.introduction"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Introduction*</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Provide an introduction to this repair guide..."
                              className="min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div>
                      <h3 className="font-medium mb-2">Repair Steps</h3>
                      {guideForm.watch('repairGuide.steps').map((_, index) => (
                        <div key={index} className="border rounded-md p-4 mb-4 space-y-4">
                          <h4 className="font-medium">Step {index + 1}</h4>
                          <FormField
                            control={guideForm.control}
                            name={`repairGuide.steps.${index}.title`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Step Title*</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g. Power off the device" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={guideForm.control}
                            name={`repairGuide.steps.${index}.description`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Step Description*</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Detailed instructions for this step..."
                                    className="min-h-[80px]"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={guideForm.control}
                            name={`repairGuide.steps.${index}.imageUrl`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Image URL</FormLabel>
                                <FormControl>
                                  <Input placeholder="URL to an image for this step (optional)" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          {index > 0 && (
                            <Button
                              type="button"
                              variant="destructive"
                              onClick={() => {
                                const currentSteps = guideForm.getValues('repairGuide.steps');
                                guideForm.setValue('repairGuide.steps', 
                                  currentSteps.filter((_, i) => i !== index)
                                );
                              }}
                            >
                              Remove Step
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          const currentSteps = guideForm.getValues('repairGuide.steps');
                          guideForm.setValue('repairGuide.steps', [
                            ...currentSteps,
                            { title: '', description: '', imageUrl: '' }
                          ]);
                        }}
                      >
                        Add Step
                      </Button>
                    </div>
                    <FormField
                      control={guideForm.control}
                      name="repairGuide.conclusion"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Conclusion</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Wrapping up the repair process..."
                              className="min-h-[80px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={guideForm.control}
                        name="repairGuide.difficulty"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Difficulty Level*</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select difficulty" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="easy">Easy</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="hard">Hard</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={guideForm.control}
                        name="repairGuide.timeRequired"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Time Required*</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. 30-45 minutes" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={guideForm.control}
                      name="repairGuide.toolsRequired"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tools Required</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g. Screwdriver, Pry tool, Heat gun (comma separated)" 
                              onChange={(e) => field.onChange(e.target.value.split(',').map(item => item.trim()))} 
                              value={field.value ? field.value.join(', ') : ''} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" disabled={isLoading}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Repair Guide
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="files">
            <Card>
              <CardHeader>
                <CardTitle>Repair Journey Files</CardTitle>
                <CardDescription>
                  Upload and manage files related to this repair journey
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!currentSession?.id ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>No Active Session</AlertTitle>
                    <AlertDescription>
                      Please start or select a repair journey first
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    <div className="space-y-4">
                      <h3 className="font-medium">Upload Files</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            File Purpose
                          </label>
                          <Select
                            value={filePurpose}
                            onValueChange={setFilePurpose}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select file purpose" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="diagnosis">Diagnosis</SelectItem>
                              <SelectItem value="damage_photo">Damage Photo</SelectItem>
                              <SelectItem value="repair_step">Repair Step</SelectItem>
                              <SelectItem value="completed_repair">Completed Repair</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Step Name (Optional)
                          </label>
                          <Input
                            placeholder="e.g. Removing back cover, Replacing screen"
                            value={stepName}
                            onChange={(e) => setStepName(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center">
                        <input
                          type="file"
                          multiple
                          onChange={handleFileUpload}
                          className="hidden"
                          id="fileUpload"
                        />
                        <label
                          htmlFor="fileUpload"
                          className="block cursor-pointer text-sm text-gray-700 dark:text-gray-300"
                        >
                          <div className="flex flex-col items-center justify-center">
                            <svg
                              className="mx-auto h-12 w-12 text-gray-400"
                              stroke="currentColor"
                              fill="none"
                              viewBox="0 0 48 48"
                              aria-hidden="true"
                            >
                              <path
                                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                            <p className="mt-1">
                              Click to select files or drag and drop
                            </p>
                          </div>
                        </label>
                      </div>
                      {selectedFiles.length > 0 && (
                        <div className="mt-4">
                          <h4 className="font-medium mb-2">Selected Files ({selectedFiles.length})</h4>
                          <ul className="list-disc pl-5">
                            {selectedFiles.map((file, index) => (
                              <li key={index} className="text-sm">
                                {file.name} ({(file.size / 1024).toFixed(2)} KB)
                              </li>
                            ))}
                          </ul>
                          <Button
                            onClick={uploadSelectedFiles}
                            disabled={uploadingFile}
                            className="mt-4"
                          >
                            {uploadingFile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Upload Files
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Existing Files Section */}
                    {currentSession?.files && currentSession.files.length > 0 ? (
                      <div className="mt-8">
                        <h3 className="font-medium mb-4">Existing Files</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {currentSession.files.map((file, index) => (
                            <div key={index} className="border rounded-md p-4">
                              <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-md mb-2 flex items-center justify-center overflow-hidden">
                                {file.contentType.startsWith('image/') ? (
                                  <img
                                    src={file.fileUrl}
                                    alt={file.fileName}
                                    className="object-contain w-full h-full"
                                  />
                                ) : (
                                  <div className="text-center p-4">
                                    <svg
                                      className="mx-auto h-12 w-12 text-gray-400"
                                      stroke="currentColor"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                      />
                                    </svg>
                                    <p className="mt-2 text-sm font-medium truncate">
                                      {file.fileName}
                                    </p>
                                  </div>
                                )}
                              </div>
                              <div className="text-sm">
                                <p className="font-medium truncate">{file.fileName}</p>
                                <p className="text-gray-500 dark:text-gray-400">
                                  Purpose: {file.filePurpose}
                                </p>
                                {file.stepName && (
                                  <p className="text-gray-500 dark:text-gray-400">
                                    Step: {file.stepName}
                                  </p>
                                )}
                                <a
                                  href={file.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline text-sm mt-2 inline-block"
                                >
                                  View File
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : currentSession?.id && (
                      <div className="mt-8 text-center py-10 border rounded-md">
                        <p className="text-gray-500 dark:text-gray-400">
                          No files uploaded yet
                        </p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}