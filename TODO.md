# ✅ TODO - DCP Credit Office App

## 🚀 In corso
- [ ] Pagina **Clienti**: lista + ricerca + dettagli (utenze, fatture insolute)
- [ ] Integrazione **Outlook Calendar** (Graph API) dentro pagina clienti
- [ ] Avvisi / Notifiche: scadenze, insoluti, eventi urgenti
- [ ] Pulsante **Sincronizza** nel `Header` → importa insoluti da Excel

---

## 📅 Prossimi step
- [ ] Preparare **build produzione** (frontend servito da backend)
- [ ] Aggiungere script di **backup automatico** (già c’è `backup.ps1`, integrarlo nei comandi npm)
- [ ] Ottimizzare UI (grafica tabella elaborazione, dashboard)

---

## 🐞 Bug / Fix
- [ ] Verificare comportamento redirect `auth/callback` dopo cambio root Vite
- [ ] Allineare schema `backend/prisma/schema.prisma` con importInsoluti.cjs (doppia versione schema trovata in `/prisma/`)

---

## 💡 Idee
- [ ] Creare `Dockerfile` e `docker-compose.yml` per distribuzione rapida
- [ ] Valutare eseguibile `.exe` con `pkg` (con cautela su Prisma)
- [ ] Aggiungere autenticazione utenti interni (ruoli: admin, operatore)
