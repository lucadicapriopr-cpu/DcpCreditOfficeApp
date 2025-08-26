// scripts/testQuery.cjs
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function testQuery() {
  try {
    const clienti = await prisma.cliente.findMany({
      include: {
        utenze: {
          include: {
            fatture: true,
          },
        },
      },
    });

    for (const cliente of clienti) {
      console.log(
        `\n👤 Cliente: ${cliente.nominativo} (${cliente.codiceFiscale || cliente.partitaIva || "senza codice"})`
      );
      console.log(`   📞 Telefono: ${cliente.telefono || "n/d"}`);

      for (const utenza of cliente.utenze) {
        console.log(
          `   🔌 Contratto: ${utenza.contratto} | POD/PDR: ${utenza.podPdr || "non disponibile"}`
        );
        console.log(
          `      📍 Comune: ${utenza.comune || "n/d"} | Stato: ${utenza.stato || "n/d"} | Descrizione: ${utenza.descrizioneStato || "n/d"} | Data cessazione: ${
            utenza.dataCessazione ? utenza.dataCessazione.toLocaleDateString("it-IT") : "n/d"
          }`
        );

        for (const fattura of utenza.fatture) {
          const incassato = fattura.incassato || 0;
          const insoluto = (fattura.importo || 0) - incassato;

          console.log(
            `      🧾 Fattura: ${fattura.numero}
         📅 Data: ${fattura.dataFattura ? fattura.dataFattura.toLocaleDateString("it-IT") : "n/d"}
         📆 Periodo: ${fattura.periodo || "n/d"}
         💰 Importo: €${fattura.importo} | Incassato: €${incassato} | Insoluto: €${insoluto}
         ⏳ Scadenza: ${fattura.scadenza ? fattura.scadenza.toLocaleDateString("it-IT") : "n/d"}
         📌 Stato: ${fattura.stato}
         📬 Primo sollecito: ${fattura.dataPrimoSollecito ? fattura.dataPrimoSollecito.toLocaleDateString("it-IT") : "n/d"} | Importo sollecito: €${fattura.importoPrimoSollecito || 0}
         📝 Piano rientro: ${fattura.pianoRientro || "n/d"}
         📑 Pratica POD: ${fattura.praticaPod || "n/d"} | Data pratica: ${fattura.dataPraticaPod ? fattura.dataPraticaPod.toLocaleDateString("it-IT") : "n/d"}
         🧑‍💼 Agente: ${fattura.agente || "n/d"}
         🚫 Esclusione: ${fattura.esclusione ? "SI" : "NO"}`
          );
        }
      }
    }
  } catch (err) {
    console.error("❌ Errore nella query:", err);
  } finally {
    await prisma.$disconnect();
  }
}

testQuery();
