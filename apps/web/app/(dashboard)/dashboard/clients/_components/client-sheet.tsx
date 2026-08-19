"use client";

import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
  BadgeCheck,
  Loader2,
  MailX,
  Save,
  Send,
  Trash2,
  UserRoundCheck,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

import { AccountBadge } from "./account-badge";
import { MembershipBadge } from "./membership-badge";
import {
  EMPTY_OPTIONAL,
  OptionalFields,
  type OptionalFieldsValue,
  optionalPayload,
} from "./optional-fields";
import { ResidenceFields, residencePayload } from "./residence-fields";
import type { ClientDetail, Gender, Residence } from "./types";

/**
 * La scheda del cliente: anagrafica a sinistra, tessera a destra.
 *
 * Le due metà rispondono a due domande diverse che lo staff si fa allo
 * sportello — «chi è» e «è in regola» — e per questo stanno separate invece di
 * essere un modulo unico da salvare tutto insieme.
 */

const GENDER_LABELS: Record<Gender, string> = {
  f: "Donna",
  m: "Uomo",
  other: "Altro",
  unspecified: "Non dichiarato",
};

const CONSENT_LABELS = {
  marketing: "Promozioni",
  newsletter: "Newsletter",
  tracking: "Statistiche",
} as const;

/** Dodici mesi: la durata dell'iscrizione, come la calcola il server. */
const MEMBERSHIP_MS = 365 * 24 * 60 * 60 * 1000;

function toDateInput(timestamp?: number): string {
  return timestamp ? new Date(timestamp).toISOString().slice(0, 10) : "";
}

function fromDateInput(value: string): number | undefined {
  return value ? new Date(`${value}T12:00:00`).getTime() : undefined;
}

