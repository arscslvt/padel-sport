"use client";

import {
	Loader2,
	Minus,
	Plus,
	TriangleAlert,
	UserRoundPen,
	UserRoundPlus,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FormRow } from "@/lib/event-forms";
import { isRsvpClosed, STAFF_MAX_GUESTS, seatsLabel } from "@/lib/event-rsvp";

/**
 * Le iscrizioni scritte a mano dalla segreteria.
 *
 * Il modulo del sito raccoglie finché è aperto: queste due finestrelle sono per
 * tutto il resto — la telefonata del giorno dopo la scadenza, i due cugini che
 * si presentano insieme a chi si era iscritto da solo. Per questo nessuna delle
 * due guarda `closesAt`: una scadenza chiude un modulo, non un evento.
 *
 * La capienza invece si guarda, ma per dirla: se il posto non c'è l'avviso lo
 * scrive e il tasto diventa quello del «comunque». Chi sta al banco la sala ce
 * l'ha davanti agli occhi, e una sedia in più la sa trovare meglio di noi.
 */

type GuestStepperProps = {
	value: number;
	onChange: (guests: number) => void;
	disabled?: boolean;
};

/**
 * Il numero di accompagnatori, col dito.
 *
 * Due tasti e non la tendina del sito: lì l'elenco è corto e si sceglie una
 * volta sola, qui il gesto vero è «uno in più», fatto al banco mentre si guarda
 * la persona che se l'è portato dietro.
 */
function GuestStepper({ value, onChange, disabled }: GuestStepperProps) {
	return (
		<fieldset className="flex items-center gap-3">
			<legend className="sr-only">Accompagnatori</legend>
			<Button
				type="button"
				variant="outline"
				size="icon"
				className="size-10"
				disabled={disabled || value <= 0}
				onClick={() => onChange(value - 1)}
				aria-label="Un accompagnatore in meno"
			>
				<Minus className="size-4" />
			</Button>
			<span
				aria-live="polite"
				className="w-8 text-center text-2xl font-semibold tabular-nums"
			>
				{value}
			</span>
			<Button
				type="button"
				variant="outline"
				size="icon"
				className="size-10"
				disabled={disabled || value >= STAFF_MAX_GUESTS}
				onClick={() => onChange(value + 1)}
				aria-label="Un accompagnatore in più"
			>
				<Plus className="size-4" />
			</Button>
			<p className="text-sm text-muted-foreground">
				{value === 0 ? "Viene da solo" : `${seatsLabel(value + 1)} in tutto`}
			</p>
		</fieldset>
	);
}

/**
 * L'avviso della capienza superata.
 *
 * Non impedisce niente: dice il numero e lascia decidere. Un modulo che si
 * rifiuta di registrare qualcuno che è già entrato non protegge la sala, fa
 * solo sparire una persona dai conti della serata.
 */
function CapacityWarning({
	seatsLeft,
	needed,
}: {
	seatsLeft: number;
	needed: number;
}) {
	return (
		<Alert variant="destructive">
			<TriangleAlert />
			<AlertTitle>Oltre la capienza</AlertTitle>
			<AlertDescription>
				{seatsLeft === 0
					? "I posti sono esauriti"
					: `Resta${seatsLeft === 1 ? "" : "no"} ${seatsLabel(seatsLeft)}`}{" "}
				e ne {needed === 1 ? "serve" : "servono"} {needed}. Puoi registrare lo
				stesso: l'evento risulterà oltre i posti previsti.
			</AlertDescription>
		</Alert>
	);
}

