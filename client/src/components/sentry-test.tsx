import React from 'react';
import { Button } from "@/components/ui/button";
import * as Sentry from "@sentry/react";

export const SentryTestButton: React.FC = () => {
  // Function to deliberately trigger an error for Sentry testing
  const handleTestError = () => {
    try {
      // Throw a test error
      throw new Error('This is a test error for Sentry in the frontend');
    } catch (error) {
      // Capture the error with Sentry
      Sentry.captureException(error);
      // Show a user-friendly message
      alert('Test error sent to Sentry! Check your Sentry dashboard.');
    }
  };

  return (
    <div className="mt-4 p-4 border border-dashed border-destructive rounded-md flex flex-col items-center">
      <h3 className="font-medium mb-2">Sentry Error Tracking Test</h3>
      <p className="text-sm text-muted-foreground mb-3 text-center">
        Click the button below to generate a test error for Sentry tracking
      </p>
      <Button 
        variant="destructive" 
        onClick={handleTestError}
        className="px-4"
      >
        Test Sentry Error Tracking
      </Button>
    </div>
  );
};