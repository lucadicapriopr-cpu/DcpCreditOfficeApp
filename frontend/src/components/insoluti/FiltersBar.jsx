import React from "react";

const years = [2025, 2024, 2023];
const trimestri = [
  { label: "1°", value: 1 },
  { label: "2°", value: 2 },
  { label: "3°", value: 3 },
  { label: "4°", value: 4 },
];

export default function FiltersBar({
  anno, setAnno,
  trimestre, setTrimestre,
  scope, setScope
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 items-end">
      <div className="flex flex-col">
        <label className="text-sm text-gray-600">Seleziona anno</label>
        <select
          className="rounded-lg border p-2"
          value={anno}
          onChange={(e) => setAnno(parseInt(e.target.value))}
        >
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <div className="flex flex-col">
        <label className="text-sm text-gray-600">Trimestre</label>
        <select
          className="rounded-lg border p-2"
          value={trimestre}
          onChange={(e) => setTrimestre(parseInt(e.target.value))}
        >
          {trimestri.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      <div className="flex flex-col">
        <label className="text-sm text-gray-600">Ambito</label>
        <div className="flex gap-2">
          {["all","gas","power"].map(s => (
            <button
              key={s}
              onClick={() => setScope(s)}
              className={`rounded-lg border px-3 py-2 text-sm capitalize ${
                scope===s ? "bg-black text-white" : "bg-white"
              }`}
            >
              {s === "all" ? "Gas + Power" : s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
