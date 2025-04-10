import React, { createContext, useContext, ReactNode } from 'react';
import { usePrivacyControls } from '@/hooks/use-privacy-controls';

// Define the context type
type PrivacyContextType = {
  isGPCEnabled: boolean | null;
  isLoaded: boolean;
  canShareData: boolean;
};

// Create the context with default values
const PrivacyContext = createContext<PrivacyContextType>({
  isGPCEnabled: null,
  isLoaded: false,
  canShareData: false,
});

// Export the provider component
export function PrivacyProvider({ children }: { children: ReactNode }) {
  // Use our custom hook to get privacy control information
  const privacyControls = usePrivacyControls();
  
  return (
    <PrivacyContext.Provider value={privacyControls}>
      {children}
    </PrivacyContext.Provider>
  );
}

// Export a custom hook to easily use the privacy context
export function usePrivacy() {
  return useContext(PrivacyContext);
}