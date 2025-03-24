import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export function DebugInfo() {
  const [apiStatus, setApiStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [serverTime, setServerTime] = useState<string | null>(null);
  const [routingResult, setRoutingResult] = useState<string | null>(null);
  const [, navigate] = useLocation();

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

  const testNavigation = () => {
    try {
      navigate('/auth');
      setRoutingResult('Navigation attempted to /auth');
    } catch (error) {
      setRoutingResult(`Navigation error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const testDialogAPI = async () => {
    try {
      const response = await fetch('/api/ping');
      if (response.ok) {
        const data = await response.json();
        alert(`API response: ${JSON.stringify(data)}`);
      } else {
        alert(`API error: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      alert(`Fetch error: ${error instanceof Error ? error.message : String(error)}`);
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
          
          {routingResult && (
            <div className="text-blue-500 text-sm mt-2">
              {routingResult}
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-2 mt-4">
            <Button 
              onClick={checkApiStatus}
              variant="outline"
            >
              Check Connection
            </Button>
            
            <Button 
              onClick={testNavigation}
              variant="outline"
            >
              Test Routing
            </Button>
            
            <Button 
              onClick={testDialogAPI}
              variant="outline"
              className="col-span-2"
            >
              Test Alert API
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}