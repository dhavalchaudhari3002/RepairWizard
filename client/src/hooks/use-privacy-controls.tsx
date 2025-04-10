import { useState, useEffect } from 'react';

/**
 * Hook to detect Global Privacy Control (GPC) signal
 * @returns Object containing GPC status and other privacy-related information
 */
export function usePrivacyControls() {
  const [isGPCEnabled, setIsGPCEnabled] = useState<boolean | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  
  useEffect(() => {
    const detectGPC = () => {
      try {
        // Check if the navigator object has the global privacy control property
        // This is implemented differently across browsers
        
        // Modern GPC implementation via Navigator.globalPrivacyControl
        if ('globalPrivacyControl' in navigator) {
          // @ts-ignore - TypeScript doesn't know about this property yet
          setIsGPCEnabled(navigator.globalPrivacyControl);
          setIsLoaded(true);
          return;
        }
        
        // For browsers that implement it in NavigatorDoNotTrack
        if (navigator.doNotTrack === '1' || 
            // @ts-ignore - Non-standard property
            navigator.doNotTrack === 'yes' ||
            // @ts-ignore - Non-standard property
            navigator.msDoNotTrack === '1' ||
            // @ts-ignore - Some browsers use this
            window.doNotTrack === '1') {
          // While DNT is not exactly GPC, many privacy-focused browsers
          // that support GPC also enable DNT, so we can use it as a fallback
          setIsGPCEnabled(true);
          setIsLoaded(true);
          return;
        }
        
        // Check if GPC is in the request headers (server-side detection)
        // The client can't directly check headers, but we could make an API call
        // to the server to verify if needed

        // No GPC detected
        setIsGPCEnabled(false);
        setIsLoaded(true);
      } catch (error) {
        console.error('Error detecting GPC:', error);
        setIsGPCEnabled(false);
        setIsLoaded(true);
      }
    };

    detectGPC();
  }, []);

  return {
    isGPCEnabled,
    isLoaded,
    // Returns true if we can definitively say data sharing is allowed
    // based on GPC signal not being enabled
    canShareData: isLoaded && isGPCEnabled === false,
  };
}