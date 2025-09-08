import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

// chiave cliente stabile/normalizzata
function normKey(c) {
  const raw = c?.key || c?.codiceFiscale || c?.partitaIva || c?.nominativo || "";
  return String(raw).trim().toUpperCase();
}

const API = import.meta.env.VITE_API_BASE || "/api";

/* ============================
   Helpers storage
   ============================ */
const LS_KEYS = {
  pratiche: "dcp::pratiche",
  legali: "dcp::legali",
};

const loadLS = (k, fallback) => {
  try {
    const raw = localStorage.getItem(k);
    if (!raw) return fallback;
    const v = JSON.parse(raw);
    return Array.isArray(fallback) && !Array.isArray(v) ? fallback : v;
  } catch {
    return fallback;
  }
};
const saveLS = (k, v) => localStorage.setItem(k, JSON.stringify(v));

/* ============================
   Totali insoluti per cliente
   ============================ */
function computeTotalsForClient(cliente) {
  const perUtenza = new Map();
  let totale = 0;

  (cliente?.fattureNonSaldate ?? []).forEach((f) => {
    const res = Number(f?.residuo ?? 0);
    totale += res;
    const key = f?.utenza?.podPdr || f?.utenza?.contratto || "Senza utenza";
    const prev = perUtenza.get(key) || { key, comune: f?.utenza?.comune || null, totale: 0 };
    prev.totale += res;
    perUtenza.set(key, prev);
  });

  return {
    totale,
    perUtenza: Array.from(perUtenza.values()).sort((a, b) => b.totale - a.totale),
  };
}

/* ============================
   Modale semplice
   ============================ */
