import React from "react";
import useInsolutiData from "../hooks/useInsolutiData";
import { centsToEUR } from "../utils/money";

export default function Insoluti() {
  const { anno, setAnno, trimestre, setTrimestre, scope, setScope, data, loading, error } = useInsolutiData();

  const years = [2023, 2024, 2025, 2026];
  const scopes = ["all", "gas", "power"];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Analisi Insoluti</h1>

      {/* Filtri */}
      <div className="flex gap-3 items-end flex-wrap">
        <label className="flex flex-col">
          <span className="text-sm">Anno</span>
          <select className="border rounded p-2" value={anno} onChange={e => setAnno(Number(e.target.value))}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </label>

        <label className="flex flex-col">
          <span className="text-sm">Trimestre</span>
          <select className="border rounded p-2" value={trimestre ?? ""} onChange={e => setTrimestre(e.target.value ? Number(e.target.value) : null)}>
            <option value="">Tutti</option>
            <option value="1">Q1</option>
            <option value="2">Q2</option>
            <option value="3">Q3</option>
            <option value="4">Q4</option>
          </select>
        </label>

        <label className="flex flex-col">
          <span className="text-sm">Scope</span>
          <select className="border rounded p-2" value={scope} onChange={e => setScope(e.target.value)}>
            {scopes.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
          </select>
        </label>
      </div>

      {/* Stato */}
      {loading && <div className="text-gray-600">Caricamento…</div>}
      {error && <div className="text-red-600">Errore: {String(error.message || error)}</div>}

      {/* KPI */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border p-4">
            <div className="text-sm text-gray-500">Fatturato</div>
            <div className="text-2xl font-semibold">{centsToEUR(data.fatturato)}</div>
          </div>
          <div className="rounded-xl border p-4">
            <div className="text-sm text-gray-500">Incassato</div>
            <div className="text-2xl font-semibold">{centsToEUR(data.incassato)}</div>
          </div>
          <div className="rounded-xl border p-4">
            <div className="text-sm text-gray-500">Insoluto</div>
            <div className="text-2xl font-semibold">{centsToEUR(data.insoluto)}</div>
          </div>
        </div>
      )}

      {/* Tabella mesi */}
      {data && (
        <div className="overflow-auto rounded-xl border">
          <table className="min-w-[700px] w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3">Mese</th>
                <th className="text-right p-3">N° Fatture</th>
                <th className="text-right p-3">Fatturato</th>
                <th className="text-right p-3">Incassato</th>
                <th className="text-right p-3">Insoluto</th>
              </tr>
            </thead>
            <tbody>
              {data.months?.map(m => (
                <tr key={m.month} className="odd:bg-white even:bg-gray-50">
                  <td className="p-3">{m.month.toString().padStart(2, "0")}/{data.year}</td>
                  <td className="p-3 text-right">{m.count}</td>
                  <td className="p-3 text-right">{centsToEUR(m.fatturato)}</td>
                  <td className="p-3 text-right">{centsToEUR(m.incassato)}</td>
                  <td className="p-3 text-right">{centsToEUR(m.insoluto)}</td>
                </tr>
              ))}
              {(!data.months || data.months.length === 0) && (
                <tr><td className="p-3 text-gray-500" colSpan={5}>Nessun dato per i filtri selezionati.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
