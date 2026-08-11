import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Heading } from "@/components/ui/heading";
import { getInfo } from "@/lib/info";

export const metadata: Metadata = {
	title: "Privacy e trattamento dei dati",
	description:
		"Come A.S.D. Padel Sport Melilli raccoglie, usa e conserva i dati personali inseriti sul sito: richieste di giocatori, assistenza, prenotazioni e navigazione.",
	alternates: { canonical: "https://www.asdpadelsport.com/privacy" },
};

/** Data dell'ultima revisione dei contenuti di questa pagina. */
const LAST_UPDATE = "11 agosto 2026";

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
		name: "Vercel Inc.",
		purpose: "Hosting del sito, consegna delle pagine e log tecnici di accesso",
		place: "Stati Uniti",
	},
	{
		name: "Convex, Inc.",
		purpose:
			"Database in cui sono registrate le richieste di giocatori e di assistenza inviate dai moduli",
		place: "Stati Uniti",
	},
	{
		name: "Resend (Plus Five Five, Inc.)",
		purpose:
			"Invio delle email: la notifica alla segreteria e la copia della richiesta a chi la manda",
		place: "Stati Uniti",
	},
	{
		name: "SumUp",
		purpose:
			"Piattaforma esterna su cui si prenotano i campi, raggiunta dal pulsante «Prenota una partita»",
		place: "Unione Europea e Regno Unito",
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
];

/** Tempi di conservazione dichiarati dal club per ciascun tipo di dato. */
const RETENTION: ReadonlyArray<{ what: string; how: string }> = [
	{
		what: "Richieste di giocatori",
		how: "12 mesi dalla data indicata nella richiesta",
	},
	{
		what: "Richieste di assistenza",
		how: "24 mesi dalla chiusura della richiesta",
	},
	{
		what: "Email scambiate con la segreteria",
		how: "24 mesi nella casella di posta del club",
	},
	{
		what: "Prenotazioni dei campi",
		how: "Restano nel gestionale SumUp per il tempo necessario a gestire presenze e incassi, e comunque per i termini previsti dagli obblighi contabili",
	},
	{
		what: "Account dell'area riservata",
		how: "Per tutta la durata del rapporto associativo o di collaborazione, e 12 mesi dalla sua cessazione",
	},
	{
		what: "Log tecnici di accesso e statistiche aggregate",
		how: "Secondo le impostazioni del fornitore di hosting, comunque non oltre 12 mesi",
	},
];

function Section({
	number,
	title,
	children,
}: {
	number: number;
	title: string;
	children: ReactNode;
}) {
	return (
		<section className="border-border border-t pt-8">
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
		<article className="mx-auto w-full max-w-3xl px-6 pb-24 lg:px-12">
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
						Non c'è nessuna raccolta «di sfondo»: i dati arrivano solo da quello
						che scrivi tu nei due moduli del sito, più i dati tecnici che
						qualunque server registra quando visiti una pagina.
					</p>

					<div className="flex flex-col gap-6 pt-2">
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

						<Block title="Prenotazione di un campo">
							La prenotazione <Term>non avviene su questo sito</Term>: il
							pulsante «Prenota una partita» ti porta sulla piattaforma esterna
							SumUp, dove inserisci i tuoi dati (nome, contatti, orario e
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

						<Block title="Navigazione del sito">
							Come ogni server web, l'infrastruttura che ospita il sito registra
							dati tecnici: indirizzo IP, tipo di browser e dispositivo, pagina
							richiesta, data e ora. Raccogliamo inoltre statistiche di traffico{" "}
							<Term>aggregate e senza cookie</Term>, che ci dicono quante visite
							riceve una pagina ma non chi sei. Base giuridica: nostro legittimo
							interesse alla sicurezza e al buon funzionamento del sito (art.
							6.1.f GDPR).
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
						nascosta. Quando invii uno dei due moduli:
					</p>
					<ol className="flex list-decimal flex-col gap-2 pl-5">
						<li>
							i dati viaggiano cifrati (HTTPS) dal tuo browser al sito, ospitato
							su Vercel;
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
						per finalità di marketing, né nostre né di terzi, e non ti
						iscriviamo a nessuna newsletter.
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
						I dati possono inoltre essere comunicati alle autorità pubbliche
						quando la legge lo impone, e ai professionisti che assistono il club
						(per esempio il consulente contabile) nei limiti dei rispettivi
						incarichi.
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

				<Section number={8} title="Cookie e memoria del browser">
					<p>
						Il sito <Term>non usa cookie di profilazione</Term>, non ospita
						pubblicità e non condivide dati con circuiti pubblicitari. Per
						questo non trovi un banner di consenso: gli unici strumenti attivi
						sono tecnici e necessari.
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
							<Term>Statistiche di traffico</Term>: raccolte in forma aggregata
							dal fornitore di hosting, senza cookie e senza costruire un
							profilo della persona.
						</li>
						<li>
							<Term>Caratteri tipografici</Term>: serviti dal nostro stesso
							dominio, quindi il tuo browser non contatta server esterni per
							scaricarli.
						</li>
					</ul>
					<p>
						Puoi cancellare cookie e memoria locale in qualsiasi momento dalle
						impostazioni del browser: perderesti solo la sessione di accesso e
						la preferenza del tema.
					</p>
				</Section>

				<Section
					number={9}
					title="Nessuna profilazione, nessuna decisione automatica"
				>
					<p>
						Non profiliamo le persone, non prendiamo decisioni automatizzate che
						producano effetti giuridici su di te e non usiamo i tuoi dati per
						addestrare sistemi di intelligenza artificiale. Le richieste che
						arrivano dal sito le legge e le lavora una persona della segreteria.
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
