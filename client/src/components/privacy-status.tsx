import { usePrivacy } from '@/context/privacy-context';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Shield, ShieldCheck, ShieldAlert, ExternalLink, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export function PrivacyStatus() {
  const { isGPCEnabled, isLoaded, setManualOptOut, manualOptOut } = usePrivacy();
  const [showInfo, setShowInfo] = useState(false);
  const [showGlobalControls, setShowGlobalControls] = useState(false);
  
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

  const handleManualOptOut = (checked: boolean) => {
    setManualOptOut(checked);
  };

  const isPrivacyProtected = isGPCEnabled || manualOptOut;

  return (
    <div className="space-y-4">
      <Alert variant={isPrivacyProtected ? "default" : "destructive"} className="mb-4">
        {isPrivacyProtected ? (
          <ShieldCheck className="h-4 w-4 mr-2 text-green-500" />
        ) : (
          <ShieldAlert className="h-4 w-4 mr-2" />
        )}
        <AlertTitle>
          Privacy Protection: {isPrivacyProtected ? "Enabled" : "Not Enabled"}
        </AlertTitle>
        <AlertDescription className="flex justify-between items-start">
          <div>
            {isGPCEnabled 
              ? "Your browser is signaling the Global Privacy Control signal. We respect this signal and will not sell or share your personal information." 
              : manualOptOut
                ? "You've manually opted out of data sharing. Your privacy preferences will be honored globally."
                : "Your browser is not signaling the Global Privacy Control preference. You can enable GPC in privacy-focused browsers or use our manual controls below."}
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="whitespace-nowrap"
              onClick={() => setShowGlobalControls(!showGlobalControls)}
            >
              <Globe className="h-3 w-3 mr-1" />
              {showGlobalControls ? "Hide Controls" : "Manual Controls"}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="whitespace-nowrap"
              onClick={() => setShowInfo(!showInfo)}
            >
              {showInfo ? "Hide Info" : "Learn More"}
            </Button>
          </div>
        </AlertDescription>
      </Alert>
      
      {showGlobalControls && (
        <Card>
          <CardHeader>
            <CardTitle>Global Privacy Controls</CardTitle>
            <CardDescription>
              Manual privacy settings that apply worldwide, regardless of your browser's GPC signal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Switch 
                id="manual-opt-out" 
                checked={manualOptOut} 
                onCheckedChange={handleManualOptOut}
              />
              <Label htmlFor="manual-opt-out">Manually opt out of all data sharing and selling</Label>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              This setting will be saved in your browser and applies to all your interactions with our services worldwide.
            </p>
          </CardContent>
        </Card>
      )}
      
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
            
            <h3 className="font-medium mt-2">International Protection</h3>
            <p>Our privacy controls work globally. If you enable either GPC signals or manual opt-out:</p>
            <ul className="list-disc pl-5 mt-1">
              <li>Your data will not be sold or shared in any country</li>
              <li>Your preferences are respected globally, not just in jurisdictions with privacy laws</li>
              <li>You maintain control over your privacy regardless of your location</li>
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