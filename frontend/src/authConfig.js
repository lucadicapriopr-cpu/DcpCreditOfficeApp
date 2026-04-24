// src/authConfig.js
// File legacy mantenuto per compatibilità.
// La config primaria è in `msalInstance.js`.
function envFirst(...keys) {
  for (const k of keys) {
    const v = import.meta.env[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

const clientId = envFirst("VITE_AZURE_AD_CLIENT_ID", "VITE_MSAL_CLIENT_ID");
const tenantId = envFirst("VITE_AZURE_AD_TENANT_ID", "VITE_MSAL_TENANT_ID") || "common";
const redirectUri = envFirst("VITE_AZURE_AD_REDIRECT_URI", "VITE_MSAL_REDIRECT_URI") || window.location.origin;

export const msalConfig = {
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri,
  },
};

export const loginRequest = {
  scopes: ["User.Read", "Calendars.ReadWrite"],
};
