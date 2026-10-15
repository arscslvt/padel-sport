"use client";

import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Loader2, ShieldCheck, UserPlus, UserRound } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type FormEvent, useCallback, useEffect, useId, useState } from "react";
import { toast } from "sonner";

import { ListGroup, ListRow } from "@/app/_components/list";
import { SheetHeader } from "@/app/_components/sheet-header";
import { useConfirm, useConfirmLeave } from "@/app/_providers/confirm.provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ResponsiveDrawer,
  ResponsiveDrawerContent,
  ResponsiveDrawerFooter,
} from "@/components/ui/responsive-drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { EASE_OUT, UI_DURATION } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface Member {
  userId: string;
  name: string;
  email: string | null;
  imageUrl: string | null;
  isAdmin: boolean;
  isYou: boolean;
  /** Da quando è nello staff, in millisecondi. */
  since: number;
}

type Role = "org:member" | "org:admin";

const ROLES: { value: Role; label: string; hint: string }[] = [
  {
    value: "org:member",
    label: "Staff",
    hint: "Usa il gestionale: agenda, richieste, clienti, punti.",
  },
  {
    value: "org:admin",
    label: "Amministratore",
    hint: "In più vede lo staff, aggiunge e toglie persone.",
  },
];

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

/**
 * Lo staff del club, nel profilo di chi lo amministra.
 *
 * Un elenco solo, con gli amministratori in cima e te segnato. Toccando una
 * persona si apre il suo pannello, da cui la si toglie; l'ultima riga
 * aggiunge qualcuno. Chi non è amministratore questa sezione non la vede, e
 * le route rifiutano comunque le sue richieste.
 */
