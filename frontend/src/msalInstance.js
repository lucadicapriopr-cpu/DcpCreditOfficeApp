// src/msalInstance.js
import { PublicClientApplication, EventType, InteractionRequiredAuthError } from "@azure/msal-browser";

function envFirst(...keys) {
  for (const k of keys) {
    const v = import.meta.env[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

const DEFAULT_AZURE_CLIENT_ID = "341318ff-205d-436d-a6ca-d681c255d12b";
const DEFAULT_AZURE_TENANT_ID = "4979676a-f257-42dd-bc50-0601aacf73bf";
export const AZURE_APP_OBJECT_ID = "bb8c0fbd-c936-4d3c-8179-6ad1154c18a5";

const clientId = envFirst("VITE_AZURE_AD_CLIENT_ID") || DEFAULT_AZURE_CLIENT_ID;
const tenantId = envFirst("VITE_AZURE_AD_TENANT_ID") || DEFAULT_AZURE_TENANT_ID;
const redirectUri = envFirst("VITE_AZURE_AD_REDIRECT_URI") || window.location.origin;
const postLogoutRedirectUri = redirectUri;

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

/**
 * Inizializza MSAL, risolve eventuali redirect, imposta l’account attivo.
 * Ritorna l’account attivo (o null).
 */
export async function ensureMsalInitialized() {
  // 1) Completa eventuale redirect OAuth
  await msalInstance.handleRedirectPromise().catch((e) => {
    // Non interrompere l'app se il redirect fallisce (es. user cancella)
    console.warn("[MSAL] handleRedirectPromise error:", e);
  });

  // 2) Se non c’è un account attivo ma esistono account in cache, attiva il primo
  let account = msalInstance.getActiveAccount();
  if (!account) {
    const all = msalInstance.getAllAccounts();
    if (all.length > 0) {
      msalInstance.setActiveAccount(all[0]);
      account = all[0];
    }
  }

  // 3) Se ancora nessun account, tenta SSO silenzioso; altrimenti lascia il login al flusso UI
  if (!account) {
    try {
      const sso = await msalInstance.ssoSilent(loginRequest);
      msalInstance.setActiveAccount(sso.account);
      account = sso.account;
    } catch (e) {
      if (!(e instanceof InteractionRequiredAuthError)) {
        console.warn("[MSAL] ssoSilent non disponibile:", e);
      }
      // Nessun throw: l'app può comunque renderizzare e mostrare un bottone “Accedi”
    }
  }
  return account ?? null;
}

// Listener per aggiornare l’active account dopo un login
msalInstance.addEventCallback((event) => {
  if (event.eventType === EventType.LOGIN_SUCCESS && event.payload?.account) {
    msalInstance.setActiveAccount(event.payload.account);
  }
});
