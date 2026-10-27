# Roadmap: cosa manca per stare sul mercato

Nasce dal confronto del 27/10/2026 con Playtomic, i gestionali internazionali
(Matchpoint, MATCHi, Playbypoint, CourtReserve, Padel Mates, TieSports,
Resasports) e quelli italiani (Wansport, AssoFacile, GeSoSport, Golee,
Anytimes, PallaGialla, TeamSystem Sportivi in Cloud). Le fonti sono in fondo.

Si lavora a round: ogni round ha un obiettivo e si chiude quando tutte le sue
caselle sono spuntate. Dentro un round l'ordine delle voci è quello consigliato.
Quando una funzione arriva in produzione, va aggiornato anche il listino del
sito (`apps/vetro/lib/plans.ts`, togliendo `soon` o aggiungendo la riga).

## Dove vogliamo stare

Non inseguiamo Playtomic sulla rete di giocatori: è il loro vantaggio vero e
non si recupera. Vogliamo essere **il gestionale del club**: il club tiene i
suoi clienti, gli parla su WhatsApp, non paga commissioni ed è in regola con
il fisco italiano. Nessuno oggi tiene insieme l'app moderna per i giocatori e
la parte fiscale e associativa italiana.

## Cosa abbiamo già, e gli altri no

Da non perdere per strada mentre si aggiunge il resto, e da raccontare nel sito.

- WhatsApp integrato: conferme, inviti alle partite aperte, comunicazioni.
  Playtomic, Wansport e Matchpoint non lo hanno.
- Comunicazioni agli iscritti. Playtomic non permette ai club di scrivere in
  massa ai propri clienti.
- Avviso dei giorni ancora vuoti e promemoria prima delle partite.
- Campo scelto in automatico per tenere la giornata compatta.
- Punti, premi e inviti degli amici.
- Meteo al club e chiusure per pioggia.
- Privacy fatta bene: cancellazione dell'account, dati che scadono da soli.
- Prezzo pubblico, basso, senza commissioni e senza vincoli.
- Sincronizzazione con il calendario di SumUp e con Google Calendar.

---

## Round 0: vendibile a un secondo club

Obiettivo: un club nuovo si iscrive, si configura e lavora senza toccare i dati
di Padel Sport. Senza questo round il resto non si vende.

- [ ] **Multi-club nel backend**, con lo staff legato all'organizzazione
      Clerk del club. Piano e checklist in [multi-club.md](multi-club.md).
- [ ] **Account unico fra più club.** Dopo la migrazione: le schede dello
      stesso giocatore in club diversi collegate per `clerkUserId`.
- [ ] **Sito e app per club.** Il sito delle prenotazioni e l'app mobile
      devono sapere di quale club sono (sottodominio o slug nel percorso).
- [ ] **Iscrizione e configurazione guidata.** Dalla richiesta demo
      (`apps/vetro`) al club funzionante: campi, orari, listino, staff,
      WhatsApp e SumUp, in pochi passi.
- [ ] **Abbonamento del club.** Prova di 30 giorni, piani Essenziale e
      Completo, limiti di clienti e staff applicati davvero, pagamento mensile.
- [ ] **Limite dello staff nell'Essenziale.** Oggi è una persona sola: anche
      un club piccolo ne ha almeno due al bancone. Valutare 2 o 3.

Fatto quando: un secondo club di prova lavora una settimana in produzione e
Padel Sport non se ne accorge.

## Round 1: prenotazioni al livello del mercato

Obiettivo: chi arriva da Playtomic non trova niente in meno quando prenota.

- [ ] **Conferma immediata, a scelta del club.** Oggi ogni prenotazione online
      nasce `pending_on_site_payment` e aspetta lo staff
      (`bookings/update.ts`). Interruttore nelle impostazioni: conferma
      immediata, o solo per i tesserati, o sempre manuale come oggi.
- [ ] **Prenotazioni fisse.** «Il martedì alle 19» per tutta la stagione: in
      Italia sono una parte grossa dell'agenda.
  - [ ] Creazione dallo staff, con data di fine o numero di settimane.
  - [ ] Salto delle settimane chiuse o già occupate, con avviso.
  - [ ] Disdetta di una sola data o di tutta la serie.
- [ ] **Prezzi per fascia oraria e per giorno.** Oggi `services` ha un prezzo
      per servizio, uguale a tutte le ore (`modules/pricing/lib.ts`). Fasce
      (punta, morbida, weekend) e prezzo per i tesserati per fascia.
- [ ] **Regole di cancellazione.** Fino a quante ore prima si disdice
      gratis, cosa succede dopo, e penale per chi non si presenta.
- [ ] **Lista d'attesa.** Chi trova pieno si mette in coda e riceve un
      WhatsApp quando un campo si libera.

Fatto quando: un giocatore prenota, paga e riceve la conferma senza che lo
staff tocchi niente, e le fisse della stagione sono in agenda.

