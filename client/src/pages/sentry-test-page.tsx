import React from 'react';
import { SentryDiagnostics } from '@/components/sentry-diagnostics';
import { SentryErrorBoundary } from '@/components/error-boundary';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import { AlertCircle } from 'lucide-react';

export default function SentryTestPage() {
  const [, navigate] = useLocation();
  
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container max-w-4xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Sentry Integration Test</h1>
            <p className="text-muted-foreground">
              This page contains tools to test Sentry error tracking and monitoring
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/')}>
            Back to Home
          </Button>
        </div>
        
        <div className="bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-8 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-yellow-800 dark:text-yellow-300">Testing Environment</h3>
            <p className="text-sm text-yellow-700 dark:text-yellow-400">
              This page intentionally generates errors to test Sentry integration. 
              All errors are captured and sent to your Sentry project.
            </p>
          </div>
        </div>
        
        <div className="mb-8">
          <div className="grid gap-8">
            <section>
              <h2 className="text-xl font-semibold mb-4">Backend Test</h2>
              <div className="bg-card rounded-lg p-4">
                <p className="mb-4 text-sm text-muted-foreground">
                  Test the backend Sentry integration by triggering a test error from the server.
                </p>
                <Button
                  variant="default"
                  onClick={async () => {
                    try {
                      const response = await fetch('/debug-sentry');
                      const data = await response.json();
                      alert(`Backend error captured! Event ID: ${data.sentryEventId}`);
                    } catch (error) {
                      alert('Failed to test backend error tracking');
                      console.error(error);
                    }
                  }}
                >
                  Test Backend Error Tracking
                </Button>
              </div>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-4">Frontend Tests</h2>
              <SentryErrorBoundary>
                <SentryDiagnostics />
              </SentryErrorBoundary>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}