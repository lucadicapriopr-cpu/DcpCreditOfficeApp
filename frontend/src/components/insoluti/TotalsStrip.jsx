import React from "react";
import { formatCurrency } from "../../utils/format";

export default function TotalsStrip({ totaleFatture=0, incassato=0 }) {
  return (
    <div className="rounded-2xl border p-4 grid gap-3 sm:grid-cols-2">
      <div className="flex items-center justify-between">
        <span className="font-semibold">Totale Fatture</span>
        <span className="text-lg">{formatCurrency(totaleFatture)}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="font-semibold">Incassato</span>
        <span className="text-lg">{formatCurrency(incassato)}</span>
      </div>
    </div>
  );
}
