import { createContext, ReactNode, useContext } from 'react';
import { usePrivacyControls } from '@/hooks/use-privacy-controls';

type PrivacyContextType = {
  isGPCEnabled: boolean | null;
  isLoaded: boolean;
  canShareData: boolean;
  manualOptOut: boolean;
  setManualOptOut: (value: boolean) => void;
};

// Create the context with default values
const PrivacyContext = createContext<PrivacyContextType>({
  isGPCEnabled: null,
  isLoaded: false,
  canShareData: false,
  manualOptOut: false,
  setManualOptOut: () => {},
});

/**
 * Provider component that wraps the application to provide privacy controls state
 */
export function PrivacyProvider({ children }: { children: ReactNode }) {
  // Use our custom hook to detect the GPC signal
  const privacyControls = usePrivacyControls();

  // Only for development/debugging
  if (process.env.NODE_ENV === 'development') {
    console.log('GPC status:', privacyControls.isGPCEnabled);
  }

  return (
    <PrivacyContext.Provider value={privacyControls}>
      {children}
    </PrivacyContext.Provider>
  );
}

/**
 * Hook to easily access privacy context values throughout the application
 */
export function usePrivacy() {
  const context = useContext(PrivacyContext);
  
  if (context === undefined) {
    throw new Error('usePrivacy must be used within a PrivacyProvider');
  }
  
  return context;
}