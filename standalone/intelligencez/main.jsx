// IntelligenceZ on its own. Same code, same API, same accounts as Music
// ConnectZ — a second front door onto the IntelligenceZ screens, not a second
// writer. A piece made here is in the member's recent pieces there, because it
// is the same rows.
//
// HashRouter for the reason standalone/bodiez/main.jsx gives: this is served as
// static files and a path router would need the host to answer /login itself.
import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import ErrorBoundary from "../../src/ErrorBoundary.jsx";
import { AuthProvider } from "../../src/auth/AuthContext.jsx";
import "../../src/index.css";
import "../bodiez/a11y.css";   // scoped to .sa; the rules are not BodieZ-specific
import Shell from "./Shell.jsx";
import UpdateNotice from "../../src/components/UpdateNotice.jsx";

document.documentElement.classList.add("sa");

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary label="IntelligenceZ">
      <HashRouter>
        <AuthProvider>
          <UpdateNotice />
          <Shell />
        </AuthProvider>
      </HashRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
