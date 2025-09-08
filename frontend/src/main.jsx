// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

import { MsalProvider } from "@azure/msal-react";
import { msalInstance } from "./msalInstance";
import { BrowserRouter } from "react-router-dom";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <MsalProvider instance={msalInstance}>
      <BrowserRouter basename={import.meta.env.BASE_URL || "/"}>
        <App />
      </BrowserRouter>
    </MsalProvider>
  </React.StrictMode>
);
