// src/msalInstance.js
import { PublicClientApplication, EventType, InteractionRequiredAuthError } from "@azure/msal-browser";

// Usa variabili Vite (imposta nel tuo .env.local)
const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_AD_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_AD_TENANT_ID}`,
    redirectUri: import.meta.env.VITE_AZURE_AD_REDIRECT_URI || window.location.origin,
    postLogoutRedirectUri: import.meta.env.VITE_AZURE_AD_POST_LOGOUT_REDIRECT_URI || window.location.origin,
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
