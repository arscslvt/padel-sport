import type { Metadata } from "next";
import type { ReactNode } from "react";
import { useId } from "react";

import { CookiePreferencesButton } from "@/components/cookie-banner";
import { Heading } from "@/components/ui/heading";
import { getInfo } from "@/lib/info";

export const metadata: Metadata = {
	title: "Privacy e trattamento dei dati",
	description:
		"Come A.S.D. Padel Sport Melilli raccoglie, usa e conserva i dati personali: scheda socio e tesseramento, prenotazioni e pagamenti, programma punti, richieste, iscrizioni agli eventi e navigazione.",
	alternates: { canonical: "https://www.asdpadelsport.com/privacy" },
};

/** Data dell'ultima revisione dei contenuti di questa pagina. */
const LAST_UPDATE = "25 ottobre 2026";

/**
 * Fornitori che trattano dati per conto del club (art. 28 GDPR).
 *
 * L'elenco riflette i servizi che il sito contatta davvero: se cambia
 * l'infrastruttura va aggiornato qui, non solo nel codice.
 */
const PROCESSORS: ReadonlyArray<{
	name: string;
	purpose: string;
	place: string;
}> = [
	{
		name: "Railway Corporation",
		purpose: "Hosting del sito, consegna delle pagine e log tecnici di accesso",
		place: "Stati Uniti",
	},
	{
		name: "Convex, Inc.",
		purpose:
			"Database in cui sono registrate la scheda socio con i consensi, le prenotazioni dei campi fatte dal sito con l'esito dei pagamenti online, le iscrizioni agli eventi, le richieste di giocatori e di assistenza inviate dai moduli e il conto del programma punti; ospita anche le immagini dei premi",
		place: "Stati Uniti",
	},
	{
		name: "Resend (Plus Five Five, Inc.)",
		purpose:
			"Invio delle email: la notifica alla segreteria, la copia della richiesta a chi la manda, le comunicazioni della segreteria a chi si è iscritto a un evento, gli avvisi delle prenotazioni e quelli dei movimenti del programma punti",
		place: "Stati Uniti",
	},
	{
		name: "SumUp",
		purpose:
			"Pagamenti online delle prenotazioni, sulla sua pagina di pagamento, e piattaforma esterna su cui prenotano i campi le persone senza un account del club. Per i dati della carta e del pagamento è titolare autonomo",
		place: "Unione Europea e Regno Unito",
	},
	{
		name: "Twilio Inc.",
		purpose:
			"Invio delle conferme e degli avvisi delle prenotazioni su WhatsApp, tramite la piattaforma WhatsApp Business di Meta",
		place: "Stati Uniti",
	},
	{
		name: "Google Ireland Limited",
		purpose:
			"Calendario condiviso con SumUp, che tiene allineate le disponibilità dei campi. Per le prenotazioni fatte dal sito riporta giorno, orario, campo, nome di chi prenota e codice della prenotazione",
		place: "Unione Europea e Stati Uniti",
	},
	{
		name: "Clerk, Inc.",
		purpose:
			"Autenticazione e gestione degli account dell'area riservata a staff e soci",
		place: "Stati Uniti",
	},
	{
		name: "Sanity AS",
		purpose:
			"Gestione dei contenuti editoriali (eventi e tornei) e consegna delle relative immagini",
		place: "Norvegia e Unione Europea",
	},
	{
		name: "Amplitude, Inc.",
		purpose:
			"Statistiche di utilizzo del sito e registrazione delle sessioni di navigazione, attive solo se hai dato il consenso",
		place: "Stati Uniti",
	},
];

