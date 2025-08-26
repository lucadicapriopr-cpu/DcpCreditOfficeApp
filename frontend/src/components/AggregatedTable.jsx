import React from "react";

// Funzione per aggregare i dati
function groupBy(array, key) {
  return array.reduce((result, item) => {
    (result[item[key]] = result[item[key]] || []).push(item);
    return result;
  }, {});
}

export default function AggregatedTable({ data }) {
  const anni = groupBy(data, "anno");

  return (
    <div className="bg-white shadow rounded-2xl p-6">
      {Object.keys(anni).map((anno) => {
        const mesi = groupBy(anni[anno], "mese");
        const totaleAnno = anni[anno].reduce((sum, i) => sum + i.importo, 0);

        return (
          <div key={anno} className="mb-8">
            <h2 className="text-xl font-bold text-blue-700 mb-2">
              Anno {anno} - Totale € {totaleAnno}
            </h2>

            {Object.keys(mesi).map((mese) => {
              const clienti = groupBy(mesi[mese], "cliente");
              const totaleMese = mesi[mese].reduce((sum, i) => sum + i.importo, 0);

              return (
                <div key={mese} className="ml-6 mb-4">
                  <h3 className="text-lg font-semibold text-gray-700">
                    {mese} - Totale € {totaleMese}
                  </h3>

                  {Object.keys(clienti).map((cliente) => {
                    const contratti = clienti[cliente];
                    const totaleCliente = contratti.reduce((sum, i) => sum + i.importo, 0);

                    return (
                      <div key={cliente} className="ml-6 mb-2">
                        <h4 className="font-medium text-gray-600">
                          {cliente} - Totale € {totaleCliente}
                        </h4>
                        <table className="w-full text-sm border-collapse ml-6">
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="border p-2 text-left">Contratto</th>
                              <th className="border p-2 text-right">Importo (€)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {contratti.map((c) => (
                              <tr key={c.contratto}>
                                <td className="border p-2">{c.contratto}</td>
                                <td className="border p-2 text-right">{c.importo}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
