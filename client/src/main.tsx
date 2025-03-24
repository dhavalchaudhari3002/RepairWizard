import { createRoot } from "react-dom/client";
import { StrictMode, useEffect } from "react";
import App from "./App";
import "./index.css";

// Force dark mode when the app starts
if (localStorage.getItem("theme") !== "dark") {
  localStorage.setItem("theme", "dark");
  document.documentElement.classList.add("dark");
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find the root element");

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);