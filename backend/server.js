// backend/server.js
import express from "express";
import { PrismaClient } from "@prisma/client";
import cors from "cors";
import multer from "multer";
import fs from "node:fs";
import path from "node:path";

const app = express();
const prisma = new PrismaClient();
const upload = multer({ dest: "uploads/" });

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API on :${PORT}`));

app.use(cors());
app.use(express.json());

// Healthcheck
app.get("/api/health", (req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

/**
 * /api/clienti
 * - Lista clienti con utenze e riepilogo insoluti
 * - Importi in centesimi (coerenti con lo schema)
 */
app.get("/api/clienti", async (req, res) => {
  try {
    const clienti = await prisma.cliente.findMany({
      include: {
        utenze: { select: { id: true, tipo: true, codice: true } },
        fatture: {
          select: {
            id: true,
            numero: true,
            residuo: true,
            stato: true,
            utenzaId: true,
            dtScadenza: true,
          },
        },
      },
      orderBy: { nome: "asc" },
    });

    const data = clienti.map((c) => {
      const insolute = c.fatture.filter((f) => (f.residuo ?? 0) > 0);
      const totInsoluto = insolute.reduce((a, b) => a + (b.residuo || 0), 0);

      return {
        id: c.id,
        nome: c.nome,
        cfPiva: c.cfPiva,
        telefono: c.telefono,
        email: c.email,
        indirizzoFatturazione: c.indirizzoFatturazione,
        utenze: c.utenze,
        insolutiCentesimi: totInsoluto,
        fattureNonSaldateCount: insolute.length,
        fattureNonSaldate: insolute.slice(0, 10), // limita preview
      };
    });

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

/**
 * /api/insoluti?year=2025&quarter=1&scope=all|gas|power
 * - Aggrega per periodo e commodity (usa dtEmissione)
 * - Importi in centesimi
 * - Le fatture senza utenzaId sono incluse SOLO in scope=all
 */
app.get("/api/insoluti", async (req, res) => {
  try {
    const year = parseInt(String(req.query.year ?? ""), 10);
    const quarter = req.query.quarter ? parseInt(String(req.query.quarter), 10) : null;
    const scope = String(req.query.scope ?? "all").toLowerCase(); // all|gas|power

    if (!year || year < 2000 || year > 2100) {
      return res.status(400).json({ error: "INVALID_YEAR" });
    }
    if (quarter && (quarter < 1 || quarter > 4)) {
      return res.status(400).json({ error: "INVALID_QUARTER" });
    }

    let from = new Date(year, 0, 1);
    let to = new Date(year + 1, 0, 1);
    if (quarter) {
      const startMonth = (quarter - 1) * 3;
      from = new Date(year, startMonth, 1);
      to = new Date(year, startMonth + 3, 1);
    }

    const whereBase = {
      dtEmissione: { gte: from, lt: to },
    };

    // filtro scope:
    // - all: include tutto
    // - gas/power: includi solo fatture con utenza.tipo corrispondente
    const where =
      scope === "all"
        ? whereBase
        : {
            ...whereBase,
            utenza: { is: { tipo: scope } },
          };

    const fatture = await prisma.fattura.findMany({
      where,
      select: {
        importoFattura: true,
        incassato: true,
        residuo: true,
        dtEmissione: true,
        utenza: { select: { tipo: true } },
      },
    });

    const sum = (arr, key) => arr.reduce((a, b) => a + (b[key] || 0), 0);

    const fatturato = sum(fatture, "importoFattura");
    const incassato = sum(fatture, "incassato");
    const insoluto = sum(fatture, "residuo");

    // Aggregazione per mese (1..12)
    const monthBuckets = {};
    for (const f of fatture) {
      if (!f.dtEmissione) continue;
      const m = f.dtEmissione.getMonth() + 1; // 1..12
      if (!monthBuckets[m]) {
        monthBuckets[m] = {
          month: m,
          count: 0,
          fatturato: 0,
          incassato: 0,
          insoluto: 0,
        };
      }
      monthBuckets[m].count += 1;
      monthBuckets[m].fatturato += f.importoFattura || 0;
      monthBuckets[m].incassato += f.incassato || 0;
      monthBuckets[m].insoluto += f.residuo || 0;
    }

    const months = Object.values(monthBuckets).sort((a, b) => a.month - b.month);

    res.json({
      year,
      quarter: quarter ?? null,
      scope,
      fatturato,
      incassato,
      insoluto,
      months, // [{month, count, fatturato, incassato, insoluto}]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

export default app;

// Import CSV insoluti (upload singolo file)
app.post("/api/sync-import", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "File mancante" });

    const filePath = path.resolve(req.file.path);
    // Qui deleghiamo al nostro script di parsing per mantenere il server snello
    const { default: importer } = await import("./scripts/importInsoluti.cjs");
    const result = await importer(filePath);

    // pulizia file temp
    fs.unlink(filePath, () => { });

    res.json({ ok: true, ...result });
  } catch (e) {
    console.error("Errore /api/sync-import:", e);
    res.status(500).json({ error: "Import error" });
  }
});
