"use client";

import { useUser } from "@clerk/nextjs";
import { Check, Loader2 } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type FormEvent, useEffect, useId, useState } from "react";

import { ListGroup } from "@/app/_components/list";
import { Button } from "@/components/ui/button";
import { EASE_OUT, UI_DURATION } from "@/lib/motion";

type Status = "idle" | "saving" | "saved";

/**
 * Nome e cognome, scritti dentro le righe come nella scheda di un contatto
 * di iOS: l'etichetta a sinistra, il campo a destra, niente riquadri in più.
 *
 * I tasti compaiono solo quando c'è qualcosa da salvare. Dopo il
 * salvataggio «Salva» diventa per un attimo «Salvato», poi i tasti se ne
 * vanno: la conferma è dove si stava guardando, non in un toast in basso.
 */
export function PersonalDetails() {
  const { user } = useUser();
  const reduce = useReducedMotion();
  const id = useId();

  const saved = {
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
  };
  const [draft, setDraft] = useState(saved);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  // Se il nome cambia altrove (dal pannello di Clerk, da un'altra scheda),
  // il modulo lo riprende: finché non lo si sta modificando.
  const dirty =
    draft.firstName.trim() !== saved.firstName ||
    draft.lastName.trim() !== saved.lastName;
  // biome-ignore lint/correctness/useExhaustiveDependencies: si riallinea solo quando cambia il dato salvato.
  useEffect(() => {
    if (!dirty) setDraft(saved);
  }, [saved.firstName, saved.lastName]);

  useEffect(() => {
    if (status !== "saved") return;
    const timer = window.setTimeout(() => setStatus("idle"), 1600);
    return () => window.clearTimeout(timer);
  }, [status]);

  if (!user) return null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!dirty || status === "saving") return;

    const firstName = draft.firstName.trim();
    const lastName = draft.lastName.trim();
    if (!firstName) {
      setError("Scrivi almeno il nome.");
      return;
    }

    setError(null);
    setStatus("saving");
    try {
      await user.update({ firstName, lastName });
      setDraft({ firstName, lastName });
      setStatus("saved");
    } catch {
      setStatus("idle");
      setError("Non siamo riusciti a salvare. Riprova tra poco.");
    }
  };

  const fields = [
    {
      key: "firstName",
      label: "Nome",
      autoComplete: "given-name",
    },
    {
      key: "lastName",
      label: "Cognome",
      autoComplete: "family-name",
    },
  ] as const;

  const showActions = dirty || status !== "idle";

  return (
    <form onSubmit={submit} className="space-y-2" noValidate>
      <ListGroup>
        {fields.map((field) => (
          <label
            key={field.key}
            htmlFor={`${id}-${field.key}`}
            className="flex min-h-14 cursor-text items-center gap-3 px-4"
          >
            <span className="text-muted-foreground w-20 shrink-0 text-[15px]">
              {field.label}
            </span>
            <input
              id={`${id}-${field.key}`}
              name={field.key}
              autoComplete={field.autoComplete}
              value={draft[field.key]}
              onChange={(event) => {
                setError(null);
                setDraft((current) => ({
                  ...current,
                  [field.key]: event.target.value,
                }));
              }}
              aria-invalid={field.key === "firstName" && Boolean(error)}
              placeholder={field.key === "lastName" ? "Facoltativo" : undefined}
              className="placeholder:text-muted-foreground/70 min-w-0 flex-1 bg-transparent py-3 text-base outline-none md:text-[15px]"
            />
          </label>
        ))}
      </ListGroup>

      {error && (
        <p role="alert" className="text-danger px-1 text-[13px]">
          {error}
        </p>
      )}

      <AnimatePresence initial={false}>
        {showActions && (
          <motion.div
            key="actions"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={{ duration: UI_DURATION.enter, ease: EASE_OUT }}
            className="flex justify-end gap-2 pt-1"
          >
            {dirty && status !== "saved" && (
              <Button
                type="button"
                variant="ghost"
                size="pill"
                disabled={status === "saving"}
                onClick={() => {
                  setError(null);
                  setDraft(saved);
                }}
              >
                Annulla
              </Button>
            )}
            <Button
              type="submit"
              size="pill"
              disabled={status !== "idle"}
              className="min-w-28 disabled:opacity-100"
            >
              {status === "saving" && <Loader2 className="animate-spin" />}
              {status === "saved" && <Check />}
              {status === "saved" ? "Salvato" : "Salva"}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}
