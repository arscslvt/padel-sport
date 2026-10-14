"use client";

import { api } from "@padel-sport/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { CreditCard, IdCard, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ListGroup, ListSwitchRow } from "@/app/_components/list";
import { useConfirm } from "@/app/_providers/confirm.provider";
import { MAX_PLAYERS } from "@/lib/booking";

import { saveBookingSettings } from "./save-booking-settings";
import {
  SettingsNotice,
  SettingsSection,
  SettingsSkeleton,
  SettingsStack,
} from "./settings-section";

/**
 * Regole: chi può prenotare online e come.
 *
 * Ogni interruttore vale subito, come i campi e le notifiche nelle altre
 * linguette: prima erano spunte da confermare con un «Salva» unico insieme
 * agli orari, e non era chiaro cosa partisse con cosa. Si manda solo la
 * regola cambiata (save-booking-settings.ts), con fasce e anticipo così come
 * sono sul server: una bozza aperta in Orari non parte di nascosto.
 *
 * Solo la tessera chiede conferma prima di accendersi: è l'unica che può
 * lasciare fuori dei clienti da un momento all'altro.
 */

type RuleKey =
  | "membershipRequired"
  | "fullSquadRequired"
  | "onlinePaymentsEnabled";

export function RulesSettings() {
  const settings = useQuery(api.modules.settings.booking.get, {});
  const payments = useQuery(api.modules.payments.status.setup, {});
  const confirm = useConfirm();

  // La regola appena toccata, finché il server non la rimanda indietro: la
  // levetta si sposta al tocco invece di aspettare il giro completo.
  const [pending, setPending] = useState<{
    key: RuleKey;
    value: boolean;
  } | null>(null);

  useEffect(() => {
    if (pending && settings?.[pending.key] === pending.value) {
      setPending(null);
    }
  }, [settings, pending]);

  if (settings === undefined) {
    return (
      <SettingsStack>
        <SettingsSection title="Chi può prenotare">
          <SettingsSkeleton rows={1} />
        </SettingsSection>
        <SettingsSection title="Squadra">
          <SettingsSkeleton rows={1} />
        </SettingsSection>
        <SettingsSection title="Pagamento online">
          <SettingsSkeleton rows={1} />
        </SettingsSection>
      </SettingsStack>
    );
  }

  const value = (key: RuleKey) =>
    pending?.key === key ? pending.value : settings[key];

  const change = async (key: RuleKey, next: boolean) => {
    if (key === "membershipRequired" && next) {
      const ok = await confirm({
        title: "Richiedere la tessera?",
        description:
          "Chi ha la tessera da pagare o scaduta non potrà più prenotare dal sito e dall'app finché non la rinnovi.",
        confirmLabel: "Richiedi la tessera",
        cancelLabel: "Annulla",
      });
      if (!ok) return;
    }

    setPending({ key, value: next });
    const result = await saveBookingSettings({
      windows: settings.windows,
      bookableDays: settings.bookableDays,
      [key]: next,
    });

    if (!result.ok) {
      setPending(null);
      toast.error("Impossibile aggiornare la regola", {
        description: result.error,
      });
      return;
    }

    toast.success("Regola aggiornata", {
      description: "Sito e app la seguono già.",
    });
  };

  const rule = (key: RuleKey) => ({
    id: key,
    checked: value(key),
    disabled: pending !== null,
    onCheckedChange: (next: boolean) => void change(key, next),
  });

  return (
    <SettingsStack>
      <SettingsSection
        title="Chi può prenotare"
        description="Accendila quando l'anagrafica è completa. Con i clienti ancora da inserire, resterebbero tutti fuori."
      >
        <ListGroup>
          <ListSwitchRow
            {...rule("membershipRequired")}
            leading={<IdCard className="size-5" />}
            title="Serve la tessera in corso"
            subtitle="Sito e app rifiutano chi non ha l'iscrizione valida e pagata."
          />
        </ListGroup>
        {value("membershipRequired") && (
          <SettingsNotice>
            Controlla in Clienti le tessere da pagare o scadute. Quelle persone
            non prenotano online finché non le rinnovi.
          </SettingsNotice>
        )}
      </SettingsSection>

      <SettingsSection
        title="Squadra"
        description="Vale anche per le partite private create dall'app. Le partite aperte e di cerchia nascono con i posti liberi e restano come sono."
      >
        <ListGroup>
          <ListSwitchRow
            {...rule("fullSquadRequired")}
            leading={<Users className="size-5" />}
            title={`Servono tutti e ${MAX_PLAYERS} i giocatori`}
            subtitle={`Chi prenota dal sito indica gli altri ${MAX_PLAYERS - 1}. Niente campi tenuti da una persona sola.`}
          />
        </ListGroup>
      </SettingsSection>

      <SettingsSection
        title="Pagamento online"
        description="«Paga ora» compare nel riepilogo della prenotazione e nell'area personale. Si può sempre pagare in struttura, e la conferma resta vostra. Spegnendolo, i pagamenti già avviati restano registrati."
      >
        <ListGroup>
          <ListSwitchRow
            {...rule("onlinePaymentsEnabled")}
            leading={<CreditCard className="size-5" />}
            title="Paga ora con SumUp"
            subtitle="Carta, Apple Pay o Google Pay, al prezzo del Listino."
          />
        </ListGroup>
        {value("onlinePaymentsEnabled") && payments && !payments.configured && (
          <SettingsNotice>
            Mancano le chiavi di SumUp sul server (
            <code className="text-[12px]">SUMUP_API_KEY</code> e{" "}
            <code className="text-[12px]">SUMUP_MERCHANT_CODE</code>). Finché
            non ci sono, ai clienti il pagamento online non viene proposto.
          </SettingsNotice>
        )}
      </SettingsSection>
    </SettingsStack>
  );
}
