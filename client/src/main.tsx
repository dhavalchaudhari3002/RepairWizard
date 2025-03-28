import { createRoot } from "react-dom/client";
import { StrictMode, useEffect } from "react";
import App from "./App";
import "./index.css";
// Initialize Sentry for frontend error tracking
import * as Sentry from "@sentry/react";

// Initialize Sentry
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN as string,
  environment: import.meta.env.MODE || 'development',
  // Adjust this value in production
  tracesSampleRate: 1.0,
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