import React from "react";
import {
  LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, BarChart, Bar
} from "recharts";

// Aggrega per anno + mese
function prepareChartData(data) {
  const grouped = {};

  data.forEach(({ anno, mese, importo }) => {
    const key = `${anno}-${mese}`;
    grouped[key] = (grouped[key] || 0) + importo;
  });

  return Object.entries(grouped).map(([key, totale]) => {
    const [anno, mese] = key.split("-");
    return { anno, mese, totale };
  });
}

export default function InsolutiChart({ data }) {
  const chartData = prepareChartData(data);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Andamento Insoluti</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="mese" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="totale" fill="#3b82f6" name="Totale €" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
