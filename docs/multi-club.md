# Migrazione multi-club

Il backend oggi serve un club solo: nessuna tabella dice di quale club è una
riga. Questo piano lo porta a servirne tanti con un solo deployment Convex,
senza fermare Padel Sport se non per un'ora, alla fine. È il primo punto del
Round 0 di [roadmap.md](roadmap.md).

Stato del codice letto il 27/10/2026 (commit `c02bdfa`).

## Le scelte

- **Un deployment condiviso, `clubId` su ogni riga.** Un deployment per club
  moltiplicherebbe rilasci, migrazioni, cron, variabili e chiavi, e
  renderebbe impossibili le funzioni fra club. Se un giorno un cliente
  pretende i dati separati per contratto, gli si dà un deployment suo con lo
  stesso codice.
- **`clubId` su tutte le tabelle**, anche quelle figlie che lo potrebbero
  ricavare dal genitore: le regole per riga devono poter controllare ogni
  documento da solo, ed esportare o cancellare un club deve essere una
  ricerca sola.
- **Giocatori per club, per ora.** Una scheda `players` per club, con
  `clerkUserId` unico dentro il club; amici e cerchie restano nel club.
  L'account unico fra club verrà dopo, collegando le schede per
  `clerkUserId`.
- **Il club non arriva mai dal browser come permesso.**
  - Gestionale: dall'organizzazione Clerk (`clubs.clerkOrgId`), che
    `staffGate` già legge.
  - Sito, area personale, app: da uno slug (oggi `CLUB_SLUG` su Railway e una
    costante nell'app, domani il dominio). Lo slug sceglie il club; quello che
    si può leggere lo decide ancora l'identità di chi chiama.
  - Cron: un giro per club.
  - Webhook: dal record che ritrovano.
- **Tutte le funzioni passano da wrapper** in un file solo, costruiti con
  `convex-helpers` (già fra le dipendenze): ricavano il club, avvolgono
  `ctx.db` con le regole per riga e bloccano le scritture in manutenzione.

## Da dove si parte

- 36 tabelle in `convex/tables`, più il componente `components/tournaments`
  con tabelle sue.
- 178 funzioni: 82 mutation, 51 query, 23 internalMutation, 12 internalQuery,
  7 internalAction, 3 action. Tutte importano `query` e `mutation` da
  `_generated/server`, nessun wrapper comune.
- Lo staff si riconosce fuori da Convex: `staffGate`
  (`apps/dashboard/lib/dashboard-api.ts`) controlla l'organizzazione Clerk e
  chiama Convex con `BOOKING_WEBHOOK_SECRET`; `assertServer`
  (`utils/serverSecret.ts`) è in 51 file.
- Pensati per un club solo:
  - `bookingSettings` è una riga letta con `.first()`
    (`modules/settings/booking.ts`);
  - `slots` si legge per intero con `.collect()` (`bookings/court.ts`,
    `modules/settings/booking.ts`, `modules/openMatches/lib.ts`,
    `slots/listActive.ts`);
  - `CLUB_TIME_ZONE` (`utils/clubTime.ts`), `CLUB_LATITUDE` e
    `CLUB_LONGITUDE` (`modules/weather/refresh.ts`);
  - il nome del club scritto a mano in `utils/staffLinks.ts`,
    `modules/payments/checkout.ts`, `modules/push/send.ts`,
    `modules/notifications/confirmation.ts`;
  - variabili d'ambiente del club: `SUMUP_MERCHANT_CODE`, `SUMUP_API_KEY`,
    `GOOGLE_CALENDAR_ID_READ`, `GOOGLE_CALENDAR_ID_WRITE`,
    `TWILIO_PHONE_SENDER`, `TWILIO_PHONE_SENDER_VIRTUAL`,
    `TWILIO_MESSAGING_SERVICE_SID`, i due template Twilio,
    `HARK_WEBHOOK_URL`.
- 8 cron in `crons.ts`, tutti per un club solo.
- 3 webhook in `http.ts` (Resend, Twilio, SumUp): ritrovano il record
  dall'identificativo del provider, quindi ricavano il club da lì e non
  cambiano.
- Nessun test nel backend.

## Gli indici

Tre gruppi, così non si riscrivono tutti.

**Radice: si affianca `by_club_…`** (le liste per data, stato, email,
chiave). Il nome segue lo stile del repo: `by_booking_date` diventa
`by_club_booking_date`. Le tabelle che non hanno indici di questo tipo
prendono `by_club`, così ogni tabella ha un indice che comincia da
`clubId` (serve anche a trovare le righe senza club):

| Tabella | Indici da prefissare con `clubId` |
|---|---|
| bookings | `by_booking_date`, `by_created_at`, `by_status`, `by_notification_status` |
| bookingSettings | nessuno oggi: nasce `by_club` al posto di `.first()` |
| slots | `by_name` (`by_club_name` sostituisce anche il `.collect()`) |
| externalBookings | `by_start` |
| players | `by_clerk_user_id`, `by_email`, `by_code` |
| openMatches | `by_status_date`, `by_date` |
| matchRequests | `by_status_date`, `by_date`, `by_email` |
| supportRequests | `by_status_created`, `by_created`, `by_email` |
| events | `by_date` |
| eventRsvps | `by_email`, `by_created` |
| memberships | `by_end` |
| services | `by_kind` |
| pointRules | `by_key` |
| pointPresets | `by_archived` |
| rewards | `by_archived` |
| rewardRedemptions | `by_status` |
| pointReports | `by_created` |
| weatherDays | `by_day` |
| clientInvites | `by_email`, `by_status` |
| referrals | `by_email` |
| matchGuests | `by_email` |
| pushSubscriptions | `by_user` |
| notificationPreferences | `by_user` |

**Figlie: l'indice resta com'è**, perché si arriva dal genitore che è già
del club: bookingPlayers, bookingDeliveries (`by_booking`), payments
(`by_booking`), joinRequests, matchInvites, matchGuests (`by_match`),
circles, circleMembers, circleInvites, friendships, pointTransactions
(`by_player`), memberships (`by_player`), rewardRedemptions (`by_player`),
pointReports (`by_player`), pointsExitRequests (`by_player`), clientInvites
(`by_player`), referrals (`by_inviter`, `by_invitee`), supportRequests
(`by_member`), openMatches (`by_booking`, `by_creator`, `by_circle_date`),
bookings (`by_created_by_player`), eventRsvps (`by_form`),
eventCommunications, eventCommunicationDeliveries.

**Globali: l'indice resta com'è, e dopo la lettura si controlla `clubId`**
(token, codici e identificativi dei provider, unici per costruzione):
bookings `by_code`, clientInvites `by_token`, referrals `by_token`,
eventRsvps `by_cancel_token`, pointsExitRequests `by_token`,
rewardRedemptions `by_code`, payments `by_checkout`, bookingDeliveries
`by_provider_id`, externalBookings `by_external_id`, pointTransactions
`by_auto_key`, pushSubscriptions `by_endpoint`, players `by_deletion_effective`
e `by_deletion_purge` (li leggono i cron, per tutti i club).

La tabella `events` è deprecata (gli eventi stanno su Sanity) ma **non va
tolta**: prende `clubId` come le altre.

---

## Fase 0: preparazione

Niente in produzione. Mezza giornata.

- [x] `vitest` e `convex-test` in `packages/backend`, con uno script `test`.
      `convex-test` è fermo alla 0.0.54: dalla 0.0.55 vuole Convex 1.43, e
      Convex resta sulla 1.42 per non aggiungere rischi al rilascio.
- [x] Test della Fase 1 (`modules/clubs/clubs.test.ts`): riga del club unica,
      righe nuove col club anche quando il meteo le riscrive, riempimento.
- [x] Un test di isolamento: due club con dati propri, e nessuna query
      pubblica dell'uno restituisce righe dell'altro. Nasce con i wrapper
      della Fase 2 e cresce con loro.
- [x] Componente `@convex-dev/migrations` in `convex.config.ts`.
- [x] Backup di produzione dalla dashboard di Convex (Backups), lasciato lì.
      Le prove si fanno in dev con dati finti: i dati di produzione sono dati
      personali dei clienti e non vanno copiati in dev o in locale.

## Fase 1: aggiungere senza togliere

Nessuna manutenzione, nessun cambiamento visibile. Circa un giorno. Si torna
indietro senza danni: il campo è facoltativo e il codice vecchio lo ignora.

- [x] Tabella `clubs`: `slug`, `name`, `timeZone`, `latitude`, `longitude`,
      `clerkOrgId`, `maintenance`. La configurazione non segreta di SumUp,
      WhatsApp e Google arriva con `clubConfig` nella Fase 2; i segreti
      restano nelle variabili d'ambiente finché il club è uno.
- [x] Riga di Padel Sport creata da `modules/clubs/seed:padelSport`.
      `clerkOrgId` resta vuoto per ora e si passa come argomento quando serve
      (Fase 2): dev e prod hanno istanze Clerk e organizzazioni diverse.
- [x] `clubId: v.optional(v.id("clubs"))` su tutte le 36 tabelle. Il
      componente `tournaments` passa alla Fase 2: le sue dieci tabelle
      dipendono tutte da un torneo e oggi nessuna app lo usa.
- [x] I nuovi indici `by_club_…` accanto ai vecchi (tabella sopra).
- [x] I 49 `ctx.db.insert` scrivono `clubId`, per ora sempre Padel Sport,
      da `defaultClubId` (`modules/clubs/lib.ts`). Anche il `replace` del
      meteo (`modules/weather/data.ts`), che riscrive la riga intera. Senza
      questo, le righe nate dopo il riempimento resterebbero senza club.
- [x] Migrazione che riempie `clubId` su ogni riga esistente, a lotti e
      ripetibile: `modules/clubs/backfill:run`.
- [x] Controllo: per ogni tabella, zero righe senza `clubId`
      (`modules/clubs/backfill:missing`). Fatto in dev e in prod il 27/10/2026,
      dopo il backup di prod: circa 1.000 righe in 25 tabelle.
- [x] Rilascio: `convex deploy`, poi main (anche se il sito non cambia).
      In prod il 27/10/2026, main a `4e6553e`.

## Fase 2: il codice diventa multi-club

Più rilasci, sempre senza manutenzione, ognuno compatibile col precedente.
Da 4 a 7 giorni.

- [ ] **Componente tournaments**: `clubId` sulla tabella dei tornei, passato
      dalle funzioni dell'app che lo chiamano (`modules/tournaments`).
- [x] **Wrapper** in `convex/functions.ts` (in dev il 28/10/2026, in prod il
      29/10/2026 dopo aver ricontrollato zero righe senza club), con tutte le
      funzioni già passate di lì:
  - [x] `clubQuery`, `clubMutation`, `clubAction` (sito, area personale,
        app): club dallo slug `clubSlug`, facoltativo con Padel Sport come
        valore predefinito finché esistono versioni vecchie dell'app;
  - [x] `serverQuery`, `serverMutation`, `serverAction`: chiamate col
        segreto condiviso. Nel piano erano `staffQuery` e `staffMutation`, ma
        le usano anche le route del sito (`apps/web/app/api`), non solo il
        gestionale. Il club arriva dall'organizzazione Clerk (`clerkOrgId`) o
        dallo slug; senza nessuno dei due, Padel Sport;
  - [x] `internalQuery`, `internalMutation`, `internalAction` per cron,
        webhook e scheduler: **senza** `clubId` esplicito, diversamente dal
        piano. Quasi tutte partono da un record (prenotazione, pagamento,
        giocatore) e il club lo leggono da lì; alcuni job aspettano giorni in
        coda (chiusura dell'uscita dal programma punti), e un argomento nuovo
        obbligatorio li farebbe fallire. Il `clubId` esplicito arriva con i
        cron per club;
  - [x] `ctx.db` avvolto da `convex-helpers/server/rowLevelSecurity`: una riga
        di un altro club non si legge e non si scrive, e una patch non può
        spostarla in un altro club. Le query sui vecchi indici restano giuste
        anche con più club, solo più lente: i nuovi indici sono il passo
        dopo;
  - [x] in manutenzione le mutation rifiutano con `CLUB_MAINTENANCE`, tranne
        per gli id Clerk in `PLATFORM_ADMIN_USER_IDS` (variabile di Convex;
        dal gestionale vale `actorUserId`).
- [x] **Il controllo sugli import** non è una regola di Biome, che nel
      backend non gira: è un test (`functions.test.ts`) che fallisce se un
      file importa i costruttori da `_generated/server` invece che da
      `functions.ts`.
- [x] `bookings/get:getById` è diventata interna: era pubblica e restituiva
      la prenotazione intera, telefono compreso, a chiunque avesse l'id.
- [x] Test di isolamento (`functions.test.ts`): due club, query pubbliche,
      scritture dello staff, righe di un altro club, giocatori per club,
      segreto sbagliato, manutenzione.
- [ ] **Modulo per modulo**, passando ai wrapper e ai nuovi indici, con i test
      di isolamento che crescono insieme:
  - [x] settings e slots (in dev e in prod il 29/10/2026): `settingsRowOf`,
        `bookingSettings` e `clubCourts` (`modules/settings/lib.ts`) vogliono
        il club, e leggono da `by_club` e `by_club_name`. La disponibilità dei
        campi (`courtsAt`, `pickCourt`, `findAvailableSlot`) prende il club
        da `ctx.club`; il nome di un campo è unico dentro il club. Il cron dei
        giorni vuoti legge Padel Sport per slug finché i cron non fanno un
        giro per club, e `payments/checkout:open` riceve il club dall'action
        (il controllo del club sulla prenotazione resta al modulo payments);
  - [x] bookings (in dev e in prod il 29/10/2026): disponibilità, agenda dello staff,
        nomi sulle prenotazioni future, chiusure, scelta del campo e cron dei
        giorni vuoti leggono da `by_club_booking_date`, `by_club_status` e
        `by_club_created_at`. Il codice della prenotazione è unico dentro il
        club: chi lo genera controlla i doppioni attraverso le regole per
        riga. Restano sui vecchi indici, per tutti i club, le funzioni interne
        che toccano ai passi dopo: il promemoria d'inizio partita (cron), il
        numero sull'icona (`push/subscriptions:badgeCount`, push), la ricerca
        per codice dei pagamenti (payments) e le correzioni da lanciare a mano
        (`bookings/names:alignBookers`, `points/backfill`);
  - [x] openMatches, matchRequests, circles, friends (in dev il 29/10/2026):
        partite aperte, «le mie partite» e richieste dei giocatori leggono da
        `by_club_status_date` e `by_club_date`. Le ricerche per nome usano un
        indice di ricerca nuovo, `players.by_club_name`, con `clubId` come
        filtro: il vecchio `by_name` faceva leggere e scartare i giocatori di
        tutti i club. Il codice del giocatore (cinque cifre) è unico dentro il
        club: si genera e si cerca su `by_club_code`. Le tabelle figlie
        (inviti, richieste, ospiti, cerchie, amicizie) partono sempre da una
        partita, una cerchia o un giocatore e restano com'erano. La pulizia
        delle richieste vecchie (`privacy/retention`) passa con privacy;
  - [ ] clients, players, memberships, privacy;
  - [ ] payments;
  - [ ] points, rewards, referrals, pointReports;
  - [ ] eventi, comunicazioni, RSVP;
  - [ ] supportRequests, notifications, push, reminders;
  - [ ] weather, courtCalendar, deliveries;
- [ ] **Costanti del club** lette dalla riga `clubs`: fuso orario, coordinate
      del meteo, nome nei messaggi e nei pagamenti, link dello staff.
- [ ] **Configurazioni del club** lette da un helper `clubConfig(ctx, club)`:
      oggi rilegge le variabili d'ambiente, domani la tabella, senza toccare
      chi lo usa.
- [ ] **Cron**: ognuno elenca i club e programma un job per club.
- [ ] **Gestionale**: `staffGate` passa l'organizzazione a Convex.
- [ ] **Sito e area personale**: `CLUB_SLUG` su Railway, passato alle query
      pubbliche.
- [ ] **App mobile**: slug costante nella configurazione.
- [ ] **Modalità manutenzione**: query pubblica sullo stato del club; sito,
      gestionale e app mostrano «Torniamo subito» quando `maintenance` è
      acceso.
- [ ] Ogni rilascio: prima `convex deploy`, poi main.

## Fase 3: il passaggio

Finestra di manutenzione dopo la chiusura del club, circa un'ora.

- [ ] Accendere `maintenance` su Padel Sport (un campo nella dashboard di
      Convex, effetto immediato).
- [ ] Rilanciare la migrazione di riempimento per le ultime righe.
- [ ] Rilasciare lo schema con `clubId` obbligatorio. Convex controlla ogni
      documento prima di accettarlo: se ne manca uno, il rilascio fallisce e
      non cambia niente.
- [ ] Prove vere, entrando come amministratore della piattaforma:
  - [ ] prenotazione dal sito;
  - [ ] conferma dal gestionale e WhatsApp al giocatore;
  - [ ] pagamento di prova con SumUp, e rimborso;
  - [ ] partita aperta e invito;
  - [ ] area personale: prenotazioni, punti, premi;
  - [ ] agenda del giorno dopo nel gestionale.
- [ ] Spegnere `maintenance`.

I vecchi indici restano: se qualcosa va storto si torna alla versione della
Fase 2, su Convex e su Railway, con i dati ancora compatibili.

## Fase 4: pulizia

Una settimana dopo, dieci minuti.

- [ ] Togliere i vecchi indici.
- [ ] Togliere Padel Sport come valore predefinito dello slug, quando le
      versioni vecchie dell'app non ci sono più.

## Decisioni aperte

- [ ] L'app mobile è già sugli store? Senza aggiornamenti OTA le versioni
      installate non cambiano: lo slug facoltativo resta finché non spariscono,
      e la Fase 4 si allunga.
- [ ] Giocatori per club (scelta attuale) o account unico subito?
- [ ] Sito pubblico a regime: sottodominio per club o percorso?
- [ ] Data della finestra della Fase 3.
