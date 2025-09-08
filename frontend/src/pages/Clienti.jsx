// src/pages/Clienti.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
// MSAL: usa named exports (niente default)
import { msalInstance, ensureMsalInitialized } from "../msalInstance";

/* ============================
   API base robusta (anti-404)
   ============================ */
function apiBase() {
  let b = (import.meta.env.VITE_API_BASE ?? "").trim();

  // default: proxy Vite
  if (!b) return "/api";

  // normalizza assoluto o relativo
  if (/^https?:\/\//i.test(b)) {
    b = b.replace(/\/+$/, "");         // rimuovi slash finali
  } else {
    b = ("/" + b.replace(/^\/+/, "")).replace(/\/+$/, "");
  }

  // 🔧 forza suffisso /api se manca
  if (!/\/api$/i.test(b)) b += "/api";

  return b;
}

const API = apiBase();
function apiUrl(path) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${API}${p}`; // unisce base + path senza doppio slash
}

/* ============================
   Utils locali
   ============================ */
const LS_PRACTICHE = "dcp::pratiche";
function loadPraticheLS() {
  try { return JSON.parse(localStorage.getItem(LS_PRACTICHE) || "[]"); }
  catch { return []; }
}
function normKey(c) {
  // chiave cliente coerente (preferisci CF/P.IVA se presente)
  const raw = c?.cfPiva || c?.nome || "";
  return String(raw).trim().toUpperCase();
}
function centsToEUR(c = 0) {
  return (Number(c || 0) / 100).toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

/* ============================
   MINI PLANNER 30 GIORNI (globale)
   ============================ */
function MiniPlanner30() {
  const [eventsByDate, setEventsByDate] = useState({});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // form compatto crea evento
  const [subject, setSubject] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [body, setBody] = useState("");

  const TZ = "Europe/Rome";
  const SCOPES = ["Calendars.ReadWrite"];

  async function getToken() {
    await ensureMsalInitialized();
    let account = msalInstance.getActiveAccount();
    if (!account) {
      const login = await msalInstance.loginPopup({ scopes: SCOPES });
      account = login.account;
      msalInstance.setActiveAccount(account);
    }
    const resp =
      (await msalInstance.acquireTokenSilent({ scopes: SCOPES, account }).catch(() => null)) ||
      (await msalInstance.acquireTokenPopup({ scopes: SCOPES }));
    return resp.accessToken;
  }

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const token = await getToken();
      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + 30);

      const url =
        "https://graph.microsoft.com/v1.0/me/calendarview" +
        `?startDateTime=${encodeURIComponent(start.toISOString())}` +
        `&endDateTime=${encodeURIComponent(end.toISOString())}` +
        `&$orderby=start/dateTime`;

      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`Graph HTTP ${res.status}`);
      const items = (await res.json())?.value ?? [];

      // group by YYYY-MM-DD
      const grouped = {};
      for (const ev of items) {
        const s = ev?.start?.dateTime ? new Date(ev.start.dateTime + (ev.start.timeZone ? "" : "Z")) : null;
        const key = s ? s.toISOString().slice(0, 10) : "unknown";
        (grouped[key] ||= []).push(ev);
      }
      setEventsByDate(grouped);
    } catch (e) {
      setErr(String(e?.message || e));
      setEventsByDate({});
    } finally {
      setLoading(false);
    }
  };

  const createEvent = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      const token = await getToken();
      const startISO = `${date}T${startTime}:00`;
      const endISO = `${date}T${endTime}:00`;

      const payload = {
        subject: subject || "(Senza oggetto)",
        start: { dateTime: startISO, timeZone: TZ },
        end: { dateTime: endISO, timeZone: TZ },
        body: body ? { contentType: "text", content: body } : undefined,
      };

      const res = await fetch("https://graph.microsoft.com/v1.0/me/events", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Create HTTP ${res.status}: ${t}`);
      }
      setSubject("");
      setBody("");
      await load();
    } catch (e) {
      setErr(String(e?.message || e));
    }
  };

  // 30 giorni da oggi
  const days = (() => {
    const arr = [];
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    for (let i = 0; i < 30; i++) {
      const dt = new Date(d);
      dt.setDate(d.getDate() + i);
      arr.push(dt);
    }
    return arr;
  })();

  return (
    <div className="mt-8 rounded-2xl border p-4 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h3 className="font-semibold">Planner 30 giorni (tutti gli appuntamenti)</h3>
        <div className="flex items-center gap-2">
          <button onClick={load} className="px-3 py-2 rounded-lg border hover:shadow" disabled={loading}>
            {loading ? "Carico…" : "Aggiorna"}
          </button>
        </div>
      </div>

      {/* form compatto */}
      <form onSubmit={createEvent} className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-4">
        <input
          className="border rounded-lg px-3 py-2 text-sm md:col-span-2"
          placeholder="Titolo"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
        />
        <input type="date" className="border rounded-lg px-3 py-2 text-sm" value={date} onChange={(e) => setDate(e.target.value)} required />
        <div className="grid grid-cols-2 gap-2">
          <input type="time" className="border rounded-lg px-3 py-2 text-sm" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
          <input type="time" className="border rounded-lg px-3 py-2 text-sm" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
        </div>
        <button type="submit" className="px-3 py-2 rounded-lg border hover:shadow" disabled={loading}>+ Crea</button>
        <textarea
          className="border rounded-lg px-3 py-2 text-sm md:col-span-5"
          rows={2}
          placeholder="Note (opzionale)…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </form>

      {err && <div className="text-sm text-red-600 mb-3">{err}</div>}

      {/* griglia 30 giorni */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
        {days.map((dt) => {
          const key = dt.toLocaleDateString("en-CA"); // YYYY-MM-DD
          const list = eventsByDate[key] || [];
          const n = list.length;
          return (
            <div key={key} className="border rounded-xl p-2">
              <div className="flex items-center justify-between mb-1">
                <div className="text-sm font-semibold">
                  {dt.toLocaleDateString("it-IT", { weekday: "short", day: "2-digit", month: "2-digit" })}
                </div>
                {n > 0 && <span className="text-xs rounded-full border px-1.5">{n}</span>}
              </div>
              {n === 0 ? (
                <div className="text-xs opacity-50">—</div>
              ) : (
                <ul className="space-y-1 max-h-28 overflow-auto">
                  {list.slice(0, 3).map((ev) => {
                    const s = ev?.start?.dateTime ? new Date(ev.start.dateTime + (ev.start.timeZone ? "" : "Z")) : null;
                    return (
                      <li key={ev.id} className="text-xs">
                        <span className="opacity-60 mr-1">
                          {s ? s.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }) : "--:--"}
                        </span>
                        <span className="font-medium">{ev.subject || "(Senza oggetto)"}</span>
                      </li>
                    );
                  })}
                  {n > 3 && <li className="text-xs opacity-60">+ altri {n - 3}…</li>}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <div className="text-xs opacity-60 mt-2">
        Gli eventi creati qui sono salvati su Outlook (Microsoft Graph). La vista è in sola lettura.
      </div>
    </div>
  );
}

/* ============================
   Mini widget Outlook (Graph) nel dettaglio cliente
   ============================ */
function OutlookCalendarWidget({ query }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // Form Nuovo Evento
  const [subject, setSubject] = useState(query ? `Appuntamento: ${query}` : "");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [body, setBody] = useState("");

  const TZ = "Europe/Rome";
  const SCOPES = ["Calendars.ReadWrite"];

  async function getToken() {
    await ensureMsalInitialized();
    let account = msalInstance.getActiveAccount();
    if (!account) {
      const login = await msalInstance.loginPopup({ scopes: SCOPES });
      account = login.account;
      msalInstance.setActiveAccount(account);
    }
    return (
      (await msalInstance.acquireTokenSilent({ scopes: SCOPES, account }).catch(() => null)) ||
      (await msalInstance.acquireTokenPopup({ scopes: SCOPES }))
    ).accessToken;
  }

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const token = await getToken();
      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + 30);

      const url =
        "https://graph.microsoft.com/v1.0/me/calendarview" +
        `?startDateTime=${encodeURIComponent(start.toISOString())}` +
        `&endDateTime=${encodeURIComponent(end.toISOString())}` +
        `&$orderby=start/dateTime`;

      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`Graph HTTP ${res.status}`);

      let items = (await res.json())?.value ?? [];
      if (query && query.trim()) {
        const q = query.toLowerCase();
        items = items.filter((e) => (e?.subject || "").toLowerCase().includes(q));
      }

      items.sort((a, b) => new Date(a?.start?.dateTime || 0) - new Date(b?.start?.dateTime || 0));
      setEvents(items.slice(0, 50));
    } catch (e) {
      setErr(String(e?.message || e));
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const createEvent = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      const token = await getToken();

      const startISO = `${date}T${startTime}:00`;
      const endISO = `${date}T${endTime}:00`;

      const payload = {
        subject: subject || "(Senza oggetto)",
        start: { dateTime: startISO, timeZone: TZ },
        end: { dateTime: endISO, timeZone: TZ },
        body: body ? { contentType: "text", content: body } : undefined,
      };

      const res = await fetch("https://graph.microsoft.com/v1.0/me/events", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Create HTTP ${res.status}: ${t}`);
      }

      setBody("");
      await load();
    } catch (e) {
      setErr(String(e?.message || e));
    }
  };

  return (
    <div className="rounded-xl border p-4 space-y-4">
      {/* Form nuovo evento */}
      <form onSubmit={createEvent} className="grid md:grid-cols-2 gap-3">
        <div className="md:col-span-2">
          <label className="block text-sm mb-1">Titolo</label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Titolo evento"
            required
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Data</label>
          <input
            type="date"
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">Inizio</label>
            <input
              type="time"
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Fine</label>
            <input
              type="time"
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm mb-1">Note/Descrizione</label>
          <textarea
            rows={3}
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Dettagli appuntamento…"
          />
        </div>

        <div className="md:col-span-2 flex items-center gap-2">
          <button type="submit" className="px-3 py-2 rounded-lg border hover:shadow" disabled={loading}>
            + Crea evento
          </button>
          <button type="button" onClick={load} className="px-3 py-2 rounded-lg border hover:shadow" disabled={loading}>
            {loading ? "Carico…" : "Mostra eventi"}
          </button>
          <span className="text-xs opacity-60">Fuso orario: {TZ}</span>
        </div>
      </form>

      {err && <div className="text-sm text-red-600">{err}</div>}

      {/* Lista eventi */}
      <div>
        {events.length === 0 ? (
          <div className="text-sm opacity-70">Nessun evento {query ? `per "${query}"` : ""} nei prossimi 30 giorni.</div>
        ) : (
          <ul className="text-sm space-y-2 max-h-64 overflow-auto">
            {events.map((ev) => {
              const start = ev?.start?.dateTime ? new Date(ev.start.dateTime + (ev.start.timeZone ? "" : "Z")) : null;
              const end = ev?.end?.dateTime ? new Date(ev.end.dateTime + (ev.end.timeZone ? "" : "Z")) : null;
              return (
                <li key={ev.id} className="border rounded p-2 bg-gray-50">
                  <div className="font-medium">{ev.subject || "(Senza oggetto)"}</div>
                  <div className="opacity-70">
                    {start ? start.toLocaleString("it-IT") : "-"} • {end ? end.toLocaleString("it-IT") : "-"}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ============================
   LISTA CLIENTI + DRAWER DETTAGLIO + PLANNER
   ============================ */
export default function Clienti() {
  const [raw, setRaw] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [scope, setScope] = useState("all"); // filtro all|gas|power
  const pageSize = 12;

  const [sel, setSel] = useState(null); // cliente selezionato (drawer)

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const url = apiUrl("clienti");
      console.debug("[Clienti] GET", url);
      const r = await fetch(url, { headers: { accept: "application/json" } });
      const rawTxt = await r.text();
      console.debug("[Clienti] status", r.status, "body:", rawTxt);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);

      let json;
      try { json = JSON.parse(rawTxt); } catch { json = rawTxt; }

      // backend attuale ritorna direttamente un array
      const arr = Array.isArray(json) ? json : (Array.isArray(json?.clienti) ? json.clienti : []);

      // Map pratica legale da localStorage (ultima per clientKey)
      const pratiche = loadPraticheLS(); // [{ id, clientKey, createdAt, ... }]
      const latestByKey = new Map();
      for (const p of pratiche) {
        const k = String(p.clientKey || "").trim().toUpperCase();
        const prev = latestByKey.get(k);
        if (!prev || (p.createdAt || p.id) > (prev?.createdAt || prev?.id)) latestByKey.set(k, p);
      }

      const enriched = arr.map((c) => {
        const k = normKey(c);
        const p = latestByKey.get(k);
        return { ...c, praticaLegaleId: p ? p.id : null };
      });

      setRaw(enriched);
    } catch (e) {
      console.error("[Clienti] load error:", e);
      setErr(String(e?.message || e));
      setRaw([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  // ricarica quando cambia LS pratiche
  useEffect(() => {
    const onStorage = (e) => { if (e.key === LS_PRACTICHE) load(); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // ricerca + filtro scope
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (raw || []).filter((c) => {
      // filtro commodity
      if (scope !== "all") {
        const ok = (c?.utenze || []).some(u => (u?.tipo || "").toLowerCase() === scope);
        if (!ok) return false;
      }
      if (!s) return true;
      const base = [c?.nome ?? "", c?.cfPiva ?? "", c?.email ?? "", c?.telefono ?? "", c?.indirizzoFatturazione ?? ""]
        .join(" ").toLowerCase();
      const pods = (c?.utenze ?? []).map(u => `${u?.codice ?? ""}`.toLowerCase()).join(" ");
      return base.includes(s) || pods.includes(s);
    });
  }, [q, raw, scope]);

  const totalPages = Math.max(1, Math.ceil((filtered?.length ?? 0) / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return (filtered ?? []).slice(start, start + pageSize);
  }, [filtered, currentPage]);

  // KPI
  const totClienti = filtered.length;
  const totFattureInsolute = filtered.reduce((a, c) => a + (c?.fattureNonSaldateCount || 0), 0);
  const totInsoluti = filtered.reduce((a, c) => a + (c?.insolutiCentesimi || 0), 0);

  return (
    <div className="p-6 space-y-4">
      {/* barra ricerca + filtro commodity */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          className="input input-bordered w-full max-w-xl px-3 py-2 rounded-xl border"
          placeholder="Cerca per nome / CF/P.IVA / POD-PDR…"
          value={q}
          onChange={(e) => { setPage(1); setQ(e.target.value); }}
        />
        <select
          className="px-3 py-2 rounded-xl border"
          value={scope}
          onChange={(e) => { setScope(e.target.value); setPage(1); }}
          title="Filtro commodity"
        >
          <option value="all">Tutti</option>
          <option value="gas">Gas</option>
          <option value="power">Power</option>
        </select>
        <button className="px-4 py-2 rounded-xl border shadow hover:shadow-md" onClick={() => { setQ(""); setPage(1); }}>
          Pulisci
        </button>
        <button className="px-4 py-2 rounded-xl border shadow hover:shadow-md" onClick={load} disabled={loading}>
          {loading ? "Aggiorno…" : "Ricarica"}
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KPI title="Clienti" value={totClienti.toLocaleString("it-IT")} />
        <KPI title="Fatture non saldate" value={totFattureInsolute.toLocaleString("it-IT")} />
        <KPI title="Totale Insoluti" value={centsToEUR(totInsoluti)} />
      </div>

      {err && <div className="text-red-600 text-sm">{err}</div>}

      {/* tabella clienti */}
      <div className="rounded-2xl border overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3">Cliente</th>
              <th className="text-left p-3">CF / P.IVA</th>
              <th className="text-left p-3">Utenze</th>
              <th className="text-right p-3">Insoluto</th>
              <th className="text-right p-3">Fatture non saldate</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="p-3" colSpan={6}>Caricamento…</td></tr>
            ) : (paged?.length ?? 0) === 0 ? (
              <tr><td className="p-3" colSpan={6}>Nessun cliente</td></tr>
            ) : (
              (paged ?? []).map((c, idx) => (
                <tr key={`${c?.id ?? c?.cfPiva ?? "row"}-${idx}`} className="border-t">
                  <td className="p-3">
                    <div className="font-medium">{c?.nome ?? "-"}</div>
                    <div className="text-xs text-gray-500">
                      {c?.email || "—"} {c?.telefono ? `• ${c.telefono}` : ""}
                    </div>
                  </td>
                  <td className="p-3">{c?.cfPiva || "-"}</td>
                  <td className="p-3">
                    {(c?.utenze ?? []).length === 0 ? "—" : (c?.utenze ?? []).map(u => u?.codice).join(", ")}
                  </td>
                  <td className="p-3 text-right">{centsToEUR(c?.insolutiCentesimi || 0)}</td>
                  <td className="p-3 text-right">{c?.fattureNonSaldateCount || 0}</td>
                  <td className="p-3">
                    <button className="px-3 py-1 rounded-lg border hover:shadow" onClick={() => setSel(c)}>
                      Dettagli
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* paging */}
      <Pager page={currentPage} totalPages={totalPages} onPrev={() => setPage(p => Math.max(1, p - 1))} onNext={() => setPage(p => Math.min(totalPages, p + 1))} />

      {/* Drawer dettaglio */}
      {sel && (
        <div className="fixed inset-0 bg-black/30 z-[1000]" onClick={() => setSel(null)}>
          <div className="ml-auto h-full w-full max-w-3xl bg-white p-6 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold">{sel?.nome ?? "-"}</h2>
              <button className="px-3 py-1 rounded-lg border" onClick={() => setSel(null)}>Chiudi</button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Dati */}
              <div className="rounded-xl border p-4">
                <h3 className="font-medium mb-2">Dati & recapiti</h3>
                <div className="text-sm space-y-1">
                  <div><b>CF/P.IVA:</b> {sel?.cfPiva || "-"}</div>
                  <div><b>Email:</b> {sel?.email || "-"}</div>
                  <div><b>Telefono:</b> {sel?.telefono || "-"}</div>
                  <div><b>Indirizzo fatturazione:</b> {sel?.indirizzoFatturazione || "-"}</div>
                </div>
              </div>

              {/* Utenze */}
              <div className="rounded-xl border p-4">
                <h3 className="font-medium mb-2">Utenze</h3>
                <ul className="text-sm list-disc pl-5">
                  {(sel?.utenze ?? []).length === 0 ? (
                    <li>—</li>
                  ) : (
                    (sel?.utenze ?? []).map((u, i) => (
                      <li key={`${u?.id ?? u?.codice ?? "u"}-${i}`}>
                        {(u?.tipo || "").toUpperCase()} • {u?.codice || "-"}
                      </li>
                    ))
                  )}
                </ul>
              </div>

              {/* Fatture non saldate + link pratica */}
              <div className="rounded-xl border p-4 md:col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">Fatture non saldate</h3>
                  {sel?.praticaLegaleId ? (
                    <Link
                      to={`/pratiche-legali?open=${encodeURIComponent(sel.praticaLegaleId)}`}
                      className="text-blue-600 hover:underline text-sm"
                      title={`Apri pratica #${sel.praticaLegaleId}`}
                    >
                      Pratica legale: #{sel.praticaLegaleId}
                    </Link>
                  ) : (
                    <span className="text-sm opacity-60">Pratica legale: —</span>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-2">Numero</th>
                        <th className="text-left p-2">Scadenza</th>
                        <th className="text-left p-2">Residuo</th>
                        <th className="text-left p-2">Stato</th>
                        <th className="text-left p-2">Utenza</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(sel?.fattureNonSaldate ?? []).length === 0 ? (
                        <tr><td className="p-2" colSpan={5}>Nessun insoluto</td></tr>
                      ) : (
                        (sel?.fattureNonSaldate ?? []).map((f, i) => {
                          const d = f?.dtScadenza ? new Date(f.dtScadenza) : null;
                          const utenzaLabel = (() => {
                            const u = (sel?.utenze || []).find(x => x?.id === f?.utenzaId);
                            return u ? `${(u?.tipo || "").toUpperCase()} • ${u?.codice || "-"}` : "—";
                          })();
                          return (
                            <tr key={`${f?.id ?? f?.numero ?? "f"}-${i}`} className="border-t">
                              <td className="p-2">{f?.numero ?? "-"}</td>
                              <td className="p-2">{d ? d.toLocaleDateString("it-IT") : "-"}</td>
                              <td className="p-2">{centsToEUR(f?.residuo || 0)}</td>
                              <td className="p-2">{f?.stato ?? "-"}</td>
                              <td className="p-2">{utenzaLabel}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Note cliente (localStorage) */}
              <ClientNotes keyRef={normKey(sel)} />

              {/* Calendario Outlook (cliente) */}
              <div className="md:col-span-2">
                <OutlookCalendarWidget query={sel?.nome || ""} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PLANNER GLOBALE 30 GIORNI */}
      <MiniPlanner30 />
    </div>
  );
}

/* ============================
   Note cliente (localStorage)
   ============================ */
function ClientNotes({ keyRef }) {
  const storageKey = `clientNotes::${keyRef}`;
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState("");
  const [show, setShow] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      const arr = raw ? JSON.parse(raw) : [];
      setNotes(Array.isArray(arr) ? arr : []);
    } catch {
      setNotes([]);
    }
  }, [storageKey]);

  const save = (arr) => localStorage.setItem(storageKey, JSON.stringify(arr));

  const add = () => {
    const t = newNote.trim();
    if (!t) return;
    const n = { text: t, createdAt: new Date().toISOString() };
    const next = [n, ...notes];
    setNotes(next);
    save(next);
    setNewNote("");
    if (!show) setShow(true);
  };

  return (
    <div className="rounded-xl border p-4 md:col-span-2">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium">Note cliente</h3>
        <button className="px-2 py-1 text-xs rounded border hover:shadow" onClick={() => setShow((v) => !v)}>
          {show ? "Nascondi" : "Mostra"}
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <textarea
            className="w-full rounded-lg border p-2 text-sm"
            rows={show ? 3 : 1}
            placeholder="Aggiungi una nota (verrà salvata con data e ora)…"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
          />
          <button className="shrink-0 px-3 py-2 rounded-lg border hover:shadow" onClick={add} disabled={!newNote.trim()}>
            + Aggiungi
          </button>
        </div>

        {show && (
          notes.length === 0 ? (
            <div className="text-sm opacity-70">Nessuna nota per questo cliente.</div>
          ) : (
            <ul className="text-sm space-y-2 max-h-56 overflow-auto">
              {notes.map((n, i) => (
                <li key={i} className="rounded border p-2 bg-gray-50">
                  <div className="opacity-60 text-xs mb-1">
                    {new Date(n.createdAt).toLocaleString("it-IT")}
                  </div>
                  <div>{n.text}</div>
                </li>
              ))}
            </ul>
          )
        )}
      </div>
    </div>
  );
}

/* ============================
   UI helpers
   ============================ */
function KPI({ title, value }) {
  return (
    <div className="rounded-xl border p-4">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}
function Pager({ page, totalPages, onPrev, onNext }) {
  return (
    <div className="flex items-center gap-2">
      <button className="px-3 py-1 rounded-lg border" disabled={page <= 1} onClick={onPrev}>
        ← Prev
      </button>
      <span className="text-sm">Pagina {page} di {totalPages}</span>
      <button className="px-3 py-1 rounded-lg border" disabled={page >= totalPages} onClick={onNext}>
        Next →
      </button>
    </div>
  );
}