## Round 2: pagamenti e incassi

Obiettivo: i soldi passano dal gestionale, non dal foglio.

- [ ] **Pagamento diviso.** Ognuno dei quattro paga la sua parte online. Le
      partite aperte sono il caso principale (`modules/openMatches`).
      Oggi `modules/payments` incassa una prenotazione intera.
- [ ] **Carnet e abbonamenti.** 10 partite, mensile serale, pacchetto
      lezioni: si comprano, si scalano a ogni prenotazione, scadono.
- [ ] **Borsellino del club.** Credito prepagato valido solo nel club.
      Attenzione al lamento ricorrente su Wansport: il credito non deve
      restare bloccato quando si prenota.
- [ ] **Satispay.** Nessun concorrente lo offre, ed è diffusissimo in Italia.
- [ ] **Report incassi e occupazione.** Per giorno, settimana e mese: ore
      vendute, incassato online e in struttura, campi più e meno pieni.

Fatto quando: a fine mese il club legge dal gestionale quanto ha incassato e
come, senza fare conti a mano.

## Round 3: scuola e tornei

Obiettivo: le attività del club oltre all'affitto dei campi.

- [ ] **Lezioni e maestri.**
  - [ ] Schede dei maestri, con disponibilità e prezzo.
  - [ ] Lezioni private e corsi a gruppi, con iscrizioni e posti.
  - [ ] Agenda del maestro (vista dedicata, anche da telefono).
