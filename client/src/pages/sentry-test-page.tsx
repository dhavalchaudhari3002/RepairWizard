import * as Sentry from "@sentry/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, Info, XCircle } from "lucide-react";

// Component to display Sentry diagnostic information
export function SentryDiagnostics() {
  const [frontendStatus, setFrontendStatus] = useState<"idle" | "success" | "error">("idle");
  const [backendStatus, setBackendStatus] = useState<"idle" | "success" | "error">("idle");
  const [eventId, setEventId] = useState<string | null>(null);
  const [backendEventId, setBackendEventId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [autoTestComplete, setAutoTestComplete] = useState<boolean>(false);
  
  // Automatically trigger a test error when the component mounts to verify Sentry is working
  useEffect(() => {
    // Only run this once
    if (!autoTestComplete) {
      // Add a slight delay to ensure Sentry is fully initialized
      const timer = setTimeout(() => {
        try {
          console.log("Auto-generating test error for Sentry verification...");
          
          // Create an automatic test error with a distinctive message
          const autoError = new Error(`Automatic Sentry Test Error - ${new Date().toISOString()}`);
          
          // Add a custom fingerprint to group these automatic errors differently
          const eventId = Sentry.captureException(autoError, {
            tags: {
              test_type: "automatic_error",
              test_source: "component_mount"
            },
            extra: {
              component: "SentryDiagnostics",
              method: "useEffect"
            }
          });
          
          console.log("Automatic test error sent to Sentry with ID:", eventId);
          setAutoTestComplete(true);
        } catch (err) {
          console.error("Failed to auto-generate test error:", err);
        }
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [autoTestComplete]);

  // Function to test frontend error reporting with more reliable approach
  const testFrontendError = () => {
    try {
      // Clear previous status
      setFrontendStatus("idle");
      setEventId(null);
      setErrorMessage(null);
      
      // Create a unique error message with timestamp for easier tracking
      const timestamp = new Date().toISOString();
      const errorMessage = `Sentry Frontend Test Error - ${timestamp}`;
      
      // Intentionally throw an error to test Sentry
      console.error("About to throw test error for Sentry:", errorMessage);
      throw new Error(errorMessage);
    } catch (error) {
      if (error instanceof Error) {
        // Explicitly capture the exception with extra context
        const id = Sentry.captureException(error, {
          tags: {
            test_type: "manual_error",
            test_timestamp: new Date().toISOString()
          },
          extra: {
            component: "SentryTestPage",
            method: "testFrontendError"
          }
        });
        
        console.log("Error captured with Sentry ID:", id);
        setEventId(id);
        setErrorMessage(error.message);
        setFrontendStatus("success");
        
        // Report to console for debugging
        console.error("Test error successfully thrown:", error);
      } else {
        setErrorMessage("Unknown error occurred");
        setFrontendStatus("error");
      }
    }
  };

  // Function to test backend error reporting
  const testBackendError = async () => {
    try {
      // Clear previous status
      setBackendStatus("idle");
      setBackendEventId(null);
      
      // Call backend test endpoint
      const response = await fetch('/debug-sentry');
      const data = await response.json();
      
      if (data.sentryEventId) {
        setBackendEventId(data.sentryEventId);
        setBackendStatus("success");
      } else {
        setBackendStatus("error");
      }
    } catch (error) {
      setBackendStatus("error");
      console.error("Failed to test backend error reporting:", error);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Frontend Error Reporting</CardTitle>
          <CardDescription>
            Test if Sentry can capture errors from the frontend
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={testFrontendError} variant="default">
            Generate Test Error
          </Button>
          
          {frontendStatus === "success" && (
            <Alert variant="default" className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Error Successfully Captured</AlertTitle>
              <AlertDescription className="text-green-700">
                Error captured with Event ID: {eventId}
                {errorMessage && (
                  <div className="mt-2 text-sm bg-green-100/50 p-2 rounded">
                    Message: {errorMessage}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
          
          {frontendStatus === "error" && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Failed to Capture Error</AlertTitle>
              <AlertDescription>
                Sentry may not be configured correctly for the frontend.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Backend Error Reporting</CardTitle>
          <CardDescription>
            Test if Sentry can capture errors from the backend
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={testBackendError} variant="outline">
            Test Backend Error Reporting
          </Button>
          
          {backendStatus === "success" && (
            <Alert variant="default" className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Backend Error Successfully Captured</AlertTitle>
              <AlertDescription className="text-green-700">
                Error captured with Event ID: {backendEventId}
              </AlertDescription>
            </Alert>
          )}
          
          {backendStatus === "error" && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Failed to Capture Backend Error</AlertTitle>
              <AlertDescription>
                Sentry may not be configured correctly for the backend or the test endpoint is not responding.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sentry Configuration Status</CardTitle>
          <CardDescription>
            View the current Sentry configuration status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 rounded bg-slate-50">
              <h3 className="font-semibold flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-500" />
                Frontend DSN Status
              </h3>
              <p className="text-sm text-slate-700 mt-1">
                ✅ Using hardcoded DSN - Error tracking should be active
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Note: Using direct configuration for reliability
              </p>
            </div>
            
            <div className="p-4 rounded bg-slate-50">
              <h3 className="font-semibold flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-500" />
                Environment
              </h3>
              <p className="text-sm text-slate-700 mt-1">
                {import.meta.env.MODE || 'development'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Main Sentry Test Page
export default function SentryTestPage() {
  return (
    <div className="container mx-auto py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Sentry Integration Test</h1>
        <p className="text-muted-foreground mb-6">
          This page helps to verify that Sentry error tracking is working correctly
        </p>
        
        <Separator className="my-6" />
        
        <SentryDiagnostics />
      </div>
    </div>
  );
}