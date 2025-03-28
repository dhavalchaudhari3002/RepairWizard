import React from 'react';
import * as Sentry from "@sentry/react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

// A custom fallback component that will be displayed when an error occurs
const ErrorFallback: React.FC<{
  error: Error | null;
  resetError: () => void;
}> = ({ error, resetError }) => {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center p-6 text-center">
      <div className="mb-4 rounded-full bg-destructive/10 p-3">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>
      <h2 className="mb-2 text-2xl font-bold">Something went wrong</h2>
      <p className="mb-4 max-w-md text-muted-foreground">
        We've encountered an error and our team has been notified.
      </p>
      {error && (
        <div className="mb-4 max-w-md overflow-auto rounded-md bg-card p-4 text-left text-sm">
          <p className="font-semibold">
            Error: {error.message}
          </p>
        </div>
      )}
      <div className="flex gap-4">
        <Button variant="outline" onClick={() => window.location.href = "/"}>
          Go to homepage
        </Button>
        <Button onClick={resetError}>
          Try again
        </Button>
      </div>
    </div>
  );
};

// A wrapper component that uses Sentry's ErrorBoundary
export const SentryErrorBoundary: React.FC<ErrorBoundaryProps> = ({ children }) => {
  return (
    <Sentry.ErrorBoundary 
      fallback={({ error, resetError }) => (
        <ErrorFallback 
          error={error instanceof Error ? error : new Error(String(error))} 
          resetError={resetError} 
        />
      )}
      beforeCapture={(scope) => {
        scope.setTag("errorLocation", "react_error_boundary");
        scope.setLevel("error");
      }}
    >
      {children}
    </Sentry.ErrorBoundary>
  );
};