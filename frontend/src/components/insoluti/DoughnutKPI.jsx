import React, { useMemo } from "react";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { formatCurrency } from "../../utils/format";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function DoughnutKPI({ title="gas", fatturato=0, insoluto=0 }) {
  const incassato = Math.max(fatturato - insoluto, 0);

  const data = useMemo(() => ({
    labels: ["Incassato", "Insoluto"],
    datasets: [
      {
        data: [incassato, insoluto],
        // colori lasciati “di default” da Chart.js come da linee guida
        borderWidth: 1,
      },
    ],
  }), [incassato, insoluto]);

  return (
    <div className="rounded-2xl border p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-3xl font-extrabold">{title}</h3>
        <div className="text-right">
          <div className="text-sm text-gray-500">Fatturato</div>
          <div className="text-lg font-semibold">{formatCurrency(fatturato)}</div>
          <div className="text-sm text-gray-500">Insoluto</div>
          <div className="text-lg font-semibold">{formatCurrency(insoluto)}</div>
        </div>
      </div>
      <div className="mx-auto h-60 w-60">
        <Doughnut data={data} />
      </div>
    </div>
  );
}
