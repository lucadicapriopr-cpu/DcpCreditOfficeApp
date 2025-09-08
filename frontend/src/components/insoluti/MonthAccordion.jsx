import React, { useState } from "react";
import { formatCurrency } from "../../utils/format";

export default function MonthAccordion({ monthBlock }) {
  const [open, setOpen] = useState(true);
  const { month, invoices } = monthBlock;

  return (
    <div className="rounded-xl border">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3"
      >
        <div className="flex items-center gap-3">
          <span className="font-semibold">{month.toUpperCase()}</span>
          <span className="text-xs rounded bg-gray-100 px-2 py-0.5">
            {invoices.length} fatture
          </span>
        </div>
        <span className="text-sm text-gray-500">{open ? "–" : "+"}</span>
      </button>

      {open && (
        <div className="px-4 pb-4">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-2">Numero</th>
                <th className="text-left p-2">Cliente</th>
                <th className="text-left p-2">Data</th>
                <th className="text-right p-2">Importo</th>
                <th className="text-right p-2">Insoluto</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((f) => (
                <tr key={f.numero} className="border-t">
                  <td className="p-2">{f.numero}</td>
                  <td className="p-2">{f.cliente}</td>
                  <td className="p-2">{f.data}</td>
                  <td className="p-2 text-right">{formatCurrency(f.importo)}</td>
                  <td className="p-2 text-right">{formatCurrency(f.insoluto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