/** Il promemoria che questa è la porta di servizio, quando l'altra è chiusa. */
function ClosedNote({ form }: { form: FormRow }) {
	if (!isRsvpClosed(form.closesAt)) return null;

	return (
		<p className="text-sm text-muted-foreground">
			Le iscrizioni online sono chiuse: la scadenza vale per il modulo del sito,
			non per te.
		</p>
	);
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function NewRsvpDialog({
	form,
	seatsLeft,
	onCreated,
}: {
	form: FormRow;
	/** Posti rimasti secondo l'elenco già caricato. `null` = nessuna capienza. */
	seatsLeft: number | null;
	onCreated: () => void;
}) {
	const [open, setOpen] = useState(false);
	const [saving, setSaving] = useState(false);
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [guests, setGuests] = useState(0);
	/**
	 * La conferma vale soprattutto per il link di annullamento che porta dentro:
	 * senza, l'unico modo di tirarsi indietro è telefonare. Si toglie la spunta
	 * quando la persona è già davanti al banco e la mail sarebbe una notifica a
	 * cose fatte.
	 */
	const [notify, setNotify] = useState(true);
	/** Il server ha detto «pieno»: il tasto diventa quello del «comunque». */
	const [full, setFull] = useState(false);

	const seats = guests + 1;
	const over = seatsLeft !== null && seats > seatsLeft;
	const forcing = over || full;
	const valid = name.trim().length >= 2 && EMAIL_PATTERN.test(email.trim());

	const changeGuests = (next: number) => {
		setGuests(next);
		// Il «pieno» detto dal server valeva per il numero di prima: cambiandolo,
		// l'avviso torna a essere quello che si calcola da soli.
		setFull(false);
	};

	const reset = () => {
		setName("");
		setEmail("");
		setGuests(0);
		setNotify(true);
		setFull(false);
	};

	const create = async () => {
		setSaving(true);

		try {
			const response = await fetch("/api/dashboard/events/rsvps", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					slug: form.eventSlug,
					blockKey: form.blockKey,
					name: name.trim(),
					email: email.trim().toLowerCase(),
					guests,
					notify,
					override: forcing,
				}),
			});

			const payload = await response.json().catch(() => null);

			if (!response.ok) {
				/*
				 * `full` dal server vuol dire che i posti erano finiti mentre questa
				 * finestra stava aperta: l'avviso si accende adesso, e la seconda
				 * pressione passa. Non è un errore da riprovare uguale, è una cosa da
				 * sapere prima di insistere.
				 */
				if (payload?.code === "full") setFull(true);

				toast.error("Iscrizione non registrata", {
					description: payload?.error ?? "Riprova fra poco.",
				});
				return;
			}

			toast.success("Iscrizione registrata", {
				description: payload?.notified
					? `${name.trim()} è in elenco e ha ricevuto la conferma via email.`
					: `${name.trim()} è in elenco. Nessuna mail è partita.`,
			});

			reset();
			setOpen(false);
			onCreated();
		} catch {
			toast.error("Iscrizione non registrata", {
				description: "Controlla la connessione e riprova.",
			});
		} finally {
			setSaving(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button size="sm">
					<UserRoundPlus className="size-4" />
					Nuova iscrizione
				</Button>
			</DialogTrigger>

			<DialogContent className="max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Iscrivi una persona</DialogTitle>
					<DialogDescription>
						Chi si è fatto vivo al telefono o al banco. Finisce in elenco come
						tutti gli altri, e conta per i posti.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<div className="space-y-1.5">
						<Label htmlFor="rsvp-name">Nome</Label>
						<Input
							id="rsvp-name"
							value={name}
							onChange={(event) => setName(event.target.value)}
							placeholder="Mario Rossi"
							autoFocus
						/>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="rsvp-email">Email</Label>
						<Input
							id="rsvp-email"
							type="email"
							inputMode="email"
							value={email}
							onChange={(event) => setEmail(event.target.value)}
							placeholder="mario.rossi@esempio.it"
						/>
						<p className="text-xs text-muted-foreground">
							Serve a riconoscere i doppioni e a mandargli le comunicazioni
							dell'evento.
						</p>
					</div>

					<div className="space-y-2">
						<Label>Accompagnatori</Label>
						<GuestStepper
							value={guests}
							onChange={changeGuests}
							disabled={saving}
						/>
						{form.maxGuests != null && guests > form.maxGuests && (
							<p className="text-xs text-muted-foreground">
								Dal sito ne avrebbe potuti indicare al massimo {form.maxGuests}.
							</p>
						)}
					</div>

					<label
						htmlFor="rsvp-notify"
						className="flex cursor-pointer items-start gap-3 rounded-lg border p-3"
					>
						<Checkbox
							id="rsvp-notify"
							checked={notify}
							onCheckedChange={(value) => setNotify(value === true)}
							className="mt-0.5"
						/>
						<span className="text-sm">
							Manda la conferma via email
							<span className="block text-xs text-muted-foreground">
								Contiene data, numero di persone e il link per annullare.
							</span>
						</span>
					</label>

					<ClosedNote form={form} />

					{forcing && seatsLeft !== null && (
						<CapacityWarning seatsLeft={seatsLeft} needed={seats} />
					)}
				</div>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => setOpen(false)}
						disabled={saving}
					>
						Annulla
					</Button>
					<Button onClick={create} disabled={!valid || saving}>
						{saving && <Loader2 className="size-4 animate-spin" />}
						{forcing ? "Iscrivi comunque" : "Iscrivi"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export function GuestsDialog({
	form,
	entry,
	seatsLeft,
	onSaved,
}: {
	form: FormRow;
	entry: { id: string; name: string; guests: number };
	/** Posti rimasti secondo l'elenco già caricato. `null` = nessuna capienza. */
	seatsLeft: number | null;
	onSaved: () => void;
}) {
	const [open, setOpen] = useState(false);
	const [saving, setSaving] = useState(false);
	const [guests, setGuests] = useState(entry.guests);
	const [full, setFull] = useState(false);

	/** Quanti posti in più chiede la modifica: scendendo non ne chiede nessuno. */
	const needed = Math.max(guests - entry.guests, 0);
	const over = seatsLeft !== null && needed > seatsLeft;
	const forcing = over || full;

	const changeGuests = (next: number) => {
		setGuests(next);
		setFull(false);
	};

	/**
	 * Riaprendo, il numero riparte da quello che c'è scritto in elenco: la
	 * finestra di prima può essere stata chiusa a metà, o l'iscrizione può essere
	 * cambiata nel frattempo da un'altra postazione.
	 */
	const toggle = (next: boolean) => {
		if (next) {
			setGuests(entry.guests);
			setFull(false);
		}
		setOpen(next);
	};

	const save = async () => {
		setSaving(true);

		try {
			const response = await fetch("/api/dashboard/events/rsvps", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					id: entry.id,
					slug: form.eventSlug,
					blockKey: form.blockKey,
					guests,
					override: forcing,
				}),
			});

			const payload = await response.json().catch(() => null);

			if (!response.ok) {
				if (payload?.code === "full") setFull(true);

				toast.error("Accompagnatori non aggiornati", {
					description: payload?.error ?? "Riprova fra poco.",
				});
				return;
			}

			toast.success("Iscrizione aggiornata", {
				description: `${entry.name}: ${seatsLabel(guests + 1)}.`,
			});

			setOpen(false);
			onSaved();
		} catch {
			toast.error("Accompagnatori non aggiornati", {
				description: "Controlla la connessione e riprova.",
			});
		} finally {
			setSaving(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={toggle}>
			<DialogTrigger asChild>
				<Button size="sm" variant="ghost">
					<UserRoundPen className="size-4" />
					<span className="sr-only">Cambia gli accompagnatori</span>
				</Button>
			</DialogTrigger>

			<DialogContent>
				<DialogHeader>
					<DialogTitle>Accompagnatori di {entry.name}</DialogTitle>
					<DialogDescription>
						Quante persone porta con sé. Il resto dell'iscrizione — nome, email,
						ora di arrivo, spunte già fatte — resta com'è.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<GuestStepper
						value={guests}
						onChange={changeGuests}
						disabled={saving}
					/>

					{guests < entry.guests && (
						<p className="text-sm text-muted-foreground">
							Si liberano {seatsLabel(entry.guests - guests)}. Le spunte degli
							accompagnatori che tolgi spariscono dalla lista arrivi.
						</p>
					)}

					<ClosedNote form={form} />

					{forcing && seatsLeft !== null && (
						<CapacityWarning seatsLeft={seatsLeft} needed={needed} />
					)}
				</div>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => setOpen(false)}
						disabled={saving}
					>
						Annulla
					</Button>
					<Button onClick={save} disabled={saving || guests === entry.guests}>
						{saving && <Loader2 className="size-4 animate-spin" />}
						{forcing ? "Salva comunque" : "Salva"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
