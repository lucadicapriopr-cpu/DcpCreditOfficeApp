// src/outlookCalendar.js
import { msalInstance } from "./msalInstance";
import { loginRequest } from "./authConfig";

const GRAPH_ENDPOINT = "https://graph.microsoft.com/v1.0/me/events";

async function getAccessToken() {
  const accounts = msalInstance.getAllAccounts();
  if (accounts.length === 0) {
    await msalInstance.loginPopup(loginRequest);
  }

  const request = {
    ...loginRequest,
    account: msalInstance.getAllAccounts()[0],
  };

  const response = await msalInstance.acquireTokenSilent(request).catch(async () => {
    return await msalInstance.acquireTokenPopup(request);
  });

  return response.accessToken;
}

// 🔹 Crea un evento
export async function createEvent(event) {
  const token = await getAccessToken();

  const response = await fetch(GRAPH_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(event),
  });

  return await response.json();
}

// 🔹 Aggiorna un evento
export async function updateEvent(eventId, updates) {
  const token = await getAccessToken();

  const response = await fetch(`${GRAPH_ENDPOINT}/${eventId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updates),
  });

  return await response.json();
}

// 🔹 Elimina un evento
export async function deleteEvent(eventId) {
  const token = await getAccessToken();

  const response = await fetch(`${GRAPH_ENDPOINT}/${eventId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.status === 204; // 204 = eliminato con successo
}
