import React, { useState } from "react";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "../msalInstance";

const CalendarTest = () => {
  const { instance, accounts } = useMsal();
  const [events, setEvents] = useState([]);

  const login = async () => {
    try {
      await instance.loginPopup({
        scopes: loginRequest.scopes,
      });
    } catch (err) {
      console.error("Login error:", err);
    }
  };

  const logout = () => {
    instance.logoutPopup();
  };

  const getEvents = async () => {
    if (accounts.length === 0) return;

    let tokenResponse;
    try {
      // Prova a prendere il token in silent
      tokenResponse = await instance.acquireTokenSilent({
        scopes: loginRequest.scopes,
        account: accounts[0],
      });
    } catch (silentError) {
      console.log("Silent token failed, fallback to popup", silentError);
      try {
        tokenResponse = await instance.acquireTokenPopup({
          scopes: loginRequest.scopes,
        });
      } catch (popupError) {
        console.error("Popup token failed", popupError);
        return;
      }
    }

    try {
      const result = await fetch("https://graph.microsoft.com/v1.0/me/events", {
        headers: {
          Authorization: `Bearer ${tokenResponse.accessToken}`,
        },
      });

      const data = await result.json();
      console.log("Events:", data);
      setEvents(data.value || []);
    } catch (fetchError) {
      console.error("Fetch events error:", fetchError);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto bg-white rounded-2xl shadow-lg">
      <h1 className="text-2xl font-bold mb-4">📅 Test Calendario Outlook</h1>

      {accounts.length > 0 ? (
        <div>
          <p className="mb-2">Ciao, {accounts[0].username}</p>
          <div className="flex gap-2 mb-4">
            <button
              onClick={getEvents}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl shadow"
            >
              Carica Eventi
            </button>
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-500 text-white rounded-xl shadow"
            >
              Logout
            </button>
          </div>

          <ul className="space-y-2">
            {events.length > 0 ? (
              events.map((event) => (
                <li
                  key={event.id}
                  className="border p-3 rounded-xl bg-gray-50 shadow-sm"
                >
                  <p className="font-semibold">{event.subject}</p>
                  <p className="text-sm text-gray-600">
                    {new Date(event.start.dateTime).toLocaleString()} →{" "}
                    {new Date(event.end.dateTime).toLocaleString()}
                  </p>
                </li>
              ))
            ) : (
              <p className="text-gray-500">Nessun evento caricato</p>
            )}
          </ul>
        </div>
      ) : (
        <button
          onClick={login}
          className="px-4 py-2 bg-green-600 text-white rounded-xl shadow"
        >
          Login con Microsoft
        </button>
      )}
    </div>
  );
};

export default CalendarTest;
