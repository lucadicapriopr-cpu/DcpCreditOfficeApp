import { useCallback, useEffect, useMemo, useState } from "react";
import { createEvent, getCalendarView } from "../services/graph";

const TZ = "Europe/Rome";

function includesText(value, q) {
  return String(value || "").toLowerCase().includes(q);
}

export default function OutlookCalendarWidget({ cliente }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [notes, setNotes] = useState("");

  const subject = useMemo(() => `Cliente: ${cliente?.nome || "Sconosciuto"}`, [cliente?.nome]);

  const filterTokens = useMemo(() => {
    return [cliente?.nome, cliente?.cfPiva]
      .filter(Boolean)
      .map((x) => String(x).trim().toLowerCase())
      .filter(Boolean);
  }, [cliente?.cfPiva, cliente?.nome]);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + 30);
      const all = await getCalendarView(start.toISOString(), end.toISOString());

      const filtered = all.filter((ev) => {
        if (filterTokens.length === 0) return true;
        const hay = [ev?.subject, ev?.bodyPreview, ev?.body?.content].join("\n").toLowerCase();
        return filterTokens.some((q) => includesText(hay, q));
      });

      filtered.sort((a, b) => new Date(a?.start?.dateTime || 0) - new Date(b?.start?.dateTime || 0));
      setEvents(filtered.slice(0, 50));
    } catch (e) {
      setEvents([]);
      setError(e?.message || "Errore caricamento eventi cliente.");
    } finally {
      setLoading(false);
    }
  }, [filterTokens]);

  const onCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const bodyLines = [
        `Cliente ID: ${cliente?.id || "-"}`,
        `Nome: ${cliente?.nome || "-"}`,
        `CF/PIVA: ${cliente?.cfPiva || "-"}`,
        `Telefono: ${cliente?.telefono || "-"}`,
        `Note: ${notes || "-"}`,
      ];

      await createEvent({
        subject,
        categories: ["DCP-CREDIT"],
        start: { dateTime: `${date}T${startTime}:00`, timeZone: TZ },
        end: { dateTime: `${date}T${endTime}:00`, timeZone: TZ },
        body: {
          contentType: "text",
          content: bodyLines.join("\n"),
        },
      });

      setNotes("");
      await loadEvents();
    } catch (e2) {
      setError(e2?.message || "Errore creazione evento cliente.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [loadEvents, cliente?.id, cliente?.nome, cliente?.cfPiva]);

  return (
    <div className="rounded-xl border p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">Calendario cliente (Outlook)</h3>
        <button type="button" onClick={loadEvents} className="px-3 py-2 rounded-lg border hover:shadow" disabled={loading}>
          {loading ? "Carico…" : "Aggiorna"}
        </button>
      </div>

      <form onSubmit={onCreate} className="grid md:grid-cols-2 gap-3">
        <div className="md:col-span-2">
          <label className="block text-sm mb-1">Titolo</label>
          <input className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50" value={subject} readOnly />
        </div>

        <div>
          <label className="block text-sm mb-1">Data</label>
          <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">Inizio</label>
            <input type="time" className="w-full border rounded-lg px-3 py-2 text-sm" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm mb-1">Fine</label>
            <input type="time" className="w-full border rounded-lg px-3 py-2 text-sm" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm mb-1">Note</label>
          <textarea rows={3} className="w-full border rounded-lg px-3 py-2 text-sm" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Aggiungi note evento cliente" />
        </div>

        <div className="md:col-span-2">
          <button type="submit" className="px-3 py-2 rounded-lg border hover:shadow" disabled={loading}>
            + Crea evento cliente
          </button>
        </div>
      </form>

      {error && <div className="text-sm text-red-600">{error}</div>}

      {events.length === 0 ? (
        <div className="text-sm opacity-70">Nessun evento cliente nei prossimi 30 giorni.</div>
      ) : (
        <ul className="text-sm space-y-2 max-h-64 overflow-auto">
          {events.map((ev) => {
            const start = ev?.start?.dateTime ? new Date(ev.start.dateTime) : null;
            return (
              <li key={ev.id} className="border rounded p-2 bg-gray-50">
                <div className="font-medium">{ev.subject || "(Senza oggetto)"}</div>
                <div className="opacity-70">{start ? start.toLocaleString("it-IT") : "-"}</div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
