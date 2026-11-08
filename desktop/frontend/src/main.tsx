import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App";
import "./index.css";

// Disable manual selection copying across the interface:
// text can only be copied using dedicated Copy buttons.
document.addEventListener("copy", (event) => {
  const target = event.target as HTMLElement | null;
  if (!target?.closest("input, textarea")) {
    event.preventDefault();
  }
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
