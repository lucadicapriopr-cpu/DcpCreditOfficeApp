// import.cjs
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function importXlsx(filePath) {
  console.log(`📂 Importo file: ${filePath}`);

  // Legge il file Excel
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });

  console.log(`➡️ Righe lette: ${rows.length}`);

  for (const row of rows) {
    try {
      // 📌 IdUtenza = chiave primaria
      const idUtenza = row["IdUtenza"] || row["__EMPTY_11"];
      if (!idUtenza) {
        console.warn(`⚠️ Riga senza IdUtenza, salto creazione utenza → fattura ${row["__EMPTY"]}`);
        continue;
      }

      // 📌 Numero fattura e stato
      const numeroFattura =
        row["Elaborazione Insoluti,fatture emesse dal 2024 al 2024 con incassi fino al 2024-12-31"];
      const stato = (row["__EMPTY_8"] || "").toUpperCase();
      const importoTotale = parseFloat(row["__EMPTY_6"]) || 0;
      const importoResiduo = parseFloat(row["__EMPTY_16"]) || 0;

      // 📌 Creiamo/aggiorniamo l'utenza
      await prisma.utenza.upsert({
        where: { idUtenza: String(idUtenza) },
        update: {
          nominativo: row["__EMPTY_4"] || null,
          indirizzo: row["__EMPTY_3"] || null,
          comune: row["__EMPTY_10"] || null,
          agente: row["__EMPTY_17"] || null,
          stato: row["__EMPTY_14"] || null,
        },
        create: {
          idUtenza: String(idUtenza),
          nominativo: row["__EMPTY_4"] || null,
          indirizzo: row["__EMPTY_3"] || null,
          comune: row["__EMPTY_10"] || null,
          agente: row["__EMPTY_17"] || null,
          stato: row["__EMPTY_14"] || null,
        },
      });

      // 📌 Creiamo la fattura collegata a quell'utenza
      await prisma.fattura.create({
        data: {
          numeroFattura,
          stato,
          importoTotale,
          importoResiduo,
          utenza: {
            connect: { idUtenza: String(idUtenza) },
          },
          storico: {
            create: [{}],
          },
        },
      });

      console.log(`➕ Creata fattura ${numeroFattura} per utenza ${idUtenza}`);
    } catch (err) {
      console.error(`❌ Errore riga:`, row, err.message);
    }
  }

  console.log("🎯 Import completato!");
}

// 🚀 Avvio script da CLI
const inputFile = process.argv[2];
if (!inputFile) {
  console.error("❌ Devi passare il percorso del file Excel");
  process.exit(1);
}

const absPath = path.resolve(inputFile);
importXlsx(absPath)
  .catch((err) => console.error("❌ Errore import generale:", err))
  .finally(async () => await prisma.$disconnect());
