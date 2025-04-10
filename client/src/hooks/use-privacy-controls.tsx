import { useState, useEffect } from 'react';

// Storage key for manual privacy opt-out
const MANUAL_OPT_OUT_KEY = 'reusehub_manual_privacy_opt_out';

/**
 * Hook to detect Global Privacy Control (GPC) signal and manual opt-out preferences
 * @returns Object containing GPC status, manual opt-out controls, and other privacy-related information
 */
export function usePrivacyControls() {
  const [isGPCEnabled, setIsGPCEnabled] = useState<boolean | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [manualOptOut, setManualOptOutState] = useState(false);
  
  // Load manual opt-out preference from localStorage
  useEffect(() => {
    try {
      const savedOptOut = localStorage.getItem(MANUAL_OPT_OUT_KEY);
      if (savedOptOut !== null) {
        setManualOptOutState(JSON.parse(savedOptOut));
      }
    } catch (error) {
      console.error('Error loading privacy preferences:', error);
    }
  }, []);

  // Save manual opt-out preference to localStorage
  const setManualOptOut = (value: boolean) => {
    try {
      localStorage.setItem(MANUAL_OPT_OUT_KEY, JSON.stringify(value));
      setManualOptOutState(value);
    } catch (error) {
      console.error('Error saving privacy preferences:', error);
    }
  };
  
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

  // Either GPC is enabled or manual opt-out is enabled
  const isPrivacyProtected = isGPCEnabled === true || manualOptOut === true;

  return {
    isGPCEnabled,
    isLoaded,
    manualOptOut,
    setManualOptOut,
    // Returns true if we can definitively say data sharing is allowed
    // Only if both GPC and manual opt-out are not enabled
    canShareData: isLoaded && !isPrivacyProtected,
  };
}