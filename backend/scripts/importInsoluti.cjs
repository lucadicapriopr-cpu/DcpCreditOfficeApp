// backend/scripts/importInsoluti.cjs
// Avvia: node backend/scripts/importInsoluti.cjs <file.csv|.xlsx>

const fs = require("fs");
const path = require("path");
const { PrismaClient, Prisma } = require("@prisma/client");

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
  periodo: ["periodo fatturazione", "periodo", "periodo_fatturazione"],
  indirizzo: ["fa_indir", "indirizzo fatturazione", "indirizzo_fatturazione"],
  telefono: ["recapitotelefonico", "telefono", "cellulare"],
  comune: ["comune"],
  esclusione: ["esclusionecontrattodaelab.", "esclusione contratto da elab.", "esclusione"],
  sollecitoData: ["data primo sollecito ancora aperto", "data primo sollecito"],
  sollecitoImporto: ["importo data primo sollecito ancora", "importo sollecito"],
  pianoRientro: ["piano di rientro o rateizzazione", "piano di rientro", "rateizzazione"],
  praticaRef: ["pratica pod", "pratica pdr", "pratica"],
  praticaData: ["data pratica pod", "data pratica pdr", "data pratica"],
  statoUtenza: ["stato_utenza"],
  desStatoUtenza: ["desstato_utenza"],
  dataCessazione: ["data_cessazione", "data cessazione"],
  agente: ["agente"],
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
      // scoring: prioritizza numero_fattura + nominativo + (cf|piva)
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
        return best; // ottimo → stop early
      }
    }
  }
  return best;
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
  return Math.round(v * 100); // cents
}
function toDecimalFromCents(cents) {
  return new Prisma.Decimal((Number(cents) / 100).toFixed(2));
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
  if (t.includes("gas") || (codiceCont || "").toUpperCase().startsWith("ITG")) return "GAS";
  if (t.includes("pow") || t.includes("ene") || t.includes("ele") || t.includes("luce")) return "POWER";
  const code = String(codiceCont || "").toUpperCase();
  if (code.startsWith("IT00") || code.startsWith("IT001E") || code.startsWith("POD")) return "POWER";
  if (code.startsWith("PDR") || code.length === 14) return "GAS";
  return "POWER";
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
  return fs.readFileSync(filePath, "utf-8"); // CSV normale
}

// ---------- Cliente helpers ----------
async function findOrCreateCliente({ nominativo, cf, piva, indirizzoFatturazione, telefono, comune }) {
  const cfNorm = (cf || "").replace(/\s+/g, "").toUpperCase();
  const pivaNorm = (piva || "").replace(/\s+/g, "").toUpperCase();

  let cliente = null;

  if (cfNorm || pivaNorm) {
    cliente = await prisma.cliente.findFirst({
      where: {
        OR: [
          cfNorm ? { codiceFiscale: cfNorm } : undefined,
          pivaNorm ? { partitaIva: pivaNorm } : undefined,
        ].filter(Boolean),
      },
    });
  }

  if (cliente) {
    // aggiorna solo se arrivano valori non vuoti
    cliente = await prisma.cliente.update({
      where: { id: cliente.id },
      data: {
        nome: nominativo || cliente.nome,
        codiceFiscale: cfNorm || cliente.codiceFiscale,
        partitaIva: pivaNorm || cliente.partitaIva,
        indirizzoFatturazione: indirizzoFatturazione || cliente.indirizzoFatturazione,
        telefono: telefono || cliente.telefono,
        comune: comune || cliente.comune,
      },
    });
  } else {
    cliente = await prisma.cliente.create({
      data: {
        nome: nominativo || "Senza Nome",
        codiceFiscale: cfNorm || null,
        partitaIva: pivaNorm || null,
        indirizzoFatturazione: indirizzoFatturazione || null,
        telefono: telefono || null,
        comune: comune || null,
      },
    });
  }

  return cliente;
}

