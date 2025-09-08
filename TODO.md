# ✅ TODO - DCP Credit Office App

## 🚀 In corso
- [ ] Pagina **Clienti**: lista + ricerca + dettagli (utenze, fatture insolute)
- [ ] Integrazione **Outlook Calendar** (Graph API) dentro pagina clienti
- [ ] Avvisi / Notifiche: scadenze, insoluti, eventi urgenti
- [x] Pulsante **Sincronizza** nel `Header` → importa insoluti da Excel
- [X] Nella pagina **Clienti**, nel riquadro Dati, deve comparire anche la mail e l'indirizzo di fatturazione
- [ ] Nella pagina **Clienti**, nel riquadro Fatture non saldate, deve esserci un campo "Note" con una datestamp per ogni nuova nota 
- [ ] Nella pagina **Clienti**, nella barra di ricerca, deve essere possibile filtrare anche per email e per numero di cellulare
---

## 📅 Prossimi step
- [ ] Preparare **build produzione** (frontend servito da backend)
- [ ] Aggiungere script di **backup automatico** (già c’è `backup.ps1`, integrarlo nei comandi npm)
- [ ] Ottimizzare UI (grafica tabella elaborazione, dashboard)
- [ ] Collegare il pulsante Import insoluti al codice per importare i due file

---

## 🐞 Bug / Fix
- [ ] Verificare comportamento redirect `auth/callback` dopo cambio root Vite
- [ ] Allineare schema `backend/prisma/schema.prisma` con importInsoluti.cjs (doppia versione schema trovata in `/prisma/`)

---

## 💡 Idee
- [ ] Creare `Dockerfile` e `docker-compose.yml` per distribuzione rapida
- [ ] Valutare eseguibile `.exe` con `pkg` (con cautela su Prisma)
- [ ] Aggiungere autenticazione utenti interni (ruoli: admin, operatore)        
