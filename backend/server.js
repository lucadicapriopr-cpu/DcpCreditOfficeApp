// backend/server.js
import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import { fileURLToPath } from "url";
import path from "path";
import { execFile } from "child_process";

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());
app.get("/", (_req, res) => {
  res.send("✅ API online. Prova /api/clienti o POST /api/sync-import");
});

// Utility per path assoluti (ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// -----------------------------
// ENDPOINTS
// -----------------------------

// 1) Sincronizza (re-import) lanciando lo script CJS esistente
app.post("/api/sync-import", async (req, res) => {
  const startedAt = new Date().toISOString();
  const scriptPath = path.resolve(__dirname, "..", "scripts", "importInsoluti.cjs");

  execFile(process.execPath, [scriptPath], { cwd: path.resolve(__dirname, "..") }, (err, stdout, stderr) => {
    const finishedAt = new Date().toISOString();

    if (err) {
      console.error("Sync error:", err, stderr);
      return res.status(500).json({
        ok: false,
        error: err.message || "Errore durante la sincronizzazione",
        startedAt,
        finishedAt,
      });
    }

    // opzionale: prova a parse-are eventuale JSON stampato dallo script
    let parsed = null;
    try {
      // se nello script stampi JSON finale puoi estrarlo qui
      parsed = JSON.parse(stdout);
    } catch (_) {
      // va bene anche così: ritorniamo lo stdout grezzo
    }

    res.json({
      ok: true,
      startedAt,
      finishedAt,
      output: parsed || stdout, // utile per log rapidi
    });
  });
});

// 2) Clienti aggregati per Codice Fiscale / P.IVA con utenze e fatture insolute
app.get("/api/clienti", async (req, res) => {
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

    // Aggregazione per chiave fiscale (CF -> P.IVA -> nominativo)
    const map = new Map();
    for (const c of clienti) {
      const key = c.codiceFiscale || c.partitaIva || c.nominativo;
      if (!map.has(key)) {
        map.set(key, {
          key,
          nominativo: c.nominativo,
          codiceFiscale: c.codiceFiscale || null,
          partitaIva: c.partitaIva || null,
          telefono: c.telefono || null,
          email: c.email || null, // se l’hai aggiunta allo schema
          utenze: [],
          fattureNonSaldate: [],
        });
      }
      const agg = map.get(key);

      for (const u of c.utenze) {
        agg.utenze.push({
          contratto: u.contratto,
          podPdr: u.podPdr,
          comune: u.comune,
          stato: u.stato,
          descrizioneStato: u.descrizioneStato,
          dataCessazione: u.dataCessazione,
        });

        for (const f of u.fatture) {
          const inc = f.incassato || 0;
          const residuo = (f.importo || 0) - inc;
          if (residuo > 0 && f.stato !== "PAGATA") {
            agg.fattureNonSaldate.push({
              numero: f.numero,
              importo: f.importo,
              incassato: f.incassato,
              residuo,
              scadenza: f.scadenza,
              stato: f.stato,
              utenza: { contratto: u.contratto, podPdr: u.podPdr, comune: u.comune },
            });
          }
        }
      }
    }

    const result = Array.from(map.values()).sort((a, b) =>
      a.nominativo.localeCompare(b.nominativo)
    );

    res.json({ ok: true, count: result.length, clienti: result });
  } catch (err) {
    console.error("Errore /api/clienti:", err);
    res.status(500).json({ ok: false, error: err?.message || "Errore server" });
  }
});

// -----------------------------
// SERVER
// -----------------------------
const PORT = 4000;
app.listen(PORT, () => {
  console.log(`✅ Server avviato su http://localhost:${PORT}`);
});
