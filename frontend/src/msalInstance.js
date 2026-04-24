// src/msalInstance.js
import { PublicClientApplication, EventType, InteractionRequiredAuthError } from "@azure/msal-browser";

function envFirst(...keys) {
  for (const k of keys) {
    const v = import.meta.env[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

// Compatibilità: supporta sia VITE_AZURE_AD_* che VITE_MSAL_*.
const clientId = envFirst("VITE_AZURE_AD_CLIENT_ID", "VITE_MSAL_CLIENT_ID");
const tenantId = envFirst("VITE_AZURE_AD_TENANT_ID", "VITE_MSAL_TENANT_ID") || "common";
const redirectUri = envFirst("VITE_AZURE_AD_REDIRECT_URI", "VITE_MSAL_REDIRECT_URI") || window.location.origin;
const postLogoutRedirectUri =
  envFirst("VITE_AZURE_AD_POST_LOGOUT_REDIRECT_URI", "VITE_MSAL_POST_LOGOUT_REDIRECT_URI") || window.location.origin;

if (!clientId) {
  console.warn(
    "[MSAL] Missing client id. Set VITE_AZURE_AD_CLIENT_ID (or VITE_MSAL_CLIENT_ID) in your frontend env file."
  );
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
    "User.Read",
    "Calendars.ReadWrite", // per Outlook
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
