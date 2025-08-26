import * as XLSX from "xlsx";
import { PrismaClient } from "@prisma/client";
import path from "path";

const prisma = new PrismaClient();

async function importXlsx(filePath) {
  console.log("📂 Importo file:", filePath);

  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });

  console.log("➡️ Righe lette (totali):", rows.length);

  for (const [i, row] of rows.entries()) {
    if (i === 0) continue; // skip intestazione

    try {
      const numeroFattura = String(
        row["numero_fattura"] ||
          row["Elaborazione Insoluti,fatture emesse dal 2024 al 2024 con incassi fino al 2024-12-31"]
      ).trim();

      if (!numeroFattura) continue;

      // Importi
      const importo = parseFloat(
        (row["importo_fattura"] || row["_6"] || "0").toString().replace(",", ".")
      );
      const incassato = parseFloat(
        (row["Incassato"] || row["_16"] || "0").toString().replace(",", ".")
      );
      const residuo = Math.max(importo - incassato, 0);

      // Data fattura
      let dataFattura = null;
      if (row["DataFattura"]) {
        if (!isNaN(row["DataFattura"])) {
          const parsed = XLSX.SSF.parse_date_code(row["DataFattura"]);
          if (parsed) {
            dataFattura = new Date(parsed.y, parsed.m - 1, parsed.d);
          }
        } else {
          dataFattura = new Date(row["DataFattura"]);
        }
      }

      const codicePdp = row["Codice POD"] || row["Codice PDP"] || row["_7"];

      // 🔑 Se non esiste utenza → la creo
      let utenza = await prisma.utenza.findUnique({
        where: { codicePdp },
      });

      if (!utenza) {
        utenza = await prisma.utenza.create({
          data: {
            codicePdp,
            intestatario: row["_4"] || null,
            indirizzo: row["_3"] || null,
            tipo: row["_5"] || null,
          },
        });
        console.log(`🏠 Creata nuova utenza ${codicePdp} (${utenza.intestatario})`);
      }

      // Cerca fattura
      let existing = await prisma.fattura.findUnique({
        where: { numeroFattura },
      });

      if (!existing) {
        let stato = residuo === 0 ? "PAGATA" : residuo < importo ? "PARZIALMENTE" : "INSOLUTA";

        const nuova = await prisma.fattura.create({
          data: {
            numeroFattura,
            dataFattura,
            importoTotale: importo,
            importoResiduo: residuo,
            stato,
            utenzaCodicePdp: codicePdp,
          },
        });

        await prisma.fatturaStorico.create({
          data: {
            fatturaId: nuova.id,
            stato,
            importo: residuo,
          },
        });

        console.log(`➕ Creata fattura ${numeroFattura} (stato=${stato}, residuo=${residuo})`);
      } else {
        let nuovoStato = "INSOLUTA";
        if (residuo === 0) nuovoStato = "PAGATA";
        else if (residuo < importo) nuovoStato = "PARZIALMENTE";

        await prisma.fattura.update({
          where: { numeroFattura },
          data: {
            importoResiduo: residuo,
            stato: nuovoStato,
          },
        });

        await prisma.fatturaStorico.create({
          data: {
            fatturaId: existing.id,
            stato: nuovoStato,
            importo: residuo,
          },
        });

        console.log(`🔄 Aggiornata fattura ${numeroFattura} → stato=${nuovoStato}, residuo=${residuo}`);
      }
    } catch (err) {
      console.error("❌ Errore riga:", row, err.message);
    }
  }

  // 🔍 Fatture nel DB ma non più nel file → segna PAGATE
  const numeriNelFile = rows.slice(1).map((r) =>
    String(
      r["numero_fattura"] ||
        r["Elaborazione Insoluti,fatture emesse dal 2024 al 2024 con incassi fino al 2024-12-31"] ||
        ""
    ).trim()
  );

  const tutteFatture = await prisma.fattura.findMany();

  for (let f of tutteFatture) {
    if (!numeriNelFile.includes(f.numeroFattura) && f.stato !== "PAGATA") {
      await prisma.fattura.update({
        where: { id: f.id },
        data: { stato: "PAGATA", importoResiduo: 0 },
      });

      await prisma.fatturaStorico.create({
        data: {
          fatturaId: f.id,
          stato: "PAGATA",
          importo: 0,
        },
      });

      console.log(`✅ Segnata PAGATA fattura ${f.numeroFattura} (non più nel file)`);
    }
  }

  console.log("🎯 Import completato con successo!");
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("❌ Specifica il file da importare");
  process.exit(1);
}

const filePath = path.resolve(args[0]);
importXlsx(filePath)
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