- [ ] **Tornei dal gestionale.** Il backend dei tornei a gironi c'è già
      (`modules/tournaments`: categorie, gironi, squadre, partite,
      avanzamenti): serviva il tabellone dal vivo del Trofeo San Sebastiano
      (`/tournament`, ora tolto). Oggi nessuna app lo usa, e nel gestionale
      non ha una pagina.
  - [ ] Pagina tornei nel gestionale: creazione, iscrizioni, gironi.
  - [ ] Formati veloci: Americano, Mexicano, King of the Court, con
        accoppiamenti automatici.
  - [ ] Risultati e classifica dal vivo (Playtomic non ce l'ha ancora).
- [ ] **Campionati** del club a divisioni, su più settimane.

Fatto quando: il club organizza un Americano del venerdì e un corso per
principianti interamente dal gestionale.

## Round 4: in regola in Italia

Obiettivo: il vantaggio che nessuno ha. **Prima di iniziare, sentire un
commercialista** che segue ASD/SSD: le regole cambiano secondo la forma del
club (ASD, SSD, società commerciale) e secondo chi paga (socio o no).

- [ ] **Certificato medico.**
  - [ ] Caricamento (staff o giocatore), data di scadenza, semaforo.
  - [ ] Avviso al giocatore 30 giorni prima, su WhatsApp.
  - [ ] Opzione del club: niente prenotazione con certificato scaduto.
- [ ] **Tesseramento.** Ente (FITP, CSEN, ASI, OPES…), numero di tessera,
      scadenza, assicurazione. Partire dall'inserimento a mano e
      dall'importazione dei file degli enti; il collegamento diretto con
      i loro sistemi non lo fa nessuno, va verificato se è possibile.
- [ ] **Soci e non soci.** Gli incassi dai soci e quelli dagli esterni
      vanno tenuti separati, perché fiscalmente non sono la stessa cosa.
      Si appoggia alle tessere annuali che ci sono già (`tables/memberships.ts`).
- [ ] **Documento fiscale.** Da definire col commercialista:
  - [ ] Fattura elettronica SDI per chi la chiede (tramite un intermediario,
        non in casa).
  - [ ] Scontrino o corrispettivo per i pagamenti online degli esterni.
  - [ ] Collegamento POS e registratore telematico, obbligatorio dal
        1/1/2026 per chi non è esente.
- [ ] **Libro soci** esportabile, per i controlli del registro delle attività
      sportive.

Fatto quando: il commercialista di un club ASD conferma che dal gestionale
esce tutto quello che gli serve.

## Round 5: convivenza e passaggio

Obiettivo: togliere la paura di cambiare. Quasi nessun club spegne Playtomic
dall'oggi al domani.

- [ ] **Occupazioni da Playtomic.** Leggere le prenotazioni prese su Playtomic
      come facciamo con SumUp (`tables/externalBookings.ts`, il campo
      `source` è già pensato per altre origini). Da verificare: la loro API è
      in sola lettura, e da giugno 2026 bloccano le integrazioni non
      certificate. Alternativa: il calendario condiviso, come con SumUp.
- [ ] **Importazione dei clienti** da CSV (Playtomic esporta i clienti con il
      consenso al marketing), con unione delle schede doppie che c'è già.
- [ ] **Passaggio guidato.** Lista di cose da fare nella prima settimana,
      e un messaggio WhatsApp pronto per avvisare i clienti del nuovo modo di
      prenotare.

Fatto quando: un club che usa Playtomic lavora con noi senza doppie
prenotazioni sullo stesso campo.

## Round 6: il club che va da solo

Obiettivo: le funzioni che oggi hanno solo i più grandi. Meglio con partner
che sviluppate da zero.

- [ ] **Porte e luci** accese dalla prenotazione, con un codice per ogni
      prenotazione. Essenziale per i club aperti h24 senza personale.
      Playtomic lo fa con partner (Smart Padel, QT System), Wansport e
      Matchpoint in casa.
- [ ] **Cassa del bar e magazzino**, oppure integrazione con la cassa SumUp
      che il club usa già.
- [ ] **App col marchio del club.** L'app mobile ha già amici, cerchie e
      partite: è la base. Matchpoint la offre a tutti, Playbypoint e
      CourtReserve solo nel piano più caro.
- [ ] **Livello calcolato dai risultati.** Oggi lo assegna lo staff. Un
      livello fatto male crea più lamentele che altro (succede a Playtomic e
      Wansport): farlo solo quando ci sono abbastanza risultati registrati.
- [ ] **Video delle partite**, con partner.
- [ ] **Funzioni con l'intelligenza artificiale**, già annunciate nel listino
      come «in arrivo».

---

## Decisioni aperte

- [ ] Nome del prodotto: Vetro è provvisorio. La ricerca dei nomi è ripartita.
- [ ] Forma fiscale dei club a cui ci rivolgiamo per primi (ASD, SSD, società):
      decide quanto è grande il Round 4.
- [ ] Spagna sì o no, e quando: decide lingua, pagamenti (Bizum) e fisco
      (Verifactu).
- [ ] Prezzi: restano 39 € e 99 € dopo Round 1 e 2, o nasce un terzo piano?

## Concorrenti da tenere d'occhio

- **Playtomic**: 1.700 club in Italia. Ha comprato Sportclubby e
  PrenotaUnCampo, e a ottobre 2026 TIMP (gestionale per palestre attivo in
  Italia e Spagna). Guadagna dalle commissioni sui giocatori (circa 4%, fino
  al 20% sulle partite aperte). Punti deboli: i club non possono scrivere ai
  propri clienti, nessuna app col marchio del club, assistenza fatta solo da
  un chatbot.
- **MATCHi + Matchpoint + Eversports**: fusione annunciata a marzo 2026, con
  l'Italia tra i mercati da conquistare. Punto forte: l'app col marchio del
  club.
- **Wansport**: il principale italiano, circa 700 club di padel, nessuna
  commissione. Ha accessi e luci; app debole (2,7 su App Store), niente
  WhatsApp.
- **Anytimes, PallaGialla**: piccoli e nuovi, ma attaccano esattamente il
  nostro spazio (0% commissioni, app col marchio, WhatsApp).
- **AssoFacile, GeSoSport, TeamSystem**: forti sulla parte fiscale e
  associativa, deboli sulle prenotazioni e sui giocatori.

## Fonti

Raccolte il 27/10/2026. Alcune pagine bloccavano la lettura automatica: in quei
casi i dati vengono da estratti di ricerca e vanno ricontrollati.

- Playtomic, piani per i club: https://playtomic.com/pricing
- Playtomic, numeri del gestionale: https://playtomic.com/it/playtomic-manager
- Playtomic, niente messaggi in massa ai clienti:
  https://helpmanager.playtomic.com/hc/en-gb/articles/20535292080145
- Playtomic, accessi e luci con partner:
  https://helpmanager.playtomic.com/hc/en-gb/articles/20534244219665
- Playtomic compra TIMP: https://emprendedores.es/casos-de-exito/playtomic-compra-timp/
- Playtomic compra Sportclubby:
  https://www.economyup.it/startup/sportech-la-startup-sportclubby-acquisita-dalla-spagnola-playtomic/
- Recensioni Playtomic: https://www.trustpilot.com/review/playtomic.io
- Fusione Eversports e MATCHi:
  https://www.trendingtopics.eu/eversports-und-matchi-fusionieren-und-wollen-fuehrende-sport-plattform-europas-werden/
- Matchpoint: https://tpcmatchpoint.com/software-gestion-clubs-padel.html
- CourtReserve, prezzi: https://courtreserve.com/pricing-update/
- Wansport: https://wansport.com/gestionale-per-campi-padel/
- Wansport, intervista con il prezzo del 2024:
  https://padelmagazine.it/news/wansport-ogni-giorno-ci-alziamo-con-lobiettivo-di-migliorare-il-business-di-un-centro-sportivo/
- AssoFacile: https://www.assofacile.it/software-per-asd-ssd-e-polisportive/software-tennis-padel/
- Anytimes: https://www.anytimes.it/
- PallaGialla: https://pallagialla.com/
- POS e registratore telematico dal 2026:
  https://www.fiscal-focus.it/satispay-registratore-telematico,3,182100
