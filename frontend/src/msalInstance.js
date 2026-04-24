// src/msalInstance.js
import {
  PublicClientApplication,
  EventType,
  InteractionRequiredAuthError,
} from "@azure/msal-browser";

function envFirst(...keys) {
  for (const k of keys) {
    const v = import.meta.env[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

const clientId = envFirst("VITE_AZURE_AD_CLIENT_ID", "VITE_MSAL_CLIENT_ID");
const tenantId = envFirst("VITE_AZURE_AD_TENANT_ID", "VITE_MSAL_TENANT_ID");

const redirectUri =
  envFirst("VITE_AZURE_AD_REDIRECT_URI", "VITE_MSAL_REDIRECT_URI") ||
  window.location.origin;

const postLogoutRedirectUri =
  envFirst("VITE_AZURE_AD_POST_LOGOUT_REDIRECT_URI", "VITE_MSAL_POST_LOGOUT_REDIRECT_URI") ||
  window.location.origin;

if (!clientId) {
  console.warn("[MSAL] Missing client id. Set VITE_AZURE_AD_CLIENT_ID in frontend env.");
}

if (!tenantId) {
  console.warn("[MSAL] Missing tenant id. Set VITE_AZURE_AD_TENANT_ID in frontend env.");
}

const msalConfig = {
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri,
    postLogoutRedirectUri,
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: false,
  },
};

export const loginRequest = {
  scopes: [
    "openid",
    "profile",
    "email",
    "offline_access",
    "User.Read",
    "Calendars.ReadWrite",
    "Contacts.Read",
    "Contacts.ReadWrite",
  ],
};

export const msalInstance = new PublicClientApplication(msalConfig);

let msalInitialized = false;

export async function ensureMsalInitialized() {
  if (!msalInitialized) {
    await msalInstance.initialize();
    msalInitialized = true;
  }

  await msalInstance.handleRedirectPromise().catch((e) => {
    console.warn("[MSAL] handleRedirectPromise error:", e);
  });

  let account = msalInstance.getActiveAccount();

  if (!account) {
    const allAccounts = msalInstance.getAllAccounts();

    if (allAccounts.length > 0) {
      account = allAccounts[0];
      msalInstance.setActiveAccount(account);
    }
  }

  if (!account) {
    try {
      const sso = await msalInstance.ssoSilent(loginRequest);

      if (sso?.account) {
        account = sso.account;
        msalInstance.setActiveAccount(account);
      }
    } catch (e) {
      if (!(e instanceof InteractionRequiredAuthError)) {
        console.warn("[MSAL] ssoSilent non disponibile:", e);
      }
    }
  }

  return account ?? null;
}

msalInstance.addEventCallback((event) => {
  if (event.eventType === EventType.LOGIN_SUCCESS && event.payload?.account) {
    msalInstance.setActiveAccount(event.payload.account);
  }
});