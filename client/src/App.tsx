import { useState, useEffect } from 'react';

// Simplified App to debug the issue
export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    console.log("App component mounted");
    
    // Simulate checking if everything is ready
    const timer = setTimeout(() => {
      console.log("App finished loading check");
      setIsLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading...</h1>
          <p>Please wait while we prepare the application</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-3xl font-bold mb-6">AI Repair Assistant</h1>
      <p className="mb-4">Application is working correctly!</p>
      <div className="p-4 bg-blue-900 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Debug Information</h2>
        <p>This is a simplified version of the app to diagnose loading issues.</p>
      </div>
    </div>
  );
}