export function StaffSection() {
  const reduce = useReducedMotion();
  const [members, setMembers] = useState<Member[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<Member | null>(null);
  const [inviting, setInviting] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/dashboard/staff", {
        cache: "no-store",
      });
      if (!response.ok) throw new Error();
      const payload = (await response.json()) as { members: Member[] };
      setMembers(payload.members);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <ListGroup>
        {failed && !members ? (
          <div className="flex min-h-14 items-center justify-between gap-3 px-4 py-2.5">
            <p className="text-muted-foreground text-[15px]">
              Non riusciamo a caricare lo staff.
            </p>
            <Button variant="ghost" size="sm" onClick={() => void load()}>
              Riprova
            </Button>
          </div>
        ) : members === null ? (
          <MemberSkeleton />
        ) : (
          <AnimatePresence initial={false}>
            {members.map((member) => (
              <motion.div
                key={member.userId}
                layout={reduce ? false : "position"}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: UI_DURATION.enter, ease: EASE_OUT }}
              >
                <ListRow
                  leading={<MemberAvatar member={member} />}
                  title={member.name}
                  subtitle={member.email ?? undefined}
                  trailing={<MemberBadges member={member} />}
                  chevron
                  onClick={() => setSelected(member)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        <ListRow
          leading={<UserPlus className="size-5" />}
          title="Aggiungi allo staff"
          onClick={() => setInviting(true)}
          className="text-primary [&_svg]:text-primary"
        />
      </ListGroup>

      <MemberSheet
        member={selected}
        onClose={() => setSelected(null)}
        onRemoved={(userId) => {
          setSelected(null);
          setMembers(
            (current) =>
              current?.filter((member) => member.userId !== userId) ?? null,
          );
        }}
      />

      <InviteSheet
        open={inviting}
        onOpenChange={setInviting}
        onAdded={() => void load()}
      />
    </>
  );
}

function MemberAvatar({ member }: { member: Member }) {
  return (
    <Avatar className="size-9 text-xs">
      {member.imageUrl && <AvatarImage src={member.imageUrl} alt="" />}
      <AvatarFallback>{initials(member.name)}</AvatarFallback>
    </Avatar>
  );
}

function MemberBadges({ member }: { member: Member }) {
  if (!member.isYou && !member.isAdmin) return null;

  return (
    <span className="flex items-center gap-1.5">
      {member.isYou && <Badge variant="outline">Tu</Badge>}
      {member.isAdmin && <Badge variant="secondary">Admin</Badge>}
    </span>
  );
}

function MemberSkeleton() {
  return (
    <>
      {[0, 1].map((row) => (
        <div
          key={row}
          aria-hidden
          className="flex min-h-14 items-center gap-3 px-4 py-2.5"
        >
          <Skeleton className="size-9 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-48 max-w-full" />
          </div>
        </div>
      ))}
    </>
  );
}

/**
 * Una persona dello staff: chi è, da quando, con che ruolo. Da qui la si
 * toglie, con una conferma che dice cosa succede e cosa no. Su sé stessi il
 * tasto non c'è: un amministratore deve sempre restare.
 */
function MemberSheet({
  member,
  onClose,
  onRemoved,
}: {
  member: Member | null;
  onClose: () => void;
  onRemoved: (userId: string) => void;
}) {
  const confirm = useConfirm();
  const [removing, setRemoving] = useState(false);
  // L'ultima persona aperta resta disegnata mentre il pannello si chiude.
  const [shown, setShown] = useState<Member | null>(member);
  useEffect(() => {
    if (member) setShown(member);
  }, [member]);

  const remove = async () => {
    if (!shown) return;
    const firstName = shown.name.split(" ")[0];

    const ok = await confirm({
      title: `Togliere ${firstName} dallo staff?`,
      description:
        "Perde subito l'accesso al gestionale, e i suoi dispositivi smettono di ricevere le notifiche. L'account resta: se è anche cliente, continua a prenotare dal sito e dall'app.",
      confirmLabel: "Togli dallo staff",
      tone: "destructive",
    });
    if (!ok) return;

    setRemoving(true);
    try {
      const response = await fetch(
        `/api/dashboard/staff/${encodeURIComponent(shown.userId)}`,
        { method: "DELETE" },
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error("Non tolto dallo staff", {
          description: payload?.error ?? "Riprova tra poco.",
        });
        return;
      }

      toast.success(`${firstName} non è più nello staff`, {
        description:
          payload?.devicesRemoved === null
            ? "Controlla in Configurazione che i suoi dispositivi non ricevano più le notifiche."
            : undefined,
      });
      onRemoved(shown.userId);
    } catch {
      toast.error("Non tolto dallo staff", {
        description: "Controlla la connessione e riprova.",
      });
    } finally {
      setRemoving(false);
    }
  };

  return (
    <ResponsiveDrawer
      open={member !== null}
      setOpen={(open) => {
        if (!open) onClose();
      }}
    >
      <ResponsiveDrawerContent className="sm:max-w-md">
        {shown && (
          <>
            <SheetHeader
              title={shown.name}
              description={shown.email ?? undefined}
            />

            <div className="space-y-4 px-4 pb-2 md:px-0">
              <ListGroup>
                <ListRow
                  leading={
                    shown.isAdmin ? (
                      <ShieldCheck className="size-5" />
                    ) : (
                      <UserRound className="size-5" />
                    )
                  }
                  title={shown.isAdmin ? "Amministratore" : "Staff"}
                  subtitle={`Nello staff da ${format(shown.since, "d MMMM yyyy", { locale: it })}`}
                />
              </ListGroup>

              {shown.isYou && (
                <p className="text-muted-foreground px-1 text-[13px] leading-relaxed">
                  Sei tu. Per uscire dallo staff serve un altro amministratore:
                  così il club non resta mai senza.
                </p>
              )}
            </div>

            {!shown.isYou && (
              <ResponsiveDrawerFooter className="border-t pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] md:border-t-0 md:pb-0">
                <Button
                  variant="ghost"
                  className="text-danger hover:text-danger h-12 rounded-xl md:h-9"
                  disabled={removing}
                  onClick={() => void remove()}
                >
                  {removing && <Loader2 className="size-4 animate-spin" />}
                  Togli dallo staff
                </Button>
              </ResponsiveDrawerFooter>
            )}
          </>
        )}
      </ResponsiveDrawerContent>
    </ResponsiveDrawer>
  );
}

/**
 * Aggiunge una persona allo staff, dalla sua email.
 *
 * Se l'email ha già un account Padel Sport (chi è anche cliente), entra con
 * quello e il nome scritto qui non serve. Altrimenti l'account si apre ora,
 * senza password. In tutti e due i casi parte una mail con il link al
 * gestionale: si entra con il codice che arriva a quell'indirizzo.
 */
function InviteSheet({
  open,
  onOpenChange,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: () => void;
}) {
  const [dirty, setDirty] = useState(false);
  const confirmLeave = useConfirmLeave();

  const close = () => {
    setDirty(false);
    onOpenChange(false);
  };
  const requestClose = () => {
    if (dirty) void confirmLeave(close);
    else close();
  };

  return (
    <ResponsiveDrawer
      open={open}
      setOpen={(next) => (next ? onOpenChange(true) : close())}
      dirty={dirty}
      onCloseAttempt={requestClose}
    >
      <ResponsiveDrawerContent className="sm:max-w-md md:max-h-[90dvh] md:overflow-y-auto">
        {open && (
          <InviteForm
            onDirtyChange={setDirty}
            onCancel={requestClose}
            onAdded={() => {
              close();
              onAdded();
            }}
          />
        )}
      </ResponsiveDrawerContent>
    </ResponsiveDrawer>
  );
}

function InviteForm({
  onDirtyChange,
  onCancel,
  onAdded,
}: {
  onDirtyChange: (dirty: boolean) => void;
  onCancel: () => void;
  onAdded: () => void;
}) {
  const id = useId();
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<Role>("org:member");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = Boolean(email || firstName || lastName);
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  const valid =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    firstName.trim().length > 0;

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!valid || saving) return;

    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/dashboard/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim() || undefined,
          role,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setError(payload?.error ?? "Non riusciamo ad aggiungerlo. Riprova.");
        return;
      }

      const address = email.trim().toLowerCase();
      toast.success(`${firstName.trim()} è nello staff`, {
        description: payload?.mailed
          ? `Abbiamo scritto a ${address} come entrare nel gestionale.`
          : `La mail non è partita: per entrare va su ${payload?.signInUrl ?? "il gestionale"} con l'indirizzo ${address}.`,
        duration: payload?.mailed ? 4000 : 12000,
      });
      onAdded();
    } catch {
      setError("Controlla la connessione e riprova.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SheetHeader
        title="Aggiungi allo staff"
        description="Riceve una mail con il link al gestionale. Entra con il codice che arriva a questo indirizzo."
      />

      <form
        id={`${id}-form`}
        onSubmit={submit}
        noValidate
        className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pt-1 pb-2 md:-mx-1 md:px-1"
      >
        <div className="space-y-2">
          <Label htmlFor={`${id}-email`}>Email</Label>
          <Input
            id={`${id}-email`}
            type="email"
            inputMode="email"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="nome@esempio.it"
            value={email}
            onChange={(event) => {
              setError(null);
              setEmail(event.target.value);
            }}
            className="bg-card h-12 rounded-xl text-base"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor={`${id}-first`}>Nome</Label>
            <Input
              id={`${id}-first`}
              autoComplete="off"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              className="bg-card h-12 rounded-xl text-base"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${id}-last`}>Cognome</Label>
            <Input
              id={`${id}-last`}
              autoComplete="off"
              placeholder="Facoltativo"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              className="bg-card h-12 rounded-xl text-base"
            />
          </div>
        </div>
        <p className="text-muted-foreground -mt-3 px-1 text-xs leading-relaxed">
          Se ha già un account Padel Sport, teniamo il nome che ha lì.
        </p>

        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium">Ruolo</legend>
          <div className="bg-foreground/[0.06] grid grid-cols-2 gap-1 rounded-xl p-1">
            {ROLES.map((option) => {
              const active = role === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setRole(option.value)}
                  className={cn(
                    "flex min-h-10 items-center justify-center rounded-lg text-sm transition-colors",
                    active
                      ? "bg-card dark:bg-foreground/15 font-medium shadow-xs"
                      : "text-muted-foreground",
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <p className="text-muted-foreground px-1 text-xs leading-relaxed">
            {ROLES.find((option) => option.value === role)?.hint}
          </p>
        </fieldset>

        {error && (
          <p role="alert" className="text-danger px-1 text-[13px]">
            {error}
          </p>
        )}
      </form>

      <ResponsiveDrawerFooter className="flex flex-col-reverse gap-2 border-t pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] md:flex-row md:justify-end md:border-t-0 md:pb-0">
        <Button
          type="button"
          variant="ghost"
          className="h-12 md:h-9"
          onClick={onCancel}
        >
          Annulla
        </Button>
        <Button
          type="submit"
          form={`${id}-form`}
          className="h-12 rounded-xl md:h-9"
          disabled={!valid || saving}
        >
          {saving && <Loader2 className="size-4 animate-spin" />}
          Aggiungi allo staff
        </Button>
      </ResponsiveDrawerFooter>
    </>
  );
}
