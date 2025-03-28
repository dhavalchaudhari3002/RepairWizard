import * as Sentry from "@sentry/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
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

  // Function to test frontend error reporting
  const testFrontendError = () => {
    try {
      // Clear previous status
      setFrontendStatus("idle");
      setEventId(null);
      setErrorMessage(null);
      
      // Intentionally throw an error to test Sentry
      throw new Error("Test error from frontend for Sentry tracking");
    } catch (error) {
      if (error instanceof Error) {
        // Capture the error and get the event ID
        const id = Sentry.captureException(error);
        setEventId(id);
        setErrorMessage(error.message);
        setFrontendStatus("success");
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
                {import.meta.env.VITE_SENTRY_DSN_FRONTEND ? 
                  "✅ Configured" : 
                  "❌ Not configured - VITE_SENTRY_DSN_FRONTEND is missing"}
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