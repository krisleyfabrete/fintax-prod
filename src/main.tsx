import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

window.addEventListener("error", (event) => {
  const msg = String(event.message ?? "");
  const src = String(event.filename ?? "");
  if (src.includes("reportAllChanges") || msg.includes("startTime")) {
    event.preventDefault();
    event.stopPropagation();
  }
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason instanceof Error ? event.reason.message : String(event.reason ?? "");
  if (reason.includes("reportAllChanges") || reason.includes("startTime")) {
    event.preventDefault();
  }
});

createRoot(document.getElementById("root")!).render(<App />);
