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

const clientId = envFirst("VITE_AZURE_AD_CLIENT_ID") || "341318ff-205d-436d-a6ca-d681c255d12b";
const tenantId = envFirst("VITE_AZURE_AD_TENANT_ID") || "4979676a-f257-42dd-bc50-0601aacf73bf";
const redirectUri = envFirst("VITE_AZURE_AD_REDIRECT_URI") || window.location.origin;

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
