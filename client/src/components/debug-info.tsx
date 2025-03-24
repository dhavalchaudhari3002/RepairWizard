import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function DebugInfo() {
  const [apiResponse, setApiResponse] = useState<string | null>(null);

  const testAPI = async () => {
    try {
      const response = await fetch('/api/ping');
      if (response.ok) {
        const data = await response.json();
        setApiResponse(`API Response: ${JSON.stringify(data)}`);
      } else {
        setApiResponse(`API Error: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      setApiResponse(`Fetch Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const testDirect = () => {
    window.location.href = '/auth';
  };

  return (
    <Card className="max-w-md mx-auto my-4">
      <CardHeader>
        <CardTitle>Debug Panel</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p>This is a diagnostic panel to help troubleshoot application issues.</p>
          
          {apiResponse && (
            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-md text-sm overflow-auto">
              {apiResponse}
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-2">
            <Button 
              onClick={testAPI}
              variant="outline"
            >
              Test API
            </Button>
            
            <Button 
              onClick={testDirect}
              variant="outline"
            >
              Direct Auth Link
            </Button>
          </div>
          
          <div className="text-xs text-muted-foreground mt-4">
            Application State: <span className="font-mono">Active</span><br />
            Environment: <span className="font-mono">Development</span><br />
            Time: <span className="font-mono">{new Date().toISOString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}