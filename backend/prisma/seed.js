import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    // Cliente demo
    const mario = await prisma.cliente.upsert({
        where: { cfPiva: "RSSMRA80A01H501Z" },
        update: {},
        create: {
            nome: "Mario Rossi",
            cfPiva: "RSSMRA80A01H501Z",
            telefono: "3331234567",
            email: "mario.rossi@example.com",
            indirizzoFatturazione: "Via Roma 1, 20100 Milano",
        },
    });

    const utenza = await prisma.utenza.create({
        data: {
            clienteId: mario.id,
            tipo: "gas",
            codice: "PDR1234567890",
            indirizzo: "Via Gasometro 12",
            comune: "Milano",
            provincia: "MI",
            cap: "20100",
            statoUtenza: "ATTIVA",
        },
    });

    await prisma.fattura.create({
        data: {
            numero: "FAT2025-0001",
            clienteId: mario.id,
            utenzaId: utenza.id,
            importoFattura: 15050, // 150,50 €
            incassato: 0,
            residuo: 15050,
            dtEmissione: new Date("2025-05-10"),
            dtScadenza: new Date("2025-06-10"),
            stato: "NON_PAGATA"
        }
    });


    console.log("Seed completato ✅");
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
