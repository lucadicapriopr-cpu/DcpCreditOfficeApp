// scripts/reportInsoluti.cjs
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function reportInsoluti() {
  try {
    const clienti = await prisma.cliente.count();
    const utenze = await prisma.utenza.count();
    const fatture = await prisma.fattura.findMany();

    let totaleImporto = 0;
    let totaleIncassato = 0;

    for (const f of fatture) {
      totaleImporto += f.importo || 0;
      totaleIncassato += f.incassato || 0;
    }

    const totaleInsoluto = totaleImporto - totaleIncassato;

    console.log("\n📊 REPORT INSOLUTI ATTUALI");
    console.log(`👤 Clienti totali: ${clienti}`);
    console.log(`🔌 Utenze totali: ${utenze}`);
    console.log(`🧾 Fatture totali: ${fatture.length}`);
    console.log(`💰 Totale importo fatture: €${totaleImporto.toFixed(2)}`);
    console.log(`✅ Totale incassato: €${totaleIncassato.toFixed(2)}`);
    console.log(`❌ Totale insoluti: €${totaleInsoluto.toFixed(2)}`);
  } catch (err) {
    console.error("❌ Errore nel report:", err);
  } finally {
    await prisma.$disconnect();
  }
}

reportInsoluti();