function Modal({ title, onClose, children, maxW = "max-w-4xl" }) {
  return (
    <div className="fixed inset-0 z-[1200] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className={`w-full ${maxW} bg-white rounded-2xl shadow-2xl overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
          <h3 className="font-semibold">{title}</h3>
          <button className="px-3 py-1 rounded border bg-white hover:shadow" onClick={onClose}>
            Chiudi
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

/* ============================
   Pagina principale
   ============================ */
export default function PraticheLegali() {
  const [clienti, setClienti] = useState([]);
  const [loadingClienti, setLoadingClienti] = useState(false);
  const [err, setErr] = useState("");

  // storage
  const [pratiche, setPratiche] = useState(() => loadLS(LS_KEYS.pratiche, []));
  const [legali, setLegali] = useState(() => loadLS(LS_KEYS.legali, []));

  // UI state
  const [q, setQ] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedPractice, setSelectedPractice] = useState(null); // pratica aperta in modale
  const [filterLawyerId, setFilterLawyerId] = useState(null);

  // Pannello inserimento legale (toggle accanto ricerca)
  const [showLawPanel, setShowLawPanel] = useState(false);

  // 👇 Query param ?open=ID → apre la pratica
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const openId = searchParams.get("open");
    if (!openId) return;
    const all = loadLS(LS_KEYS.pratiche, []);
    const p = all.find((x) => String(x.id) === String(openId));
    if (p) setSelectedPractice(p);
  }, [searchParams]);

  // caricamento clienti dal backend
  const loadClienti = async () => {
    setLoadingClienti(true);
    setErr("");
    try {
      const r = await fetch(`${API}/clienti`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const json = await r.json();
      setClienti(Array.isArray(json?.clienti) ? json.clienti : []);
    } catch (e) {
      setErr(String(e?.message || e));
      setClienti([]);
    } finally {
      setLoadingClienti(false);
    }
  };

  useEffect(() => {
    loadClienti();
  }, []);

  // persist
  useEffect(() => saveLS(LS_KEYS.pratiche, pratiche), [pratiche]);
  useEffect(() => saveLS(LS_KEYS.legali, legali), [legali]);

  // ricerca su pratiche (cliente/cf/piva) + filtro legale
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return pratiche.filter((p) => {
      if (filterLawyerId && p.lawyerId !== filterLawyerId) return false;
      if (!s) return true;
      const hay = [
        p.nominativo || "",
        p.codiceFiscale || "",
        p.partitaIva || "",
        String(p.id || ""),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(s);
    });
  }, [q, pratiche, filterLawyerId]);

  /* ============================
     INSERISCI LEGALE (solo inserimento, nessuna lista)
     ============================ */
  const [lawForm, setLawForm] = useState({
    id: null,
    nome: "",
    cognome: "",
    cellulare: "",
    email: "",
    pec: "",
    indirizzo: "",
  });

  const resetLawForm = () =>
    setLawForm({ id: null, nome: "", cognome: "", cellulare: "", email: "", pec: "", indirizzo: "" });

  const insertLawyer = () => {
    const payload = { ...lawForm };
    if (!payload.nome.trim() || !payload.cognome.trim()) return;
    payload.id = `L${Date.now()}`;
    setLegali((arr) => [payload, ...arr]);
    resetLawForm();
    setShowLawPanel(false);
  };

  const countPraticheByLawyer = (lawyerId) => pratiche.filter((p) => p.lawyerId === lawyerId).length;

  /* ============================
     CREA PRATICA
     ============================ */
  const [chosenClientKey, setChosenClientKey] = useState("");
  const chosenClient = useMemo(
    () => (clienti || []).find((c) => (c.key || c.nominativo) === chosenClientKey) || null,
    [clienti, chosenClientKey]
  );

  const [uploadFiles, setUploadFiles] = useState([]);
  const handleFiles = (e) => {
    const files = Array.from(e.target.files || []);
    const meta = files.map((f) => ({
      name: f.name,
      size: f.size,
      type: f.type,
      uploadedAt: new Date().toISOString(),
    }));
    setUploadFiles((prev) => [...meta, ...prev]);
    e.target.value = "";
  };
  const removeFile = (idx) => setUploadFiles((prev) => prev.filter((_, i) => i !== idx));

  const [assignedLawyerId, setAssignedLawyerId] = useState("");

  const createPractice = () => {
    if (!chosenClient) return;
    const { totale, perUtenza } = computeTotalsForClient(chosenClient);
    const pratica = {
      id: `P${Date.now()}`,
      clientKey: normKey(chosenClient),
      nominativo: chosenClient.nominativo,
      codiceFiscale: chosenClient.codiceFiscale || null,
      partitaIva: chosenClient.partitaIva || null,
      totaleInsoluto: totale,
      perUtenza, // [{key, comune, totale}]
      files: uploadFiles, // metadata
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lawyerId: assignedLawyerId || null,
    };
    setPratiche((arr) => [pratica, ...arr]);
    // cleanup
    setShowCreate(false);
    setChosenClientKey("");
    setUploadFiles([]);
    setAssignedLawyerId("");
  };

  /* ============================
     UPDATE PRATICA (modale)
     ============================ */
  const updatePractice = (patch) => {
    setPratiche((arr) =>
      arr.map((p) =>
        p.id === selectedPractice.id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p
      )
    );
  };

  const appendFilesToPractice = (filesMeta) => {
    updatePractice({ files: [...(selectedPractice.files || []), ...filesMeta] });
  };

  const removeFileFromPractice = (idx) => {
    const next = [...(selectedPractice.files || [])];
    next.splice(idx, 1);
    updatePractice({ files: next });
  };

  useEffect(() => {
    if (selectedPractice) {
      const p = pratiche.find((x) => x.id === selectedPractice.id);
      if (p) setSelectedPractice(p);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pratiche]);

  return (
    <div className="p-6 space-y-4">
      {/* Barra superiore: Ricerca + Crea pratica + (nuovo) Inserisci legale */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          className="input input-bordered w-full max-w-xl px-3 py-2 rounded-xl border"
          placeholder="Cerca pratica per nome / CF / P.IVA / ID…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        <button
          className="px-4 py-2 rounded-xl border shadow hover:shadow-md"
          onClick={() => setShowCreate(true)}
        >
          + Crea pratica
        </button>

        <button
          className="px-4 py-2 rounded-xl border shadow hover:shadow-md"
          onClick={() => setShowLawPanel((v) => !v)}
        >
          {showLawPanel ? "Chiudi inserimento legale" : "Inserisci legale"}
        </button>

        {/* Filtro per legale (resta disponibile) */}
        <select
          className="px-3 py-2 rounded-xl border"
          value={filterLawyerId || ""}
          onChange={(e) => setFilterLawyerId(e.target.value || null)}
          title="Filtra per legale"
        >
          <option value="">Tutti i legali</option>
          {legali.map((l) => (
            <option key={l.id} value={l.id}>
              {l.cognome} {l.nome} ({countPraticheByLawyer(l.id)})
            </option>
          ))}
        </select>
        <button
          className="px-3 py-2 rounded-xl border"
          onClick={() => {
            setFilterLawyerId(null);
            setQ("");
          }}
        >
          Pulisci filtri
        </button>
      </div>

      {/* Pannello a scomparsa: Inserisci legale */}
      {showLawPanel && (
        <div className="rounded-2xl border p-4">
          <h3 className="font-semibold mb-3">Inserisci legale</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm">Nome</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={lawForm.nome}
                onChange={(e) => setLawForm((s) => ({ ...s, nome: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm">Cognome</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={lawForm.cognome}
                onChange={(e) => setLawForm((s) => ({ ...s, cognome: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm">Cellulare</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={lawForm.cellulare}
                onChange={(e) => setLawForm((s) => ({ ...s, cellulare: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm">Email</label>
              <input
                type="email"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={lawForm.email}
                onChange={(e) => setLawForm((s) => ({ ...s, email: e.target.value }))}
              />
            </div>
            <div className="col-span-2">
              <label className="text-sm">PEC</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={lawForm.pec}
                onChange={(e) => setLawForm((s) => ({ ...s, pec: e.target.value }))}
              />
            </div>
            <div className="col-span-2">
              <label className="text-sm">Indirizzo studio legale</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={lawForm.indirizzo}
                onChange={(e) => setLawForm((s) => ({ ...s, indirizzo: e.target.value }))}
              />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <button className="px-3 py-2 rounded-lg border hover:shadow" onClick={insertLawyer}>
                Aggiungi legale
              </button>
              <button className="px-3 py-2 rounded-lg border" onClick={resetLawForm}>
                Pulisci form
              </button>
            </div>
          </div>
        </div>
      )}

      {err && <div className="text-sm text-red-600">{err}</div>}

      {/* Lista pratiche */}
      <div className="rounded-2xl border overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3">Cliente</th>
              <th className="text-left p-3">CF / P.IVA</th>
              <th className="text-left p-3">Totale insoluto</th>
              <th className="text-left p-3">ID pratica</th>
              <th className="text-left p-3">Legale</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td className="p-3" colSpan={6}>
                  Nessuna pratica trovata
                </td>
              </tr>
            ) : (
              filtered.map((p) => {
                const leg = p.lawyerId ? legali.find((l) => l.id === p.lawyerId) : null;
                return (
                  <tr key={p.id} className="border-t">
                    <td className="p-3">{p.nominativo}</td>
                    <td className="p-3">
                      {p.codiceFiscale || p.partitaIva || "—"}
                    </td>
                    <td className="p-3">
                      {Number(p.totaleInsoluto || 0).toLocaleString("it-IT", {
                        style: "currency",
                        currency: "EUR",
                      })}
                    </td>
                    <td className="p-3">#{p.id}</td>
                    <td className="p-3">
                      {leg ? `${leg.cognome} ${leg.nome}` : <span className="opacity-60">—</span>}
                    </td>
                    <td className="p-3">
                      <button
                        className="px-3 py-1 rounded-lg border hover:shadow"
                        onClick={() => setSelectedPractice(p)}
                      >
                        Apri pratica
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Sezione Crea pratica */}
      {showCreate && (
        <Modal title="Crea pratica legale" onClose={() => setShowCreate(false)}>
          <div className="grid md:grid-cols-3 gap-4">
            {/* Scelta cliente */}
            <div className="md:col-span-1 rounded-xl border p-3">
              <h4 className="font-medium mb-2">Seleziona cliente moroso</h4>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm mb-2"
                placeholder="Cerca tra i clienti…"
                onChange={(e) => setQ(e.target.value)}
                value={q}
              />
              <div className="max-h-64 overflow-auto border rounded-lg">
                <ul className="divide-y">
                  {(clienti || [])
                    .filter((c) => {
                      const s = q.trim().toLowerCase();
                      if (!s) return true;
                      const hay = [
                        c?.nominativo ?? "",
                        c?.codiceFiscale ?? "",
                        c?.partitaIva ?? "",
                      ]
                        .join(" ")
                        .toLowerCase();
                      return hay.includes(s);
                    })
                    .slice(0, 50)
                    .map((c) => (
                      <li key={c.key || c.nominativo} className="p-2">
                        <button
                          className={`w-full text-left rounded px-2 py-1 hover:bg-gray-50 ${
                            chosenClientKey === (c.key || c.nominativo) ? "bg-amber-50" : ""
                          }`}
                          onClick={() => setChosenClientKey(c.key || c.nominativo)}
                        >
                          <div className="font-medium">{c.nominativo}</div>
                          <div className="text-xs opacity-70">
                            {c.codiceFiscale || c.partitaIva || "—"}
                          </div>
                        </button>
                      </li>
                    ))}
                </ul>
              </div>
            </div>

            {/* Dati cliente + totali */}
            <div className="md:col-span-2 rounded-xl border p-3">
              <h4 className="font-medium mb-2">Dati cliente & insoluti</h4>
              {!chosenClient ? (
                <div className="text-sm opacity-60">Seleziona un cliente a sinistra.</div>
              ) : (
                <>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="rounded border p-2">
                      <div><b>Cliente:</b> {chosenClient.nominativo}</div>
                      <div><b>CF:</b> {chosenClient.codiceFiscale || "—"}</div>
                      <div><b>P.IVA:</b> {chosenClient.partitaIva || "—"}</div>
                      <div><b>Email:</b> {chosenClient.email || "—"}</div>
                      <div><b>Telefono:</b> {chosenClient.telefono || "—"}</div>
                      <div><b>Indirizzo fatturazione:</b> {chosenClient.indirizzoFatturazione || "—"}</div>
                    </div>
                    {(() => {
                      const { totale, perUtenza } = computeTotalsForClient(chosenClient);
                      return (
                        <div className="rounded border p-2">
                          <div className="mb-2">
                            <b>Totale insoluti:</b>{" "}
                            {Number(totale).toLocaleString("it-IT", { style: "currency", currency: "EUR" })}
                          </div>
                          <div className="text-sm">
                            <div className="font-medium mb-1">Per utenza:</div>
                            {perUtenza.length === 0 ? (
                              <div className="opacity-60">—</div>
                            ) : (
                              <ul className="list-disc pl-5 space-y-1">
                                {perUtenza.map((u) => (
                                  <li key={u.key}>
                                    {u.key}
                                    {u.comune ? ` • ${u.comune}` : ""} —{" "}
                                    {Number(u.totale).toLocaleString("it-IT", {
                                      style: "currency",
                                      currency: "EUR",
                                    })}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* assegnazione legale */}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <label className="text-sm">Assegna a legale:</label>
                    <select
                      className="px-3 py-2 rounded-lg border text-sm"
                      value={assignedLawyerId}
                      onChange={(e) => setAssignedLawyerId(e.target.value)}
                    >
                      <option value="">— Nessuno —</option>
                      {legali.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.cognome} {l.nome}
                        </option>
                      ))}
                    </select>
                    <span className="text-xs opacity-60">
                      Aggiungi nuovi legali con il tasto “Inserisci legale” in alto.
                    </span>
                  </div>

                  {/* upload file */}
                  <div className="mt-4">
                    <h5 className="font-medium mb-1">Carica file</h5>
                    <input type="file" multiple onChange={handleFiles} />
                    {uploadFiles.length > 0 && (
                      <ul className="mt-2 text-sm space-y-1">
                        {uploadFiles.map((f, i) => (
                          <li key={i} className="flex items-center justify-between rounded border px-2 py-1">
                            <span className="truncate">{f.name}</span>
                            <button className="px-2 py-1 text-xs rounded border" onClick={() => removeFile(i)}>
                              Rimuovi
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <button className="px-4 py-2 rounded-lg border hover:shadow" onClick={createPractice}>
                      Crea pratica
                    </button>
                    <button className="px-3 py-2 rounded-lg border" onClick={() => setShowCreate(false)}>
                      Annulla
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Modale Apri pratica */}
      {selectedPractice && (
        <Modal title={`Pratica #${selectedPractice.id}`} onClose={() => setSelectedPractice(null)} maxW="max-w-5xl">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="rounded-xl border p-3 md:col-span-1">
              <h4 className="font-medium mb-2">Cliente</h4>
              <div className="text-sm space-y-1">
                <div><b>Nome:</b> {selectedPractice.nominativo}</div>
                <div><b>CF:</b> {selectedPractice.codiceFiscale || "—"}</div>
                <div><b>P.IVA:</b> {selectedPractice.partitaIva || "—"}</div>
                <div>
                  <b>Totale insoluto:</b>{" "}
                  {Number(selectedPractice.totaleInsoluto || 0).toLocaleString("it-IT", {
                    style: "currency",
                    currency: "EUR",
                  })}
                </div>
                <div className="opacity-60 text-xs">
                  Creato: {new Date(selectedPractice.createdAt).toLocaleString("it-IT")}
                </div>
              </div>
              <div className="mt-3">
                <div className="font-medium">Per utenza</div>
                {(selectedPractice.perUtenza || []).length === 0 ? (
                  <div className="text-sm opacity-60">—</div>
                ) : (
                  <ul className="text-sm list-disc pl-5">
                    {selectedPractice.perUtenza.map((u) => (
                      <li key={u.key}>
                        {u.key}
                        {u.comune ? ` • ${u.comune}` : ""} —{" "}
                        {Number(u.totale).toLocaleString("it-IT", { style: "currency", currency: "EUR" })}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="rounded-xl border p-3 md:col-span-2">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <label className="text-sm">Legale assegnato:</label>
                <select
                  className="px-3 py-2 rounded-lg border text-sm"
                  value={selectedPractice.lawyerId || ""}
                  onChange={(e) => updatePractice({ lawyerId: e.target.value || null })}
                >
                  <option value="">— Nessuno —</option>
                  {legali.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.cognome} {l.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <h4 className="font-medium mb-2">File allegati</h4>
                <input
                  type="file"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    const meta = files.map((f) => ({
                      name: f.name,
                      size: f.size,
                      type: f.type,
                      uploadedAt: new Date().toISOString(),
                    }));
                    appendFilesToPractice(meta);
                    e.target.value = "";
                  }}
                />
                {(selectedPractice.files || []).length === 0 ? (
                  <div className="text-sm opacity-60 mt-2">Nessun file caricato.</div>
                ) : (
                  <ul className="mt-2 text-sm space-y-1">
                    {(selectedPractice.files || []).map((f, i) => (
                      <li key={i} className="flex items-center justify-between rounded border px-2 py-1">
                        <div className="truncate">
                          {f.name}{" "}
                          <span className="opacity-60 text-xs">
                            ({Math.round((f.size || 0) / 1024)} KB) • {new Date(f.uploadedAt).toLocaleString("it-IT")}
                          </span>
                        </div>
                        <button className="px-2 py-1 text-xs rounded border" onClick={() => removeFileFromPractice(i)}>
                          Rimuovi
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Info caricamento clienti */}
      {loadingClienti && (
        <div className="text-xs opacity-60">Carico elenco clienti dal backend…</div>
      )}
    </div>
  );
}
