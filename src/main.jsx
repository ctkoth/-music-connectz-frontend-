import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import ErrorBoundary from "./ErrorBoundary.jsx";
import { AuthProvider } from "./auth/AuthContext.jsx";
import { initAdMob } from "./admob.js";
import { listenForAppReturn } from "./externalAuth.js";
import { startAutoMemo } from "./autoMemo.js";
import { startAutoTranslate } from "./autoTranslate.js";
import { apply as applyGlow, load as loadGlow, PALETTE as GLOW_PALETTE } from "./glow.js";
import "./index.css";

// Wire native rewarded ads (no-op on web).
initAdMob();
// A Facebook/Spotify login run in a Chrome tab comes back as a deep link.
listenForAppReturn();
startAutoMemo();
startAutoTranslate();
// The saved glow shows at once; GlowColor re-checks it against the plan once the limits arrive.
applyGlow(GLOW_PALETTE.find((c) => c.key === loadGlow()) || null);

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
