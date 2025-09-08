// backend/scripts/importInsoluti.cjs
// Avvia: node backend/scripts/importInsoluti.cjs <file.csv|.xlsx>

const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

/** Alias per intestazioni “di produzione” */
const HEADER_ALIASES = {
  numero_fattura: ["numero_fattura", "numero", "n_fattura", "n.fattura"],
  nominativo: ["nominativo", "fa_nmcon", "intestatario", "ragione sociale"],
  cf: ["codice fiscale", "cf"],
  piva: ["partita iva", "p.iva", "piva"],
  codiceCont: ["codice pdr", "codice pod", "codice contatore", "idutenza", "pod", "pdr", "pod/pdr"],
  tipo: ["t. contrattuale", "tipologia contrattuale", "commodity", "fornitura", "tipo"],
  importo: ["importo_fattura", "importo fattura", "totale fattura", "importo"],
  incassato: ["incassato"],
  stato: ["stato", "stato fattura"],
  dtEmissione: ["datafattura", "data fattura", "dtemissione", "data_emissione"],
  dtScadenza: ["scadenza", "dtscadenza", "data scadenza"],
  indirizzo: ["fa_indir", "indirizzo fatturazione", "indirizzo_fatturazione"],
  telefono: ["recapitotelefonico", "telefono", "cellulare"],
};

// ---------- Helpers header ----------
function normalizeHeader(h) {
  return String(h || "")
    .replace(/^\uFEFF/, "") // BOM
    .replace(/^"(.*)"$/, "$1")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function mapHeaderIndices(headerCells) {
  const normHeaders = headerCells.map(normalizeHeader);
  const indexOfAliases = (aliases) => {
    const normAliases = aliases.map(normalizeHeader);
    for (const a of normAliases) {
      const idx = normHeaders.indexOf(a);
      if (idx !== -1) return idx;
    }
    return -1;
  };
  const map = {};
  for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
    map[key] = indexOfAliases(aliases);
  }
  // Euristica per numero_fattura
  if (map.numero_fattura < 0) {
    const i = normHeaders.findIndex(
      (h) =>
        ((h.includes("fatt") || h.includes("fattura")) &&
          (h.includes("num") || h.includes("numero"))) ||
        h === "numero"
    );
    if (i !== -1) map.numero_fattura = i;
  }
  return map;
}

// prova multipli delimitatori su una riga
function splitWithDelim(line, delim) {
  return line.split(delim).map((c) => String(c).trim());
}
function candidateDelimiters() { return [";", ",", "\t", "|"]; }

// Scansiona le prime N righe per trovare la riga header migliore
function autoFindHeader(lines, maxScan = 10) {
  const nonEmptyIdx = [];
  for (let i = 0; i < Math.min(lines.length, maxScan); i++) {
    if (String(lines[i] || "").trim()) nonEmptyIdx.push(i);
  }
  let best = null;

  for (const i of nonEmptyIdx) {
    for (const d of candidateDelimiters()) {
      const cells = splitWithDelim(lines[i], d);
      const map = mapHeaderIndices(cells);
      // scoring: richiede prioritariamente numero_fattura + nominativo + (cf|piva)
      const score =
        (map.numero_fattura >= 0 ? 100 : 0) +
        (map.nominativo >= 0 ? 50 : 0) +
        (map.cf >= 0 ? 30 : 0) +
        (map.piva >= 0 ? 30 : 0) +
        (map.importo >= 0 ? 10 : 0) +
        (map.dtScadenza >= 0 ? 5 : 0);

      if (!best || score > best.score) {
        best = { index: i, delimiter: d, headerCells: cells, headerMap: map, score };
      }
      if (score >= 150 && (map.cf >= 0 || map.piva >= 0)) {
        // già eccellente → stop early
        return best;
      }
    }
  }
  return best;
}

function detectDelimiterSimple(line) {
  const sc = (line.match(/;/g) || []).length;
  const cc = (line.match(/,/g) || []).length;
  if (sc > 0 && sc >= cc) return ";";
  return ",";
}

const firstNonEmpty = (...vals) => vals.find((v) => String(v || "").trim() !== "") || "";
const clean = (s) => String(s ?? "").trim();

// ---------- Money & Date ----------
function parseMoneyIT(raw) {
  if (raw == null) return 0;
  let s = String(raw).trim();
  if (!s) return 0;
  s = s.replace(/[€\s]/g, "");
  if (s.includes(".") && s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (s.includes(",")) s = s.replace(",", ".");
  const v = Number.parseFloat(s);
  if (Number.isNaN(v)) return 0;
  return Math.round(v * 100);
}
function parseDateSmart(raw) {
  const s = String(raw || "").trim();
  if (!s) return null;
  const m1 = s.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
  if (m1) {
    const [, dd, mm, yyyy] = m1;
    return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}
function normalizeTipo(tipoRaw, codiceCont) {
  const t = String(tipoRaw || "").toLowerCase();
  if (t.includes("gas") || (codiceCont || "").toUpperCase().startsWith("ITG")) return "gas";
  if (t.includes("pow") || t.includes("ene") || t.includes("ele") || t.includes("luce")) return "power";
  const code = String(codiceCont || "").toUpperCase();
  if (code.startsWith("IT00") || code.startsWith("IT001E") || code.startsWith("POD")) return "power";
  if (code.startsWith("PDR") || code.length === 14) return "gas";
  return "power";
}

// ---------- Lettura file CSV o XLSX ----------
function readTextFromFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".xlsx" || ext === ".xls") {
    const XLSX = require("xlsx");
    const wb = XLSX.readFile(filePath);
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    // Esporta in CSV con ; come separatore (poi l’autoheader proverà anche altri delim)
    const csv = XLSX.utils.sheet_to_csv(sheet, { FS: ";", RS: "\n" });
    return csv;
  }
  // CSV normale
  return fs.readFileSync(filePath, "utf-8");
}

