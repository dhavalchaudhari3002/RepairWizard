import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function DebugInfo() {
  const [apiStatus, setApiStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [serverTime, setServerTime] = useState<string | null>(null);

  useEffect(() => {
    checkApiStatus();
  }, []);

  const checkApiStatus = async () => {
    try {
      setApiStatus('loading');
      const response = await fetch('/api/ping');
      
      if (response.ok) {
        const data = await response.json();
        setApiStatus('success');
        setServerTime(new Date().toISOString());
        setErrorMessage(null);
      } else {
        setApiStatus('error');
        setErrorMessage(`Server responded with status: ${response.status}`);
      }
    } catch (error) {
      setApiStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  };

  return (
    <Card className="max-w-md mx-auto my-4">
      <CardHeader>
        <CardTitle>Application Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span>API Connection:</span>
            <span className={
              apiStatus === 'success' ? 'text-green-500' : 
              apiStatus === 'error' ? 'text-red-500' : 
              'text-yellow-500'
            }>
              {apiStatus === 'success' ? 'Connected' : 
               apiStatus === 'error' ? 'Failed' : 
               'Checking...'}
            </span>
          </div>
          
          {serverTime && (
            <div className="flex justify-between items-center">
              <span>Last Check:</span>
              <span>{serverTime}</span>
            </div>
          )}
          
          {errorMessage && (
            <div className="text-red-500 text-sm mt-2">
              {errorMessage}
            </div>
          )}
          
          <Button 
            onClick={checkApiStatus}
            variant="outline"
            className="w-full mt-4"
          >
            Check Connection
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}