export function ClientSheet({
  playerId,
  open,
  onOpenChange,
  onSaved,
}: {
  playerId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Anagrafica
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<Gender | undefined>();
  const [residence, setResidence] = useState<Residence>({});
  const [optional, setOptional] = useState<OptionalFieldsValue>(EMPTY_OPTIONAL);

  // Tessera
  const [paid, setPaid] = useState(true);
  const [method, setMethod] = useState<"cash" | "pos">("cash");
  const [amount, setAmount] = useState("");
  const [startsAt, setStartsAt] = useState("");

  useEffect(() => {
    if (!playerId || !open) return;

    let cancelled = false;
    setLoading(true);

    fetch(`/api/dashboard/clients/${playerId}`)
      .then((response) => response.json())
      .then((payload) => {
        if (cancelled) return;

        const detail: ClientDetail | undefined = payload?.client;
        if (!detail) {
          toast.error(payload?.error ?? "Scheda non disponibile.");
          return;
        }

        setClient(detail);
        setFirstName(detail.firstName ?? "");
        setLastName(detail.lastName ?? "");
        setEmail(detail.email ?? "");
        setPhone(detail.phone ?? "");
        setBirthDate(toDateInput(detail.birthDate));
        setGender(detail.gender);
        setResidence(detail.residence ?? {});
        setOptional({
          taxCode: detail.taxCode ?? "",
          health: detail.health ?? {},
          clubNotes: detail.clubNotes ?? "",
        });

        // La proposta di partenza: dove finisce la tessera in corso, così un
        // rinnovo anticipato non fa perdere giorni. Altrimenti oggi.
        const last = detail.memberships.reduce<number | null>(
          (latest, row) =>
            latest === null || row.endsAt > latest ? row.endsAt : latest,
          null,
        );
        setStartsAt(toDateInput(last && last > Date.now() ? last : Date.now()));
      })
      .catch(() => {
        if (!cancelled) toast.error("Scheda non disponibile.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [playerId, open]);

  /** Ricarica la scheda dopo un'azione che ne cambia lo stato. */
  const refresh = async () => {
    if (!playerId) return;
    const payload = await fetch(`/api/dashboard/clients/${playerId}`)
      .then((response) => response.json())
      .catch(() => null);
    if (payload?.client) setClient(payload.client);
  };

  const invite = async () => {
    if (!playerId) return;

    setSaving(true);
    try {
      const response = await fetch(
        `/api/dashboard/clients/${playerId}/invite`,
        { method: "POST" },
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error("Invito non inviato", {
          description: payload?.error ?? "Riprova fra poco.",
        });
        return;
      }

      const resent = (payload?.sentCount ?? 1) > 1;

      // La mail può non partire (Resend non configurato, o giù): l'invito
      // esiste lo stesso, e il link va dato a voce invece di far credere allo
      // staff che la persona l'abbia ricevuto.
      toast[payload?.mailed ? "success" : "warning"](
        payload?.mailed
          ? resent
            ? "Invito rimandato"
            : "Invito inviato"
          : "Invito creato, mail non partita",
        {
          description: payload?.mailed
            ? "Riceverà il link per attivare il suo account. Il link precedente, se c'era, non vale più."
            : `Manda tu il link: ${payload?.joinUrl ?? ""}`,
          duration: payload?.mailed ? 5000 : Number.POSITIVE_INFINITY,
        },
      );

      onSaved();
      await refresh();
    } catch {
      toast.error("Invito non inviato", {
        description: "Controlla la connessione e riprova.",
      });
    } finally {
      setSaving(false);
    }
  };

  const revokeInvite = async () => {
    if (!playerId) return;

    setSaving(true);
    try {
      const response = await fetch(
        `/api/dashboard/clients/${playerId}/invite`,
        { method: "DELETE" },
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error("Invito non annullato", {
          description: payload?.error ?? "Riprova fra poco.",
        });
        return;
      }

      toast.success("Invito annullato", {
        description:
          "Il link non funziona più e la scheda torna senza account.",
      });

      onSaved();
      await refresh();
    } catch {
      toast.error("Invito non annullato", {
        description: "Controlla la connessione e riprova.",
      });
    } finally {
      setSaving(false);
    }
  };

  const removeClient = async () => {
    if (!playerId) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/dashboard/clients/${playerId}`, {
        method: "DELETE",
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error("Scheda non eliminata", {
          description: payload?.error ?? "Riprova fra poco.",
        });
        return;
      }

      toast.success("Scheda eliminata");
      onOpenChange(false);
      onSaved();
    } catch {
      toast.error("Scheda non eliminata", {
        description: "Controlla la connessione e riprova.",
      });
    } finally {
      setSaving(false);
    }
  };

  /** Eliminare un cliente non è un gesto da fare di sfuggita. */
  const confirmRemove = () => {
    toast("Eliminare questa scheda?", {
      description: (
        <>
          <span className="font-medium">{client?.name}</span> sparisce
          dall'anagrafica insieme alle sue tessere. Non è reversibile.
          <div className="mt-3 flex gap-2">
            <Button
              variant="outline"
              className="flex-1 bg-transparent"
              onClick={() => toast.dismiss()}
            >
              Annulla
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => {
                toast.dismiss();
                void removeClient();
              }}
            >
              <Trash2 className="size-4" />
              Elimina
            </Button>
          </div>
        </>
      ),
      duration: Number.POSITIVE_INFINITY,
    });
  };

  const saveProfile = async () => {
    if (!playerId) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/dashboard/clients/${playerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
          email: email.trim().toLowerCase() || undefined,
          phone: phone.trim() || undefined,
          birthDate: fromDateInput(birthDate),
          gender,
          residence: residencePayload(residence),
          ...optionalPayload(optional),
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error("Dati non salvati", {
          description: payload?.error ?? "Riprova fra poco.",
        });
        return;
      }

      toast.success("Anagrafica aggiornata");
      onSaved();
      await refresh();
    } catch {
      toast.error("Dati non salvati", {
        description: "Controlla la connessione e riprova.",
      });
    } finally {
      setSaving(false);
    }
  };

  const saveMembership = async () => {
    if (!playerId) return;

    setSaving(true);
    try {
      const response = await fetch(
        `/api/dashboard/clients/${playerId}/membership`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paid,
            method: paid ? method : undefined,
            amount: amount ? Number(amount) : undefined,
            startsAt: fromDateInput(startsAt),
          }),
        },
      );

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error("Tessera non salvata", {
          description: payload?.error ?? "Riprova fra poco.",
        });
        return;
      }

      toast.success(payload?.renewed ? "Tessera rinnovata" : "Tessera aperta", {
        description: paid
          ? "Iscrizione valida per dodici mesi, quota registrata."
          : "Iscrizione aperta: risulterà da pagare finché non incassate.",
      });

      onSaved();
      // Ricarica la scheda per mostrare la nuova riga nello storico.
      await refresh();
    } catch {
      toast.error("Tessera non salvata", {
        description: "Controlla la connessione e riprova.",
      });
    } finally {
      setSaving(false);
    }
  };

  const current = client?.memberships[0];

  // La scadenza che la data scelta produrrà: si vede prima di salvare.
  const chosenStart = fromDateInput(startsAt);
  const membershipEnd = chosenStart ? chosenStart + MEMBERSHIP_MS : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {loading || !client ? (
          <div className="space-y-4 p-6">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <>
            <SheetHeader>
              <div className="flex items-center gap-3">
                <Avatar className="size-11">
                  {client.avatarUrl && <AvatarImage src={client.avatarUrl} />}
                  <AvatarFallback>
                    {client.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <SheetTitle className="truncate">{client.name}</SheetTitle>
                  <SheetDescription className="truncate">
                    {client.email ?? "Email non disponibile"}
                  </SheetDescription>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <MembershipBadge
                  state={client.membershipState}
                  until={
                    current
                      ? format(current.endsAt, "d MMM yyyy", { locale: it })
                      : undefined
                  }
                />
                <AccountBadge state={client.account.state} />
                {client.code && (
                  <Badge variant="outline" className="font-mono">
                    #{client.code}
                  </Badge>
                )}
              </div>
            </SheetHeader>

            <div className="space-y-8 px-4 pb-8">
              <section className="space-y-4">
                <h3 className="text-sm font-semibold">Anagrafica</h3>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="sheet-firstName">Nome</Label>
                    <Input
                      id="sheet-firstName"
                      value={firstName}
                      onChange={(event) => setFirstName(event.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sheet-lastName">Cognome</Label>
                    <Input
                      id="sheet-lastName"
                      value={lastName}
                      onChange={(event) => setLastName(event.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sheet-phone">Telefono</Label>
                    <Input
                      id="sheet-phone"
                      type="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sheet-birth">Data di nascita</Label>
                    <Input
                      id="sheet-birth"
                      type="date"
                      value={birthDate}
                      onChange={(event) => setBirthDate(event.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="sheet-email">Email</Label>
                    <Input
                      id="sheet-email"
                      type="email"
                      inputMode="email"
                      value={email}
                      disabled={client.account.state !== "none"}
                      onChange={(event) => setEmail(event.target.value)}
                    />
                  </div>
                  <ResidenceFields
                    value={residence}
                    onChange={setResidence}
                    idPrefix="sheet"
                  />

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="sheet-gender">Sesso</Label>
                    <Select
                      value={gender}
                      onValueChange={(value) => setGender(value as Gender)}
                    >
                      <SelectTrigger id="sheet-gender" className="w-full">
                        <SelectValue placeholder="Non indicato" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(GENDER_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <p className="text-muted-foreground text-xs leading-relaxed">
                  {client.account.state === "none"
                    ? "L'email si può ancora correggere: diventerà l'identità dell'account quando lo inviterai."
                    : "L'email e la foto appartengono all'account e si cambiano da lì."}
                </p>

                <OptionalFields
                  value={optional}
                  onChange={setOptional}
                  idPrefix="sheet"
                />

                <Button onClick={() => void saveProfile()} disabled={saving}>
                  {saving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  Salva anagrafica
                </Button>
              </section>

              <section className="space-y-3 border-t pt-6">
                <h3 className="text-sm font-semibold">Account</h3>

                {client.account.state === "none" && (
                  <>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {email.trim()
                        ? "Questa persona non ha ancora un modo per entrare. Invitandola riceverà un link per attivare l'account: da lì prenota online, senza password."
                        : "Per invitare questa persona serve un indirizzo email: aggiungilo qui sopra e salva l'anagrafica."}
                    </p>

                    <Button
                      onClick={() => void invite()}
                      disabled={saving || !email.trim()}
                    >
                      {saving ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Send className="size-4" />
                      )}
                      Invita ad attivare l'account
                    </Button>
                  </>
                )}

                {client.account.state === "invited" && (
                  <>
                    <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                      <p className="font-medium">
                        Invitato il{" "}
                        {client.account.invitedAt
                          ? format(client.account.invitedAt, "d MMMM yyyy", {
                              locale: it,
                            })
                          : "—"}
                      </p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {(client.account.sentCount ?? 1) > 1
                          ? `Mail inviata ${client.account.sentCount} volte, l'ultima il ${
                              client.account.lastSentAt
                                ? format(client.account.lastSentAt, "d MMM", {
                                    locale: it,
                                  })
                                : "—"
                            }.`
                          : "Non ha ancora attivato l'account."}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        onClick={() => void invite()}
                        disabled={saving}
                      >
                        {saving ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Send className="size-4" />
                        )}
                        Rimanda invito
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => void revokeInvite()}
                        disabled={saving}
                      >
                        <MailX className="size-4" />
                        Annulla invito
                      </Button>
                    </div>
                  </>
                )}

                {client.account.state === "active" && (
                  <div className="flex items-start gap-2.5 rounded-lg border bg-muted/20 p-3 text-sm">
                    <UserRoundCheck className="mt-0.5 size-4 shrink-0" />
                    <div>
                      <p className="font-medium">Account attivo</p>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {client.account.acceptedAt
                          ? `Attivato il ${format(client.account.acceptedAt, "d MMMM yyyy", { locale: it })}: prenota dal sito e dall'app.`
                          : "Prenota dal sito e dall'app."}
                      </p>
                    </div>
                  </div>
                )}
              </section>

              <section className="space-y-4 border-t pt-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Iscrizione al club</h3>
                  {client.consents && (
                    <div className="flex gap-1.5">
                      {Object.entries(CONSENT_LABELS).map(([key, label]) =>
                        client.consents?.[
                          key as keyof typeof CONSENT_LABELS
                        ] ? (
                          <Badge
                            key={key}
                            variant="outline"
                            className="bg-white font-normal"
                          >
                            {label}
                          </Badge>
                        ) : null,
                      )}
                    </div>
                  )}
                </div>

                {current ? (
                  <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                    <p className="font-medium">
                      {format(current.startsAt, "d MMM yyyy", { locale: it })} –{" "}
                      {format(current.endsAt, "d MMM yyyy", { locale: it })}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {current.paid
                        ? `Pagata${current.paidAt ? ` il ${format(current.paidAt, "d MMM yyyy", { locale: it })}` : ""}${current.method ? ` · ${current.method === "cash" ? "contanti" : "POS"}` : ""}${current.amount ? ` · ${current.amount} EUR` : ""}`
                        : "Non ancora saldata"}
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Nessuna tessera: questa persona non risulta iscritta.
                  </p>
                )}

                <div className="space-y-3 rounded-lg border p-3">
                  <p className="text-sm font-medium">
                    {current
                      ? "Rinnova per un altro anno"
                      : "Apri l'iscrizione"}
                  </p>

                  <div className="space-y-1.5">
                    <Label htmlFor="startsAt">Data di inizio</Label>
                    <Input
                      id="startsAt"
                      type="date"
                      value={startsAt}
                      onChange={(event) => setStartsAt(event.target.value)}
                    />
                    <p className="text-muted-foreground text-xs">
                      {membershipEnd
                        ? `Valida fino al ${format(membershipEnd, "d MMMM yyyy", { locale: it })}.`
                        : "Dodici mesi da questa data."}{" "}
                      Si può mettere una data passata, per registrare
                      un'iscrizione già avvenuta quest'anno.
                    </p>
                  </div>

                  <label
                    htmlFor="paid"
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <Checkbox
                      id="paid"
                      checked={paid}
                      onCheckedChange={(checked) => setPaid(Boolean(checked))}
                    />
                    Quota già incassata
                  </label>

                  {paid && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="method">Modalità</Label>
                        <Select
                          value={method}
                          onValueChange={(value) =>
                            setMethod(value as "cash" | "pos")
                          }
                        >
                          <SelectTrigger id="method" className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">Contanti</SelectItem>
                            <SelectItem value="pos">POS</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="amount">Importo (EUR)</Label>
                        <Input
                          id="amount"
                          type="number"
                          inputMode="decimal"
                          min={0}
                          placeholder="facoltativo"
                          value={amount}
                          onChange={(event) => setAmount(event.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={() => void saveMembership()}
                    disabled={saving}
                    className="w-full"
                  >
                    {saving ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : current ? (
                      <BadgeCheck className="size-4" />
                    ) : (
                      <Wallet className="size-4" />
                    )}
                    {current ? "Rinnova per 12 mesi" : "Iscrivi per 12 mesi"}
                  </Button>

                  <p className="text-muted-foreground text-xs leading-relaxed">
                    La data proposta è quella in cui finisce la tessera in
                    corso, così chi rinnova in anticipo non perde giorni.
                  </p>
                </div>

                {client.account.state === "none" && (
                  <div className="border-t pt-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={confirmRemove}
                      disabled={saving}
                    >
                      <Trash2 className="size-4" />
                      Elimina questa scheda
                    </Button>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Possibile finché la persona non ha un account né
                      prenotazioni alle spalle.
                    </p>
                  </div>
                )}

                {client.memberships.length > 1 && (
                  <div>
                    <p className="text-muted-foreground mb-2 text-xs tracking-wide uppercase">
                      Storico
                    </p>
                    <ul className="space-y-1.5 text-xs">
                      {client.memberships.slice(1).map((membership) => (
                        <li
                          key={membership.id}
                          className="text-muted-foreground flex justify-between gap-3"
                        >
                          <span>
                            {format(membership.startsAt, "MMM yyyy", {
                              locale: it,
                            })}{" "}
                            –{" "}
                            {format(membership.endsAt, "MMM yyyy", {
                              locale: it,
                            })}
                          </span>
                          <span>
                            {membership.paid
                              ? `pagata${membership.method ? ` · ${membership.method === "cash" ? "contanti" : "POS"}` : ""}`
                              : "non pagata"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
