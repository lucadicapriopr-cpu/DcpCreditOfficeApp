Perfetto 🚀 eccoti pronto il contenuto da copiare e incollare in un nuovo file chiamato PROJECT_STATUS.md nella root del tuo progetto.

# 📌 Stato Attuale - DCP Credit Office App

## ⚙️ Stack Tecnico
- **Frontend**: React 19 + Vite + TailwindCSS + react-router-dom
- **Backend**: Node.js (Express) + Prisma + SQLite
- **DB**: SQLite (`dev.db` ignorato da git)
- **Autenticazione**: MSAL (Microsoft Azure AD), integrazione con Outlook Calendar (Graph API)
- **Script di utilità**: in `scripts/` (import insoluti, report, testQuery)
- **Gestione codice**: Git + GitHub

---

## 📂 Struttura principale



.
├── backend/
│ ├── server.js # Express API server
│ └── prisma/
│ ├── schema.prisma # Modello Prisma (Clienti, Utenze, Fatture)
│ └── dev.db # DB SQLite (ignorato da git)
├── frontend/
│ ├── index.html
│ ├── vite.config.js
│ ├── .env.example # esempio env frontend
│ └── src/
│ ├── main.jsx # entry React
│ ├── App.jsx # routing principale
│ ├── pages/ # pagine Home, Clienti, Insoluti, ecc.
│ ├── components/ # componenti UI
│ ├── msalInstance.js # configurazione MSAL
│ └── outlookCalendar.js # fetch eventi Graph
├── scripts/
│ ├── importInsoluti.cjs # importa insoluti_gas.xlsx + insoluti_power.xlsx
│ ├── reportInsoluti.cjs # stampa report da DB
│ ├── testQuery.cjs # query debug clienti/utenze/fatture
│ ├── insoluti_gas.xlsx
│ └── insoluti_power.xlsx
├── prisma/
│ ├── schema.prisma # (vecchia versione modelli, non più in uso)
│ └── migrations/ # migrazioni Prisma
├── package.json # script e dipendenze monorepo
└── README.md # guida utilizzo


---

## 🚀 Comandi principali

### Avvio in sviluppo (backend + frontend insieme)
```bash
npm run dev:full


Backend su: http://localhost:4000

Frontend su: http://localhost:5173

Reset DB + import insoluti
npm run reset:db
npm run sync

Prisma
npx prisma generate
npx prisma migrate dev --name nome_migrazione
npx prisma studio   # GUI per vedere il DB

🔐 Variabili ambiente (non committare mai)

frontend/.env (esempio in .env.example):

VITE_MSAL_CLIENT_ID=<GUID app Azure>
VITE_MSAL_TENANT_ID=<GUID tenant Azure>
VITE_MSAL_REDIRECT_URI=http://localhost:5173/auth/callback
VITE_API_BASE=/api

📝 TODO / Prossimi Step

 Pagina Clienti completa: lista, ricerca, dettagli (utenze, fatture insolute)

 Integrazione Outlook Calendar → widget nella pagina clienti

 Gestione Avvisi/Notifiche scadenze

 Pulsante Sincronizza insoluti da Excel → endpoint backend

 Preparazione build produzione (frontend servito dal backend)

 (Opzionale) Creare Dockerfile o eseguibile unico per distribuzione

🔒 Note

backend/prisma/dev.db è ignorato in git → serve import o copia manuale.

Variabili .env vanno create a mano in ogni postazione.

GitHub funge da backup e ti permette di lavorare da più PC.


---

👉 Adesso:  
1. Crea in VS Code un nuovo file `PROJECT_STATUS.md`  
2. Incolla il contenuto sopra  
3. Salva  
4. Fai commit su branch `dev`:  
   ```powershell
   git add PROJECT_STATUS.md
   git commit -m "docs: aggiunto PROJECT_STATUS con stato attuale"
   git push


Vuoi che ti preparo anche un TODO.md più snello (tipo Kanban checklist) separato dal PROJECT_STATUS.md, così tieni traccia delle attività in corso?