/** Import principale */
async function importCSV(filePath) {
  if (!fs.existsSync(filePath)) throw new Error(`File non trovato: ${filePath}`);

  const content = readTextFromFile(filePath);
  // Non filtrare subito: l’autoheader deve “vedere” anche righe vuote/descrittive
  const rawLines = content.split(/\r?\n/);

  if (rawLines.length === 0) throw new Error("File vuoto");

  // Salta eventuale riga "sep=;" (tipica dei CSV di Excel)
  const lines = rawLines.filter((l, idx) => !(idx === 0 && /^sep\s*=\s*./i.test(l.trim())));

  // Trova automaticamente la riga di header migliore
  const best = autoFindHeader(lines, 10);
  if (!best) throw new Error("Impossibile individuare l'intestazione del file");
  const { index: headerIndex, delimiter, headerCells, headerMap } = best;

  if (headerMap.numero_fattura < 0 || headerMap.nominativo < 0 || (headerMap.cf < 0 && headerMap.piva < 0)) {
    const dbg = headerCells.map(normalizeHeader);
    throw new Error(
      `Colonne mancanti nell'intestazione (riga ${headerIndex + 1}). Viste: [${dbg.join(" | ")}]`
    );
  }

  let imported = 0;
  let skipped = 0;

  // Dal primo record utile dopo l’header
  for (let lineNo = headerIndex + 1; lineNo < lines.length; lineNo++) {
    const line = lines[lineNo];
    if (!line || !String(line).trim()) continue;
    const cells = splitWithDelim(line, delimiter);

    try {
      // --- Estrazione campi ---
      const getByIdx = (idx) => (idx >= 0 ? clean(cells[idx]) : "");

      const numero_fattura = getByIdx(headerMap.numero_fattura);
      const nominativo = firstNonEmpty(getByIdx(headerMap.nominativo));
      const cf = getByIdx(headerMap.cf);
      const piva = getByIdx(headerMap.piva);
      const cfpiRaw = firstNonEmpty(cf, piva);

      const codice_contatore = firstNonEmpty(getByIdx(headerMap.codiceCont));

      const tipoContrRaw = getByIdx(headerMap.tipo);
      const TipologiaContrattuale = normalizeTipo(tipoContrRaw, codice_contatore);

      const importo_fattura = getByIdx(headerMap.importo);
      const incassato_raw = getByIdx(headerMap.incassato);
      const stato = getByIdx(headerMap.stato);
      const dtEmRaw = getByIdx(headerMap.dtEmissione);
      const dtScadRaw = getByIdx(headerMap.dtScadenza);

      const indirizzoFatt = getByIdx(headerMap.indirizzo);
      const telefono = getByIdx(headerMap.telefono);

      // Validazione minima
      if (!numero_fattura || !nominativo || !cfpiRaw) {
        skipped++;
        continue;
      }

      // Parse valori
      const importoCents = parseMoneyIT(importo_fattura);
      const incassatoCents = parseMoneyIT(incassato_raw);
      const residuoCents = Math.max(importoCents - incassatoCents, 0);
      const dtEmissione = parseDateSmart(dtEmRaw);
      const dtScadenza = parseDateSmart(dtScadRaw);

      // Normalizza CF/PIVA
      const cfpi = String(cfpiRaw).replace(/\s+/g, "").toUpperCase();

      // === Upsert Cliente (unique su cfPiva) ===
      const cliente = await prisma.cliente.upsert({
        where: { cfPiva: cfpi },
        update: {
          nome: nominativo,
          indirizzoFatturazione: indirizzoFatt || undefined,
          telefono: telefono || undefined,
        },
        create: {
          cfPiva: cfpi,
          nome: nominativo,
          indirizzoFatturazione: indirizzoFatt || undefined,
          telefono: telefono || undefined,
        },
      });

      // === Upsert Utenza (facoltativa, unique su codice) ===
      let utenza = null;
      if (codice_contatore) {
        const tipo = TipologiaContrattuale;
        utenza = await prisma.utenza.upsert({
          where: { codice: codice_contatore },
          update: { clienteId: cliente.id, tipo },
          create: { clienteId: cliente.id, tipo, codice: codice_contatore },
        });
      }

      // === Fattura: unica per (clienteId, numero) ===
      const existing = await prisma.fattura.findFirst({
        where: { numero: numero_fattura, clienteId: cliente.id },
      });

      const dataFattura = {
        clienteId: cliente.id,
        utenzaId: utenza?.id ?? null,
        numero: numero_fattura,
        importoFattura: importoCents,
        incassato: incassatoCents,
        residuo: residuoCents,
        dtEmissione: dtEmissione,
        dtScadenza: dtScadenza,
        stato: stato || null,
      };

      if (existing) {
        await prisma.fattura.update({ where: { id: existing.id }, data: dataFattura });
      } else {
        await prisma.fattura.create({ data: dataFattura });
      }

      imported++;
    } catch (err) {
      console.error(`Errore riga ${lineNo + 1}:`, err.message || err);
      skipped++;
    }
  }

  return { imported, skipped };
}

/** CLI */
(async () => {
  try {
    const argPath = process.argv[2];
    if (!argPath) {
      console.log("Uso: node backend/scripts/importInsoluti.cjs <percorso-file.csv|xlsx>");
      process.exit(1);
    }
    const filePath = path.resolve(argPath);
    const { imported, skipped } = await importCSV(filePath);
    console.log(`✅ Import completato. Importate: ${imported}, scartate: ${skipped}`);
  } catch (e) {
    console.error("❌ Import fallito:", e.message || e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
