-- CreateTable
CREATE TABLE "Cliente" (
    "idCliente" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nominativo" TEXT NOT NULL,
    "codiceFiscale" TEXT,
    "partitaIva" TEXT,
    "telefono" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Utenza" (
    "idUtenza" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "clienteId" INTEGER NOT NULL,
    "contratto" TEXT NOT NULL,
    "podPdr" TEXT NOT NULL,
    "comune" TEXT,
    "stato" TEXT,
    "descrizioneStato" TEXT,
    "dataCessazione" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Utenza_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("idCliente") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Fattura" (
    "idFattura" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "utenzaId" INTEGER NOT NULL,
    "numero" TEXT NOT NULL,
    "dataFattura" DATETIME,
    "periodo" TEXT,
    "importo" REAL NOT NULL,
    "scadenza" DATETIME,
    "stato" TEXT NOT NULL,
    "incassato" REAL,
    "dataPrimoSollecito" DATETIME,
    "importoPrimoSollecito" REAL,
    "pianoRientro" TEXT,
    "praticaPod" TEXT,
    "dataPraticaPod" DATETIME,
    "agente" TEXT,
    "esclusione" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Fattura_utenzaId_fkey" FOREIGN KEY ("utenzaId") REFERENCES "Utenza" ("idUtenza") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_codiceFiscale_key" ON "Cliente"("codiceFiscale");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_partitaIva_key" ON "Cliente"("partitaIva");

-- CreateIndex
CREATE UNIQUE INDEX "Utenza_clienteId_contratto_podPdr_key" ON "Utenza"("clienteId", "contratto", "podPdr");

-- CreateIndex
CREATE UNIQUE INDEX "Fattura_utenzaId_numero_key" ON "Fattura"("utenzaId", "numero");
