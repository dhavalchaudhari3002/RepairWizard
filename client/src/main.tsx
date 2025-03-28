// Initialize Sentry for frontend error tracking - must be imported first
import * as Sentry from "@sentry/react";

// Import React and other dependencies after Sentry is initialized
import { createRoot } from "react-dom/client";
import { StrictMode } from "react";
import App from "./App";
import "./index.css";

// Initialize Sentry using a combination of environment variables and direct values
// Using the DSN from the environment (via Replit Secrets)
const SENTRY_DSN = "https://3be2de40b2f980009217bd7b2891cfc0@o4509052669526016.ingest.us.sentry.io/4509052740763648";

Sentry.init({
  // Use the direct DSN value which comes from Replit Secrets
  dsn: SENTRY_DSN,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  // Add a release identifier to enable session tracking and better error grouping
  release: 'repair-ai-assistant@1.0.0',
  environment: 'development',
  // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring
  tracesSampleRate: 1.0,
  // Enable session replay for better error diagnosis
  replaysSessionSampleRate: 0.1, // Sample 10% of sessions
  replaysOnErrorSampleRate: 1.0, // Sample 100% of sessions with errors
  // Set tracePropagationTargets to control which URLs should be tracked
  tracePropagationTargets: ["localhost", /^https:\/\//],
  // Debug mode to help with troubleshooting
  debug: true,
});

// Force dark mode when the app starts
if (localStorage.getItem("theme") !== "dark") {
  localStorage.setItem("theme", "dark");
  document.documentElement.classList.add("dark");
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find the root element");

// Create a fallback component for when errors occur
const ErrorFallback = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background p-4">
      <div className="max-w-md w-full bg-card rounded-lg shadow-lg p-6 text-center">
        <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
        <p className="mb-4 text-muted-foreground">
          We've been notified about this issue and are working to fix it.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
        >
          Refresh the page
        </button>
      </div>
    </div>
  );
};

createRoot(rootElement).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>
);