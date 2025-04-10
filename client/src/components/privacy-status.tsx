import { usePrivacy } from '@/context/privacy-context';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Shield, ShieldCheck, ShieldAlert, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export function PrivacyStatus() {
  const { isGPCEnabled, isLoaded } = usePrivacy();
  const [showInfo, setShowInfo] = useState(false);
  
  if (!isLoaded) {
    return (
      <Alert className="mb-4">
        <Shield className="h-4 w-4 mr-2" />
        <AlertTitle>Checking privacy settings...</AlertTitle>
        <AlertDescription>
          We're detecting your privacy preferences.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <Alert variant={isGPCEnabled ? "default" : "destructive"} className="mb-4">
        {isGPCEnabled ? (
          <ShieldCheck className="h-4 w-4 mr-2 text-green-500" />
        ) : (
          <ShieldAlert className="h-4 w-4 mr-2" />
        )}
        <AlertTitle>
          Global Privacy Control (GPC): {isGPCEnabled ? "Enabled" : "Not Enabled"}
        </AlertTitle>
        <AlertDescription className="flex justify-between items-start">
          <div>
            {isGPCEnabled 
              ? "Your browser is signaling the Global Privacy Control signal. We respect this signal and will not sell or share your personal information." 
              : "Your browser is not signaling the Global Privacy Control preference. You can enable GPC in privacy-focused browsers or extensions."}
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="ml-2 whitespace-nowrap"
            onClick={() => setShowInfo(!showInfo)}
          >
            {showInfo ? "Hide Info" : "Learn More"}
          </Button>
        </AlertDescription>
      </Alert>
      
      {showInfo && (
        <Alert>
          <div className="space-y-2">
            <h3 className="font-medium">What is Global Privacy Control?</h3>
            <p>Global Privacy Control (GPC) is a privacy signal that lets you exercise your privacy rights with a single setting in your browser.</p>
            
            <h3 className="font-medium mt-2">How to enable GPC</h3>
            <p>You can enable GPC through:</p>
            <ul className="list-disc pl-5 mt-1">
              <li>Privacy-focused browsers like Brave or Firefox</li>
              <li>Browser extensions like Privacy Badger or DuckDuckGo Privacy Essentials</li>
              <li>Operating system settings (on some platforms)</li>
            </ul>
            
            <div className="mt-3">
              <a 
                href="https://globalprivacycontrol.org/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary flex items-center hover:underline"
              >
                Visit Global Privacy Control website <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            </div>
          </div>
        </Alert>
      )}
    </div>
  );
}