/** Tempi di conservazione dichiarati dal club per ciascun tipo di dato. */
const RETENTION: ReadonlyArray<{ what: string; how: string }> = [
	{
		what: "Richieste di giocatori",
		how: "12 mesi dalla data indicata nella richiesta",
	},
	{
		what: "Richieste di assistenza",
		how: "24 mesi dall'invio della richiesta",
	},
	{
		what: "Iscrizioni agli eventi",
		how: "18 mesi dall'iscrizione, quindi comunque dopo la fine dell'evento, insieme allo storico delle comunicazioni inviate a chi vi si era iscritto",
	},
	{
		what: "Email scambiate con la segreteria",
		how: "24 mesi nella casella di posta del club",
	},
	{
		what: "Scheda socio e tessere",
		how: "Per tutta la durata del rapporto associativo e 12 mesi dalla sua cessazione. Le tessere, con le quote pagate, per 10 anni come richiesto dagli obblighi contabili",
	},
	{
		what: "Dati sanitari",
		how: "Finché resti socio e mantieni il consenso. Se lo revochi li cancelliamo subito",
	},
	{
		what: "Consensi a comunicazioni promozionali e newsletter",
		how: "Finché non li revochi o non cessa il rapporto associativo",
	},
	{
		what: "Prenotazioni dei campi",
		how: "Le prenotazioni fatte dal sito restano nel nostro database per il tempo necessario a gestire presenze e incassi, e comunque per i termini previsti dagli obblighi contabili; quelle fatte senza account restano nel gestionale SumUp, con gli stessi criteri",
	},
	{
		what: "Pagamenti online",
		how: "Esito, importo, data, codice della transazione e rimborsi per 10 anni, come richiesto dagli obblighi contabili",
	},
	{
		what: "Avvisi delle prenotazioni",
		how: "L'esito di email e messaggi WhatsApp resta insieme alla prenotazione a cui si riferisce",
	},
	{
		what: "Programma punti",
		how: "Saldo, movimenti, premi riscattati e segnalazioni per tutta la durata della tua adesione al programma, e 12 mesi da quando esci dal programma o il programma termina. I punti in attesa di chi non ha aderito per 12 mesi dalla loro assegnazione. La prova della tua adesione (data e versione del regolamento accettato) la conserviamo fino a 10 anni, per poter dimostrare il consenso alle regole in caso di contestazione",
	},
	{
		what: "Account dell'area riservata",
		how: "Per tutta la durata del rapporto associativo o di collaborazione, e 12 mesi dalla sua cessazione",
	},
	{
		what: "Account eliminati",
		how: "Quando l'account viene eliminato, l'accesso si chiude e della scheda teniamo una copia congelata per 12 mesi, fuori dall'anagrafica e dalle ricerche, per rispondere a eventuali contestazioni su prenotazioni, punti e tessere; poi la cancelliamo del tutto. Se non vuoi aspettare puoi chiederci di cancellarla subito: restano solo i dati che la legge ci obbliga a tenere, come i pagamenti online",
	},
	{
		what: "Log tecnici di accesso",
		how: "Secondo le impostazioni del fornitore di hosting, comunque non oltre 12 mesi",
	},
	{
		what: "Statistiche di utilizzo e registrazioni delle sessioni",
		how: "Conservate da Amplitude secondo la configurazione del nostro piano; le registrazioni delle sessioni restano comunque per un periodo più breve degli eventi statistici. Revocando il consenso interrompi subito la raccolta e puoi chiederci la cancellazione di quanto già raccolto",
	},
];

function Section({
	number,
	title,
	children,
	id,
}: {
	number: number;
	title: string;
	children: ReactNode;
	/** Ancora citabile: il banner cookie rimanda qui. */
	id?: string;
}) {
	return (
		<section id={id} className="border-border scroll-mt-28 border-t pt-8">
			{/* Il numero sta fuori dal titolo: dentro Instrument Serif le cifre
          appesantiscono la riga, e qui serve solo per citare la sezione. */}
			<span className="text-muted-foreground/60 mb-2 block text-xs tabular-nums">
				{number.toString().padStart(2, "0")}
			</span>
			<Heading as="h2" size="sub" className="mb-4">
				{title}
			</Heading>
			<div className="text-muted-foreground flex flex-col gap-4 text-sm leading-relaxed">
				{children}
			</div>
		</section>
	);
}

/** Voce forte dentro un paragrafo: marca il termine, non aggiunge enfasi. */
function Term({ children }: { children: ReactNode }) {
	return <strong className="text-foreground font-medium">{children}</strong>;
}

function MailLink() {
	return (
		<a
			href={`mailto:${getInfo("email")}`}
			className="text-foreground decoration-foreground/30 hover:decoration-foreground underline underline-offset-2 transition-colors"
		>
			{getInfo("email")}
		</a>
	);
}

function Block({ title, children }: { title: string; children: ReactNode }) {
	return (
		<div>
			<p className="text-foreground font-medium">{title}</p>
			<p className="mt-1">{children}</p>
		</div>
	);
}

