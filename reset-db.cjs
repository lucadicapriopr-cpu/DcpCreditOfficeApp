// reset-db.cjs
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function reset() {
  console.log("⚠️ Pulizia database in corso...");

  // ⚠️ ordine importante: prima Storico, poi Fattura, infine Utenza
  await prisma.storico.deleteMany();
  await prisma.fattura.deleteMany();
  await prisma.utenza.deleteMany();

  console.log("✅ Database pulito!");
}

reset()
  .catch((err) => console.error("❌ Errore reset:", err))
  .finally(async () => await prisma.$disconnect());