// ---------- Import principale ----------
async function importCSV(filePath) {
  if (!fs.existsSync(filePath)) throw new Error(`File non trovato: ${filePath}`);

  const content = readTextFromFile(filePath);
  const rawLines = content.split(/\r?\n/);
  if (rawLines.length === 0) throw new Error("File vuoto");

  // Salta eventuale riga "sep=;"
  const lines = rawLines.filter((l, idx) => !(idx === 0 && /^sep\s*=\s*./i.test(l.trim())));

  // Individua automaticamente la riga di header
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

  for (let lineNo = headerIndex + 1; lineNo < lines.length; lineNo++) {
    const line = lines[lineNo];
    if (!line || !String(line).trim()) continue;
    const cells = splitWithDelim(line, delimiter);

    try {
      const getByIdx = (idx) => (idx >= 0 ? clean(cells[idx]) : "");

      // --- Estrazione campi ---
      const numero_fattura = getByIdx(headerMap.numero_fattura);
      const nominativo = firstNonEmpty(getByIdx(headerMap.nominativo));
      const cf = getByIdx(headerMap.cf);
      const piva = getByIdx(headerMap.piva);
      const codice_contatore = firstNonEmpty(getByIdx(headerMap.codiceCont));
      const tipoContrRaw = getByIdx(headerMap.tipo);
      const tipoUtenza = normalizeTipo(tipoContrRaw, codice_contatore); // "GAS" | "POWER"

      const importo_raw = getByIdx(headerMap.importo);
      const incassato_raw = getByIdx(headerMap.incassato);
      const stato = getByIdx(headerMap.stato);
      const dtEmRaw = getByIdx(headerMap.dtEmissione);
      const dtScadRaw = getByIdx(headerMap.dtScadenza);
      const periodo = getByIdx(headerMap.periodo);

      const indirizzoFatt = getByIdx(headerMap.indirizzo);
      const telefono = getByIdx(headerMap.telefono);
      const comune = getByIdx(headerMap.comune);

      const esclusione = getByIdx(headerMap.esclusione);
      if (esclusione && ["si", "sì", "1", "y", "true"].includes(esclusione.toLowerCase())) {
        skipped++;
        continue; // scarta righe escluse dall’elaborazione
      }

      // Validazione minima
      if (!numero_fattura || !nominativo || (!cf && !piva)) {
        skipped++;
        continue;
      }

      // Parse valori
      const importoCents = parseMoneyIT(importo_raw);
      const incassatoCents = parseMoneyIT(incassato_raw);
      const dataFattura = parseDateSmart(dtEmRaw);
      const scadenza = parseDateSmart(dtScadRaw);

      // === Cliente ===
      const cliente = await findOrCreateCliente({
        nominativo,
        cf,
        piva,
        indirizzoFatturazione: indirizzoFatt,
        telefono,
        comune,
      });

      // === Utenza (facoltativa) ===
      let utenza = null;
      if (codice_contatore) {
        const tipo = tipoUtenza; // "GAS" | "POWER" (enum)
        utenza = await prisma.utenza.upsert({
          where: { codice: codice_contatore },
          update: { clienteId: cliente.id, tipo },
          create: { clienteId: cliente.id, tipo, codice: codice_contatore },
        });
      }

      // === Fattura: upsert su chiave composta (clienteId, numero) ===
      const whereUnique = { clienteId_numero: { clienteId: cliente.id, numero: numero_fattura } };
      const dataFatt = {
        clienteId: cliente.id,
        utenzaId: utenza?.id ?? null,
        numero: numero_fattura,
        dataFattura: dataFattura,
        scadenza: scadenza,
        periodo: periodo || null,
        importo: toDecimalFromCents(importoCents),
        incassato: incassatoCents ? toDecimalFromCents(incassatoCents) : null,
        stato: stato || null,
      };

      await prisma.fattura.upsert({
        where: whereUnique,
        update: dataFatt,
        create: dataFatt,
      });

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
