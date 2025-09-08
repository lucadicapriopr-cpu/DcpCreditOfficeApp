// frontend/src/components/OutlookCalendarWidget.jsx
import React, { useEffect, useState } from "react";

export default function OutlookCalendarWidget({ events = [] }) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Qui in futuro puoi agganciare la Graph API
    // Per ora simuliamo caricamento
    setLoading(true);
    setTimeout(() => setLoading(false), 500);
  }, []);

  if (loading) {
    return <div className="p-4">Caricamento calendario...</div>;
  }

  return (
    <div className="p-4 border rounded-lg bg-gray-50 shadow-sm">
      <h2 className="text-lg font-bold mb-2">Calendario Outlook</h2>
      {events.length === 0 ? (
        <p className="text-sm text-gray-500">Nessun evento disponibile</p>
      ) : (
        <ul className="space-y-1">
          {events.map((ev, i) => (
            <li key={i} className="text-sm">
              📅 {ev.subject} — {new Date(ev.start).toLocaleString("it-IT")}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
