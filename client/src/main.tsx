// Initialize Sentry for frontend error tracking - must be imported first
import * as Sentry from "@sentry/react";

// Import React and other dependencies after Sentry is initialized
import { createRoot } from "react-dom/client";
import { StrictMode } from "react";
import App from "./App";
import "./index.css";

// Temporarily disable Sentry to troubleshoot loading issues
console.log("Temporarily disabling Sentry for troubleshooting");

Sentry.init({
  // Disabled for troubleshooting
  dsn: "", // Empty DSN disables Sentry
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

// Add error handler for uncaught errors
window.addEventListener('error', (event) => {
  console.error('Global error caught:', event.error);
});

try {
  console.log('Attempting to render the application...');
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
  console.log('Application rendering initiated successfully');
} catch (error) {
  console.error('Error rendering application:', error);
  document.body.innerHTML = '<div style="padding: 20px; text-align: center;"><h1>Application Error</h1><p>There was a problem loading the application. Please try again later.</p></div>';
}