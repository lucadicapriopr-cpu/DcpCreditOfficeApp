import { useState } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const InsolutiPage = () => {
  const [anno, setAnno] = useState(2025);
  const [trimestre, setTrimestre] = useState(1);
  const fatturato = 1000;
  const insoluto = 200;
  const fatture = [
    { numero: '202540001234', importo: 100, cliente: 'Mario Rossi' },
    { numero: '202540001235', importo: 200, cliente: 'Vito Bianchi' },
  ];

  const chartData = {
    labels: ['Incassato', 'Insoluto'],
    datasets: [
      {
        data: [fatturato - insoluto, insoluto],
        backgroundColor: ['#4caf50', '#f44336'],
        borderWidth: 1,
      },
    ],
  };

  const handleAnnoChange = (e) => {
    setAnno(e.target.value);
  };

  const handleTrimestreChange = (e) => {
    setTrimestre(e.target.value);
  };

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold text-center">Analisi Insoluti Gas + Power</h1>
      
      {/* Selezione Anno e Trimestre */}
      <div className="flex justify-between">
        <div className="flex flex-col">
          <label htmlFor="anno" className="text-lg">Seleziona anno</label>
          <select
            id="anno"
            value={anno}
            onChange={handleAnnoChange}
            className="border rounded-md p-2 mt-1"
          >
            <option value={2025}>2025</option>
            <option value={2024}>2024</option>
          </select>
        </div>
        <div className="flex flex-col">
          <label htmlFor="trimestre" className="text-lg">Trimestre</label>
          <select
            id="trimestre"
            value={trimestre}
            onChange={handleTrimestreChange}
            className="border rounded-md p-2 mt-1"
          >
            <option value={1}>1° Trimestre</option>
            <option value={2}>2° Trimestre</option>
          </select>
        </div>
      </div>
      
      {/* Grafico */}
      <div className="flex justify-center">
        <div className="w-64 h-64">
          <Doughnut data={chartData} />
        </div>
      </div>

      {/* Fatturato e Insoluto */}
      <div className="flex justify-between">
        <div>
          <p className="text-xl">Fatturato: {fatturato} €</p>
          <p className="text-xl">Insoluto: {insoluto} €</p>
        </div>
      </div>

      {/* Tabella Fatture */}
      <div className="mt-6">
        <h2 className="text-xl font-bold">Lista Fatture</h2>
        <table className="min-w-full table-auto mt-2 border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-2 px-4 border text-left">Numero Fattura</th>
              <th className="py-2 px-4 border text-left">Importo</th>
              <th className="py-2 px-4 border text-left">Cliente</th>
            </tr>
          </thead>
          <tbody>
            {fatture.map((fattura) => (
              <tr key={fattura.numero} className="border-b">
                <td className="py-2 px-4">{fattura.numero}</td>
                <td className="py-2 px-4">{fattura.importo} €</td>
                <td className="py-2 px-4">{fattura.cliente}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totali */}
      <div className="mt-6">
        <div className="flex justify-between">
          <p className="text-lg font-semibold">Totale Fatture: {fatturato} €</p>
          <p className="text-lg font-semibold">Incassato: {fatturato - insoluto} €</p>
        </div>
      </div>
    </div>
  );
};

export default InsolutiPage;
