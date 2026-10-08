// BodieZ on its own. Same code, same API, same accounts as Music ConnectZ —
// this is a second front door onto BodieZ.jsx, not a second BodieZ. Anything a
// member logs here is there too, because it is the same rows.
//
// HashRouter on purpose: this build is served as plain static files, and a
// path router needs the host to answer /login with index.html — which Vercel
// only does from a vercel.json at the repo root, and that one is the main
// site's. A hash needs no server cooperation anywhere.
import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import ErrorBoundary from "../../src/ErrorBoundary.jsx";
import { AuthProvider } from "../../src/auth/AuthContext.jsx";
import "../../src/index.css";
import Shell from "./Shell.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary label="BodieZ">
      <HashRouter>
        <AuthProvider>
          <Shell />
        </AuthProvider>
      </HashRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
