import { ensureMsalInitialized, loginRequest, msalInstance } from "../msalInstance";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";
const DEFAULT_TIMEZONE = "Europe/Rome";

function getGraphErrorMessage(status, bodyText) {
  if (!bodyText) return `Microsoft Graph error (${status}).`;
  try {
    const parsed = JSON.parse(bodyText);
    const msg = parsed?.error?.message || parsed?.message;
    if (msg) return `${msg} (HTTP ${status})`;
  } catch {
    // ignora parsing, usa testo grezzo
  }
  return `${bodyText} (HTTP ${status})`;
}

export async function getAccessToken() {
  try {
    await ensureMsalInitialized();
    let account = msalInstance.getActiveAccount();

    if (!account) {
      const loginResp = await msalInstance.loginPopup(loginRequest);
      account = loginResp?.account || null;
      if (account) {
        msalInstance.setActiveAccount(account);
      }
    }

    if (!account) {
      throw new Error("Nessun account Microsoft disponibile. Effettua il login.");
    }

    const tokenResp =
      (await msalInstance.acquireTokenSilent({ scopes: loginRequest.scopes, account }).catch(() => null)) ||
      (await msalInstance.acquireTokenPopup({ scopes: loginRequest.scopes, account }));

    if (!tokenResp?.accessToken) {
      throw new Error("Token Microsoft non disponibile.");
    }

    return tokenResp.accessToken;
  } catch (error) {
    throw new Error(`Accesso Microsoft non riuscito: ${error?.message || String(error)}`);
  }
}

export async function graphFetch(path, options = {}) {
  try {
    const token = await getAccessToken();
    const url = `${GRAPH_BASE}${path.startsWith("/") ? path : `/${path}`}`;

    const headers = new Headers(options.headers || {});
    if (!headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
    if (!headers.has("Prefer")) headers.set("Prefer", `outlook.timezone="${DEFAULT_TIMEZONE}"`);

    const hasBody = options.body !== undefined && options.body !== null;
    if (hasBody && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const txt = await response.text();
      throw new Error(getGraphErrorMessage(response.status, txt));
    }

    if (response.status === 204) return null;

    const text = await response.text();
    if (!text) return null;

    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  } catch (error) {
    throw new Error(`Richiesta Graph fallita: ${error?.message || String(error)}`);
  }
}

export async function getMe() {
  return graphFetch("/me", { method: "GET" });
}

export async function getCalendarView(startDateTime, endDateTime) {
  const params = new URLSearchParams({
    startDateTime,
    endDateTime,
    $orderby: "start/dateTime",
  });
  const data = await graphFetch(`/me/calendarView?${params.toString()}`, { method: "GET" });
  return data?.value || [];
}

export async function createEvent(payload) {
  return graphFetch("/me/events", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateEvent(eventId, payload) {
  if (!eventId) throw new Error("eventId mancante per aggiornare l'evento.");
  return graphFetch(`/me/events/${encodeURIComponent(eventId)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteEvent(eventId) {
  if (!eventId) throw new Error("eventId mancante per eliminare l'evento.");
  await graphFetch(`/me/events/${encodeURIComponent(eventId)}`, {
    method: "DELETE",
  });
  return true;
}
