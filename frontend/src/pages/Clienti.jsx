// src/pages/Clienti.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import OutlookCalendarWidget from "../components/OutlookCalendarWidget";
import MiniPlanner30 from "./MiniPlanner30";

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
      const r = await fetch(url, { headers: { accept: "application/json" } });
      const rawTxt = await r.text();
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
                <OutlookCalendarWidget
                  cliente={{
                    id: sel?.id,
                    nome: sel?.nome,
                    cfPiva: sel?.cfPiva,
                    telefono: sel?.telefono,
                  }}
                />
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