export default function PrivacyPage() {
	return (
		<article className="mx-auto w-full max-w-3xl px-(--gutter) pb-24">
			<header className="mb-12">
				<Heading as="h1" size="page">
					Privacy e trattamento dei dati
				</Heading>
				<p className="text-muted-foreground mt-4 text-sm leading-relaxed">
					Informativa resa ai sensi dell'art. 13 del Regolamento (UE) 2016/679
					(«GDPR») a chi usa il sito di {getInfo("name")}. Qui trovi, senza giri
					di parole, quali dati raccogliamo, cosa ne facciamo, a chi passano e
					per quanto tempo restano.
				</p>
				<p className="text-muted-foreground/70 mt-3 text-xs">
					Ultimo aggiornamento: {LAST_UPDATE}
				</p>
			</header>

			<div className="flex flex-col gap-10">
				<Section number={1} title="Chi tratta i tuoi dati">
					<p>
						Il titolare del trattamento è <Term>{getInfo("name")}</Term>, con
						sede legale in {getInfo("legalAddress")}, codice fiscale{" "}
						{getInfo("cf")} e partita IVA {getInfo("piva")}.
					</p>
					<p>
						Per qualsiasi questione relativa ai tuoi dati puoi scrivere a{" "}
						<MailLink /> o telefonare al {getInfo("cell")}.
					</p>
					<p>
						Il club non ha nominato un Responsabile della protezione dei dati
						(DPO): non ricorrono i presupposti dell'art. 37 del GDPR, perché non
						svolgiamo monitoraggio sistematico su larga scala né trattiamo su
						larga scala categorie particolari di dati.
					</p>
				</Section>

				<Section number={2} title="Che dati raccogliamo e perché">
					<p>
						I dati arrivano da quello che ci dai in segreteria e da quello che
						scrivi tu nel sito, più i dati tecnici che qualunque server registra
						quando visiti una pagina. C'è poi una sola raccolta «di sfondo», le
						statistiche di utilizzo: non parte da sola, la attivi tu accettandola
						nel banner, e si ferma appena la revochi.
					</p>
					<p>
						Nome, contatti e dati del tesseramento servono a iscriverti e a
						prenotare: senza, non possiamo farlo. Quello che è indicato come
						facoltativo — dati sanitari, consensi, note — puoi non darcelo
						senza conseguenze.
					</p>

					<div className="flex flex-col gap-6 pt-2">
						<Block title="Scheda socio">
							Quando ti iscrivi al club la segreteria apre la tua{" "}
							<Term>scheda socio</Term> con nome e cognome, email, telefono, data
							e luogo di nascita, genere, codice fiscale, residenza e livello di
							gioco. Puoi confermarla e completarla tu attivando l'account dal
							link che ti mandiamo. Sulla scheda registriamo anche le tessere
							annuali, con data, importo e modalità di pagamento della quota. Lo
							staff può aggiungere <Term>note interne</Term> utili a gestire il
							rapporto con te: non le vedi nell'area personale, ma puoi chiederne
							copia come per ogni altro dato. Servono a gestire l'iscrizione, le
							prenotazioni e i contatti con te. Base giuridica: esecuzione del
							rapporto associativo (art. 6.1.b GDPR) e, per quote e ricevute,
							obblighi contabili e fiscali (art. 6.1.c GDPR).
						</Block>

						<Block title="Tesseramento al CSI">
							Per i soci tesserati al <Term>Centro Sportivo Italiano (CSI)</Term>{" "}
							tramite il club, comunichiamo al CSI nome, cognome e gli altri dati
							anagrafici che il tesseramento richiede. Lo facciamo{" "}
							<Term>solo per chi ha un tesseramento CSI attivo o richiesto</Term>
							: i dati degli altri soci non escono dal club. Il CSI li tratta come
							titolare autonomo, secondo la propria informativa. Base giuridica:
							esecuzione del rapporto associativo e del tesseramento che ci chiedi
							(art. 6.1.b GDPR).
						</Block>

						<Block title="Dati sanitari (solo col tuo consenso esplicito)">
							Se vuoi, puoi indicarci{" "}
							<Term>allergie, condizioni mediche e invalidità</Term> che lo staff
							deve conoscere per aiutarti in caso di malore. Sono dati sanitari,
							una categoria particolare di dati: li trattiamo solo con il tuo{" "}
							<Term>consenso esplicito</Term> (art. 9.2.a GDPR), che dai con una
							casella a parte quando attivi l'account o dal tuo profilo, oppure
							firmando il modulo in segreteria. Sono facoltativi: senza, resti
							socio a tutti gli effetti. Li vede solo lo staff del club, mai gli
							altri giocatori. Puoi revocare il consenso quando vuoi dal profilo
							o scrivendo a <MailLink />, e in quel caso li cancelliamo.
						</Block>

						<Block title="Comunicazioni promozionali e newsletter (solo col tuo consenso)">
							Attivando l'account puoi scegliere, con caselle separate e non
							spuntate, di ricevere <Term>comunicazioni promozionali</Term>{" "}
							(offerte, tornei e iniziative del club) e la{" "}
							<Term>newsletter</Term> con le novità del club. Le mandiamo solo a
							chi ha detto sì, via email o messaggio. Base giuridica: il tuo
							consenso (art. 6.1.a GDPR e art. 130 del Codice privacy). Puoi
							revocarlo quando vuoi scrivendo a <MailLink />, senza conseguenze
							sulla tua iscrizione. Nella stessa schermata ti chiediamo il
							consenso alle statistiche d'uso dell'app del club. Sul sito le
							statistiche dipendono solo dalla scelta che fai nel banner,
							descritta al punto 8.
						</Block>

						<Block title="Richiesta di giocatori">
							Il modulo «ti manca qualche giocatore?» raccoglie{" "}
							<Term>nome, email e telefono</Term>, la data e l'ora della
							partita, il livello di gioco, quanti giocatori mancano e le
							eventuali note che scrivi. Li usiamo per cercare i giocatori e per
							ricontattarti; ti mandiamo anche una copia della richiesta via
							email. Base giuridica: esecuzione di misure precontrattuali
							adottate su tua richiesta (art. 6.1.b GDPR).
						</Block>

						<Block title="Richiesta di assistenza">
							Il modulo di supporto raccoglie <Term>nome, email, telefono</Term>
							, il <Term>numero di matricola socio</Term> se lo inserisci (è
							facoltativo) e il testo del messaggio. Servono solo a risponderti
							sul canale che preferisci. Base giuridica: riscontro a una tua
							richiesta e nostro legittimo interesse a gestire le relazioni con
							soci e visitatori (artt. 6.1.b e 6.1.f GDPR).
						</Block>

						<Block title="Iscrizione a un evento">
							Gli articoli degli eventi possono ospitare un{" "}
							<Term>modulo di iscrizione</Term>: raccoglie il tuo{" "}
							<Term>nome</Term>, la tua <Term>email</Term> e quante persone porti
							con te. Servono a tenere il conto dei posti e a ricontattarti su{" "}
							<em>quell'evento</em>: la conferma, gli eventuali cambi di orario o
							di programma, gli avvisi dell'ultimo momento. Base giuridica:
							esecuzione dell'iscrizione che ci chiedi (art. 6.1.b GDPR). In fondo
							a ogni mail trovi due strade distinte:{" "}
							<Term>annullare l'iscrizione</Term>, che libera il posto, e{" "}
							<Term>non ricevere altre comunicazioni</Term>, che lascia il posto
							tuo e ferma soltanto le email.
						</Block>

						<Block title="Prenotazione di un campo">
							Se hai un account del club, la prenotazione avviene{" "}
							<Term>su questo sito</Term>: confermi la tua identità con un
							codice che ti mandiamo via email e ci lasci il numero di telefono,
							il giorno e l'orario, il livello della partita, i nomi dei
							compagni di gioco e — se vuoi che ricevano anche loro il codice
							d'ingresso — le loro email. Questi dati finiscono nel nostro
							database e li vede la segreteria, che gestisce i campi e, quando
							la squadra è incompleta, cerca i giocatori mancanti. Conferma e
							avvisi sulla prenotazione ti arrivano via email e su{" "}
							<Term>WhatsApp</Term>, al numero che ci lasci. Dei messaggi
							WhatsApp registriamo se sono stati consegnati e letti, per sapere
							se sei stato avvisato. Per non far prenotare lo stesso campo due
							volte, giorno, orario, campo, nome di chi prenota e codice
							finiscono anche nel calendario che condividiamo con SumUp. Base
							giuridica: esecuzione del servizio che ci chiedi (art. 6.1.b
							GDPR). Se comunichi il nome o l'email di un altro giocatore, ti
							chiediamo di averlo avvisato.
						</Block>

						<Block title="Pagamento online">
							Quando il club accetta pagamenti online puoi pagare la
							prenotazione con carta, Apple Pay o Google Pay sulla{" "}
							<Term>pagina di pagamento di SumUp</Term>. I dati della carta li
							inserisci lì e non passano dal nostro sito: per quelli SumUp è
							titolare autonomo del trattamento, secondo la propria
							informativa. Da SumUp riceviamo l'esito, l'importo, la data e il
							codice della transazione, che registriamo sulla prenotazione
							insieme agli eventuali rimborsi. Base giuridica: esecuzione del
							servizio che ci chiedi (art. 6.1.b GDPR) e obblighi contabili
							(art. 6.1.c GDPR).
						</Block>

						<Block title="Prenotazione senza account">
							Chi non ha un account viene portato sulla piattaforma esterna
							SumUp, dove inserisce i propri dati (nome, contatti, orario e
							l'eventuale pagamento). Quei dati non passano dal nostro sito e
							non finiscono nel nostro database: li tratta SumUp, che li mette a
							disposizione della segreteria per gestire i campi. Sulla sua
							piattaforma valgono le condizioni e l'informativa privacy di
							SumUp, che ti invitiamo a leggere prima di prenotare.
						</Block>

						<Block title="Area riservata">
							La dashboard e le pagine di gestione sono raggiungibili solo dopo
							l'accesso e sono riservate a staff e soci. Le credenziali e i dati
							del profilo (email, nome, eventuale immagine) sono gestiti per
							nostro conto da Clerk. Base giuridica: esecuzione del rapporto
							associativo o di collaborazione (art. 6.1.b GDPR).
						</Block>

						<Block title="Programma punti e premi">
							Se aderisci al <Term>programma punti</Term>, registriamo la data
							in cui hai accettato il regolamento e quale versione, i punti che
							ti assegniamo o togliamo con il relativo motivo, il saldo, i premi
							che riscatti con il loro codice e la loro scadenza. Li vedi tu
							nella tua area personale e li vede la segreteria, che assegna i
							punti e consegna i premi. Se ci hai lasciato un indirizzo email ti
							scriviamo a ogni movimento: sono comunicazioni di servizio sul
							programma, non promozionali. Dall'area personale puoi anche
							mandarci una <Term>segnalazione</Term> su un movimento: registriamo
							il messaggio, il movimento a cui si riferisce e la risposta della
							segreteria. Non usiamo questi dati per profilarti né per decidere
							qualcosa su di te in automatico. Base giuridica:
							esecuzione del regolamento che hai accettato aderendo (art. 6.1.b
							GDPR). Se la segreteria ti assegna punti prima che tu abbia
							aderito, li registriamo <Term>in attesa</Term> sulla tua scheda di
							socio, senza mandarti nulla, per poterteli accreditare quando
							aderisci: base giuridica il nostro legittimo interesse a non
							perdere i punti che hai guadagnato (art. 6.1.f GDPR). Puoi
							chiederci di cancellarli scrivendo a <MailLink />. Puoi uscire
							dal programma quando vuoi, dalla tua area personale o dal link
							che ti mandiamo se lo chiedi alla segreteria: registriamo
							quando hai confermato e da dove.
						</Block>

						<Block title="Navigazione del sito">
							Come ogni server web, l'infrastruttura che ospita il sito registra
							dati tecnici: indirizzo IP, tipo di browser e dispositivo, pagina
							richiesta, data e ora. Sono i <Term>log di servizio</Term>, che
							servono a tenere il sito in piedi e a difenderlo dagli abusi: non
							li usiamo per capire chi sei né per misurare il pubblico. Base
							giuridica: nostro legittimo interesse alla sicurezza e al buon
							funzionamento del sito (art. 6.1.f GDPR).
						</Block>

						<Block title="Statistiche di utilizzo (solo col tuo consenso)">
							Se accetti nel banner, usiamo <Term>Amplitude</Term> per capire
							come viene usato il sito. Raccoglie le pagine che apri e le
							interazioni con gli elementi (clic, invii di modulo, cambi di
							pagina), i dati tecnici del browser e del dispositivo, l'indirizzo
							IP — da cui Amplitude ricava la zona geografica approssimativa — e
							un <Term>identificativo casuale</Term> salvato sul tuo
							dispositivo, che serve a riconoscere le visite successive come la
							stessa persona. Registra inoltre la{" "}
							<Term>sessione di navigazione</Term>: una ricostruzione di quello
							che è successo a schermo (movimenti, clic, scorrimento) che
							riguardiamo per capire dove il sito è scomodo. I campi dei moduli
							sono mascherati nella registrazione: quello che digiti in nome,
							email, telefono e matricola non compare in chiaro. Non colleghiamo
							questi dati alla tua identità né li incrociamo con le richieste
							che ci mandi. Base giuridica: il tuo <Term>consenso</Term> (art.
							6.1.a GDPR e art. 122 del Codice privacy), che puoi revocare
							quando vuoi.
						</Block>
					</div>
				</Section>

				<Section number={3} title="Se ci lasci i dati di altre persone">
					<p>
						Può capitare di nominare qualcun altro — il compagno di partita
						nelle note di una richiesta, il socio per cui stai scrivendo. Di
						quelle persone raccogliamo <Term>solo quello che scrivi tu</Term>, e
						solo per dare seguito alla richiesta.
					</p>
					<p>
						Sei però tu a doverle avvisare e a poterlo fare legittimamente. Se
						qualcuno non vuole comparire, scrivici a <MailLink /> e lo togliamo.
					</p>
				</Section>

				<Section number={4} title="Che strada fanno i dati">
					<p>
						Vale la pena dirlo in chiaro, perché è la parte che di solito resta
						nascosta. Quando invii uno dei moduli del sito — giocatori,
					assistenza o iscrizione a un evento:
					</p>
					<ol className="flex list-decimal flex-col gap-2 pl-5">
						<li>
							i dati viaggiano cifrati (HTTPS) dal tuo browser al sito, ospitato
							su Railway;
						</li>
						<li>
							vengono registrati nel nostro database su Convex, che resta la
							copia di riferimento della richiesta;
						</li>
						<li>
							partono due email tramite Resend: una alla segreteria, con i tuoi
							recapiti in modo che possa risponderti direttamente, e una a te,
							come ricevuta di quello che hai inviato;
						</li>
						<li>
							da lì in poi i dati restano tra il database e la casella di posta
							del club, consultabili solo da chi in segreteria se ne occupa.
						</li>
					</ol>
					<p>
						Non vendiamo, non cediamo e non scambiamo i tuoi dati con nessuno
						per finalità di marketing di terzi. Comunicazioni promozionali e
						newsletter le ricevi solo se ci hai dato il consenso, e puoi
						revocarlo quando vuoi. Se ti sei iscritto a un evento, le
						comunicazioni su <em>quell'evento</em> puoi farle smettere in
						qualsiasi momento dal link in fondo a ognuna.
					</p>
				</Section>

				<Section number={5} title="Chi altro li vede">
					<p>
						Oltre alle persone autorizzate della segreteria, i dati sono
						trattati dai fornitori tecnologici che rendono possibile il
						servizio. Agiscono come responsabili del trattamento, cioè su nostra
						istruzione e nei limiti dei contratti stipulati ai sensi dell'art.
						28 del GDPR; per i dati relativi ai propri servizi, alcuni di essi
						operano anche come titolari autonomi secondo le rispettive
						informative.
					</p>
					<dl className="border-border divide-border divide-y rounded-2xl border">
						{PROCESSORS.map((processor) => (
							<div key={processor.name} className="flex flex-col gap-1 p-4">
								<dt className="text-foreground text-sm font-medium">
									{processor.name}
								</dt>
								<dd className="text-sm">
									{processor.purpose}.{" "}
									<span className="text-muted-foreground/70">
										Sede: {processor.place}.
									</span>
								</dd>
							</div>
						))}
					</dl>
					<p>
						I dati dei soci tesserati al CSI sono comunicati al Centro Sportivo
						Italiano, come spiegato al punto 2. Possono inoltre essere
						comunicati alle autorità pubbliche quando la legge lo impone, e ai
						professionisti che assistono il club (per esempio il consulente
						contabile) nei limiti dei rispettivi incarichi.
					</p>
				</Section>

				<Section number={6} title="Trasferimenti fuori dall'Unione Europea">
					<p>
						Alcuni dei fornitori elencati sopra hanno sede negli Stati Uniti, e
						i dati possono quindi essere trattati fuori dallo Spazio Economico
						Europeo. Questi trasferimenti avvengono sulla base delle garanzie
						previste dal capo V del GDPR: clausole contrattuali tipo approvate
						dalla Commissione europea e, dove applicabile, adesione del
						fornitore all'EU-U.S. Data Privacy Framework.
					</p>
					<p>
						Puoi chiederci copia delle garanzie adottate scrivendo a{" "}
						<MailLink />.
					</p>
				</Section>

				<Section number={7} title="Per quanto tempo li conserviamo">
					<p>
						Teniamo ogni dato per il tempo necessario allo scopo per cui l'hai
						lasciato, poi lo cancelliamo o lo rendiamo anonimo.
					</p>
					<dl className="border-border divide-border divide-y rounded-2xl border">
						{RETENTION.map((item) => (
							<div key={item.what} className="flex flex-col gap-1 p-4">
								<dt className="text-foreground text-sm font-medium">
									{item.what}
								</dt>
								<dd className="text-sm">{item.how}</dd>
							</div>
						))}
					</dl>
					<p>
						Restano fermi i termini più lunghi imposti dalla legge — per esempio
						quelli di conservazione dei documenti contabili e fiscali — e il
						tempo necessario a far valere o difendere un diritto in sede
						giudiziaria.
					</p>
				</Section>

				<Section number={8} id={useId()} title="Cookie e memoria del browser">
					<p>
						Il sito <Term>non usa cookie di profilazione</Term>, non ospita
						pubblicità e non condivide dati con circuiti pubblicitari. Gli
						strumenti si dividono in due gruppi: quelli tecnici, che ci sono
						sempre perché senza il sito non funziona, e quelli statistici, che
						esistono solo se li accetti.
					</p>

					<p className="text-foreground font-medium">
						Tecnici e necessari — nessun consenso richiesto
					</p>
					<ul className="flex list-disc flex-col gap-2 pl-5">
						<li>
							<Term>Cookie di sessione di Clerk</Term>: mantengono l'accesso
							all'area riservata e proteggono da accessi non autorizzati. Sono
							impostati sull'intero sito, ma diventano significativi solo dopo
							l'accesso.
						</li>
						<li>
							<Term>Preferenza del tema</Term>: salvata nella memoria locale del
							browser per ricordare l'aspetto chiaro o scuro. Non lascia mai il
							tuo dispositivo.
						</li>
						<li>
							<Term>La tua scelta sui cookie</Term>: salvata anch'essa nella
							memoria locale, altrimenti dovremmo richiedertela a ogni pagina.
							Non lascia mai il tuo dispositivo.
						</li>
						<li>
							<Term>Caratteri tipografici</Term>: serviti dal nostro stesso
							dominio, quindi il tuo browser non contatta server esterni per
							scaricarli.
						</li>
					</ul>

					<p className="text-foreground font-medium">
						Statistici — solo dopo il tuo consenso
					</p>
					<ul className="flex list-disc flex-col gap-2 pl-5">
						<li>
							<Term>Amplitude</Term>: salva sul tuo dispositivo un
							identificativo casuale del browser e della singola sessione, e li
							usa per misurare le pagine viste, le interazioni e la
							registrazione della navigazione descritta al punto 2. È un
							fornitore terzo con sede negli Stati Uniti, quindi non rientra fra
							le statistiche assimilabili ai cookie tecnici: per questo lo
							chiediamo prima, e finché non accetti lo script non viene neppure
							caricato.
						</li>
					</ul>

					<p>
						Al primo accesso trovi un banner con due scelte di pari peso,{" "}
						<Term>Accetta</Term> e <Term>Rifiuta</Term>: chiuderlo scorrendo o
						continuando a navigare non vale come consenso, e senza una risposta
						esplicita niente parte. Se rifiuti non te lo richiediamo per sei
						mesi.
					</p>
					<p>
						Puoi cambiare idea quando vuoi dal collegamento{" "}
						<Term>Preferenze cookie</Term> in fondo a ogni pagina, oppure da
						qui:
					</p>
					<p>
						<CookiePreferencesButton className="text-foreground decoration-foreground/30 hover:decoration-foreground cursor-pointer underline underline-offset-2 transition-colors" />
					</p>
					<p>
						Puoi inoltre cancellare cookie e memoria locale in qualsiasi momento
						dalle impostazioni del browser: perderesti la sessione di accesso,
						la preferenza del tema e la scelta sui cookie, che torneremo quindi
						a chiederti.
					</p>
				</Section>

				<Section
					number={9}
					title="Nessuna pubblicità, nessuna decisione automatica"
				>
					<p>
						Le statistiche del punto 8, se le accetti, ci dicono come viene
						usato il sito: quali pagine funzionano e dove ci si blocca. Le
						guardiamo in forma aggregata e le usiamo solo per migliorare il
						sito.{" "}
						<Term>
							Non costruiamo profili pubblicitari, non vendiamo questi dati e
							non li usiamo per mandarti messaggi mirati
						</Term>
						, né li incrociamo con la tua identità di socio o con le richieste
						che ci mandi dai moduli.
					</p>
					<p>
						Non prendiamo decisioni automatizzate che producano effetti
						giuridici su di te e non usiamo i tuoi dati per addestrare sistemi
						di intelligenza artificiale. Le richieste che arrivano dal sito le
						legge e le lavora una persona della segreteria.
					</p>
				</Section>

				<Section number={10} title="I tuoi diritti">
					<p>
						In qualunque momento puoi chiederci di{" "}
						<Term>
							accedere ai tuoi dati, correggerli, cancellarli, limitarne l'uso
						</Term>{" "}
						oppure di riceverli in un formato leggibile per portarli altrove
						(artt. 15-20 GDPR). Puoi inoltre <Term>opporti</Term> ai trattamenti
						fondati sul nostro legittimo interesse (art. 21 GDPR) e, dove il
						trattamento si basa sul consenso, revocarlo senza che questo tolga
						validità a quanto fatto prima.
					</p>
					<p>
						Per esercitarli basta una email a <MailLink />, anche di due righe.
						Rispondiamo entro un mese; se la richiesta è complessa possiamo
						impiegarne fino a tre, avvisandoti.
					</p>
					<p>
						Per <Term>eliminare il tuo account</Term> non serve scriverci: lo
						trovi in fondo al tuo profilo, nell'area personale. L'eliminazione
						diventa effettiva dopo 30 giorni, durante i quali l'account funziona
						come sempre e puoi annullarla. Poi conserviamo una copia dei tuoi
						dati per 12 mesi, come spiegato sopra; se vuoi che la cancelliamo{" "}
						<Term>subito</Term>, insieme all'account o anche dopo, scrivi a{" "}
						<MailLink />.
					</p>
					<p>
						Se ritieni che i tuoi dati siano trattati in violazione della legge
						puoi rivolgerti al{" "}
						<a
							href="https://www.garanteprivacy.it"
							target="_blank"
							rel="noopener noreferrer"
							className="text-foreground decoration-foreground/30 hover:decoration-foreground underline underline-offset-2 transition-colors"
						>
							Garante per la protezione dei dati personali
						</a>{" "}
						o all'autorità di controllo dello Stato in cui risiedi (art. 77
						GDPR).
					</p>
				</Section>

				<Section number={11} title="Minori">
					<p>
						Il sito non è pensato per essere usato da chi ha meno di 14 anni. Le
						richieste che riguardano un minore devono essere inviate da un
						genitore o da chi ne esercita la responsabilità, che risponde dei
						dati inseriti. Se ci accorgiamo di aver raccolto dati di un minore
						senza questo presupposto, li cancelliamo.
					</p>
				</Section>

				<Section number={12} title="Aggiornamenti di questa informativa">
					<p>
						Se cambiano i servizi che usiamo o il modo in cui trattiamo i dati,
						aggiorniamo questa pagina e ne modifichiamo la data in alto. Se la
						modifica è sostanziale te lo segnaliamo sul sito: vale la pena
						ripassare di qui ogni tanto.
					</p>
				</Section>
			</div>
		</article>
	);
}
