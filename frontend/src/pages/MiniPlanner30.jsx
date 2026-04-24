import { useEffect, useMemo, useState } from "react";
import { createEvent, getCalendarView } from "../services/graph";

const TZ = "Europe/Rome";

export default function MiniPlanner30() {
  const [eventsByDate, setEventsByDate] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [subject, setSubject] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [description, setDescription] = useState("");

  const days = useMemo(() => {
    const arr = [];
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    for (let i = 0; i < 30; i += 1) {
      const dt = new Date(d);
      dt.setDate(d.getDate() + i);
      arr.push(dt);
    }
    return arr;
  }, []);

  const loadEvents = async () => {
    setLoading(true);
    setError("");
    try {
      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + 30);
      const items = await getCalendarView(start.toISOString(), end.toISOString());

      const grouped = {};
      for (const ev of items) {
        const dateTime = ev?.start?.dateTime;
        if (!dateTime) continue;
        const key = new Date(dateTime).toISOString().slice(0, 10);
        (grouped[key] ||= []).push(ev);
      }

      setEventsByDate(grouped);
    } catch (e) {
      setEventsByDate({});
      setError(e?.message || "Impossibile caricare il calendario.");
    } finally {
      setLoading(false);
    }
  };

  const onCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await createEvent({
        subject: subject.trim() || "(Senza oggetto)",
        start: { dateTime: `${date}T${startTime}:00`, timeZone: TZ },
        end: { dateTime: `${date}T${endTime}:00`, timeZone: TZ },
        body: description.trim()
          ? {
              contentType: "text",
              content: description.trim(),
            }
          : undefined,
      });

      setSubject("");
      setDescription("");
      await loadEvents();
    } catch (e2) {
      setError(e2?.message || "Impossibile creare l'evento.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  return (
    <div className="mt-8 rounded-2xl border p-4 bg-white space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold">Planner 30 giorni</h3>
        <button type="button" onClick={loadEvents} disabled={loading} className="px-3 py-2 rounded-lg border hover:shadow">
          {loading ? "Carico…" : "Aggiorna"}
        </button>
      </div>

      <form onSubmit={onCreate} className="grid grid-cols-1 md:grid-cols-5 gap-2">
        <input
          className="border rounded-lg px-3 py-2 text-sm md:col-span-2"
          placeholder="Titolo evento"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
        />
        <input type="date" className="border rounded-lg px-3 py-2 text-sm" value={date} onChange={(e) => setDate(e.target.value)} required />
        <input type="time" className="border rounded-lg px-3 py-2 text-sm" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
        <input type="time" className="border rounded-lg px-3 py-2 text-sm" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
        <textarea
          rows={2}
          className="border rounded-lg px-3 py-2 text-sm md:col-span-4"
          placeholder="Descrizione"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <button type="submit" className="px-3 py-2 rounded-lg border hover:shadow" disabled={loading}>
          + Crea evento
        </button>
      </form>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
        {days.map((dt) => {
          const key = dt.toISOString().slice(0, 10);
          const events = eventsByDate[key] || [];
          return (
            <div key={key} className="border rounded-xl p-2">
              <div className="text-sm font-semibold mb-1">
                {dt.toLocaleDateString("it-IT", { weekday: "short", day: "2-digit", month: "2-digit" })}
              </div>
              {events.length === 0 ? (
                <div className="text-xs opacity-60">—</div>
              ) : (
                <ul className="space-y-1 max-h-28 overflow-auto text-xs">
                  {events.slice(0, 3).map((ev) => {
                    const start = ev?.start?.dateTime ? new Date(ev.start.dateTime) : null;
                    return (
                      <li key={ev.id}>
                        <span className="opacity-60 mr-1">
                          {start ? start.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }) : "--:--"}
                        </span>
                        <span className="font-medium">{ev.subject || "(Senza oggetto)"}</span>
                      </li>
                    );
                  })}
                  {events.length > 3 && <li className="opacity-60">+ altri {events.length - 3}</li>}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
