import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import ErrorBoundary from "./ErrorBoundary.jsx";
import { AuthProvider } from "./auth/AuthContext.jsx";
import { initAdMob } from "./admob.js";
import "./index.css";

// Wire native rewarded ads (no-op on web).
initAdMob();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {/* Last resort: App has a per-app boundary, this catches the shell itself
        (header, dock, auth) so a crash there is still a message, not a blank page. */}
    <ErrorBoundary label="Music ConnectZ">
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
