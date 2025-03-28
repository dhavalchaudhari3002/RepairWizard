import React, { useState } from 'react';
import * as Sentry from "@sentry/react";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SentryErrorBoundary } from './error-boundary';

// Component that will intentionally throw an error
const BuggyComponent: React.FC = () => {
  // This will throw when the component mounts
  React.useEffect(() => {
    throw new Error("This error was intentionally thrown from BuggyComponent");
  }, []);
  
  return <div>This text will never be displayed</div>;
};

// Wrap BuggyComponent with error boundary for isolation
const BoundedBuggyComponent: React.FC = () => {
  return (
    <SentryErrorBoundary>
      <BuggyComponent />
    </SentryErrorBoundary>
  );
};

export const SentryDiagnostics: React.FC = () => {
  const [message, setMessage] = useState('');
  const [eventIds, setEventIds] = useState<string[]>([]);
  
  // Test various Sentry features
  const handleCaptureMessage = () => {
    if (!message) return;
    
    const eventId = Sentry.captureMessage(message, {
      level: "info"
    });
    
    setEventIds(prev => [...prev, eventId]);
    setMessage('');
    
    alert(`Message sent to Sentry! Event ID: ${eventId}`);
  };
  
  const handleCaptureException = () => {
    try {
      // Generate a sample error
      throw new Error("This is a test exception for Sentry");
    } catch (error) {
      // Capture the error with Sentry
      const eventId = Sentry.captureException(error);
      setEventIds(prev => [...prev, eventId]);
      
      alert(`Exception sent to Sentry! Event ID: ${eventId}`);
    }
  };
  
  const handleCreateTransaction = () => {
    // Most recent versions of Sentry have removed startTransaction and configureScope
    // from the public API. We'll simulate this functionality by capturing a message
    // with performance context
    
    // Start timing
    const start = performance.now();
    
    // Simulate a transaction with multiple steps
    setTimeout(() => {
      // First step complete
      const step1Time = performance.now() - start;
      
      setTimeout(() => {
        // Second step complete
        const totalTime = performance.now() - start;
        
        // Send the performance data to Sentry as a breadcrumb and message
        Sentry.addBreadcrumb({
          category: 'performance',
          message: `Performance test: Step 1 took ${step1Time.toFixed(2)}ms, total ${totalTime.toFixed(2)}ms`,
          level: 'info'
        });
        
        const eventId = Sentry.captureMessage('Performance test transaction completed', {
          level: 'info',
          tags: {
            performance_test: 'true',
            total_duration_ms: Math.round(totalTime)
          }
        });
        
        setEventIds(prev => [...prev, eventId]);
        alert("Performance data sent to Sentry!");
      }, 500);
    }, 500);
  };
  
  // Simulate global error
  const handleUnhandledError = () => {
    // This will be caught by the window.onerror handler
    setTimeout(() => {
      // @ts-ignore - intentionally causing an error
      nonExistentFunction();
    }, 100);
  };
  
  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Sentry Diagnostics Panel</CardTitle>
        <CardDescription>
          Test various Sentry error reporting and monitoring features
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="errors">
          <TabsList className="mb-4">
            <TabsTrigger value="errors">Error Tests</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="component">Component Error</TabsTrigger>
            <TabsTrigger value="events">Event History</TabsTrigger>
          </TabsList>
          
          <TabsContent value="errors" className="space-y-4">
            <div className="grid gap-4">
              <Button onClick={handleCaptureException}>
                Test Exception Capture
              </Button>
              <Button onClick={handleCreateTransaction}>
                Test Performance Monitoring
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleUnhandledError}
              >
                Simulate Unhandled Error
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="messages">
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="message">Custom Message</Label>
                <Input
                  id="message"
                  placeholder="Enter a message to send to Sentry"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
              <Button 
                onClick={handleCaptureMessage}
                disabled={!message}
              >
                Send Message to Sentry
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="component">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground mb-4">
                This tab contains a component that will throw an error when rendered.
                The error should be caught by the error boundary and reported to Sentry.
              </p>
              <div className="border border-dashed border-destructive p-4 rounded-md">
                <BoundedBuggyComponent />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="events">
            <div className="space-y-4">
              <h3 className="font-medium">Recent Event IDs</h3>
              {eventIds.length > 0 ? (
                <ul className="space-y-2">
                  {eventIds.map((id, index) => (
                    <li key={index} className="text-sm font-mono bg-muted p-2 rounded">
                      {id}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No events captured yet. Use the other tabs to generate events.
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-xs text-muted-foreground">
          All errors are captured and sent to Sentry
        </div>
      </CardFooter>
    </Card>
  );
};