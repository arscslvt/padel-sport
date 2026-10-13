"use client";

import { useAuth } from "@clerk/nextjs";
import { api } from "@padel-sport/backend/convex/_generated/api";
import { formatEuro } from "@padel-sport/backend/convex/modules/pricing/lib";
import { useAction, useQuery } from "convex/react";
import { CheckCircle2, CreditCard, Undo2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { convexMessage } from "@/lib/clients";
import { BOOKING_TERMS_LINK } from "@/lib/links";

/**
 * Il pagamento online di una prenotazione, dal lato del cliente.
 *
 * Si paga sulla pagina ospitata da SumUp: qui c'è solo il pulsante che ci
 * manda e il racconto di com'è andata. È facoltativo — chi non paga online
 * paga in struttura come sempre — e non cambia la conferma, che resta della
 * struttura (packages/backend/convex/modules/payments/checkout.ts).
 */

/**
 * Manda il titolare sulla pagina di SumUp.
 *
 * Il browser lascia il sito: lo stato «in corso» resta acceso finché la pagina
 * non cambia, così un secondo tocco non apre un secondo pagamento.
 */
export function useStartPayment() {
  const start = useAction(api.modules.payments.checkout.start);
  const [starting, setStarting] = useState<string | null>(null);

  const pay = async (code: string) => {
    if (starting) return;

    setStarting(code);
    try {
      const { url } = await start({ code });
      window.location.assign(url);
    } catch (error) {
      toast.error("Pagamento non avviato", {
        description: convexMessage(
          error,
          "Riprova fra poco, o paga in struttura.",
        ),
      });
      setStarting(null);
    }
  };

  return { pay, starting };
}

/**
 * La regola di disdetta dei pagamenti online, accanto a ogni pagamento: chi
 * paga deve saperla prima, chi ha pagato deve ritrovarla qui.
 */
function RefundRule() {
  return (
    <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
      Puoi disdire e avere il rimborso fino a 24 ore prima della partita.{" "}
      <Link
        href={BOOKING_TERMS_LINK}
        className="text-foreground underline underline-offset-2"
      >
        Condizioni di prenotazione
      </Link>
    </p>
  );
}

/**
 * Lo stato del pagamento sulla pagina della prenotazione, o il pulsante per
 * farlo. Lo vede solo il titolare: per chiunque altro — i compagni, lo staff
 * all'ingresso — non c'è niente da mostrare.
 *
 * `returning` è il ritorno da SumUp (`?pagamento=esito`): l'esito si rilegge
 * subito invece di aspettare il webhook.
 */
export function BookingPayment({
  code,
  returning = false,
}: {
  code: string;
  returning?: boolean;
}) {
  const { isSignedIn } = useAuth();
  const payment = useQuery(
    api.modules.payments.status.forCode,
    isSignedIn ? { code } : "skip",
  );
  const refresh = useAction(api.modules.payments.checkout.refresh);
  const { pay, starting } = useStartPayment();

  const checked = useRef(false);
  useEffect(() => {
    if (!returning || !isSignedIn || checked.current) return;
    checked.current = true;

    // L'indirizzo torna pulito: ricaricando la pagina non deve ripartire
    // l'avviso dell'esito.
    window.history.replaceState(null, "", window.location.pathname);

    void refresh({ code })
      .then((status) => {
        if (status === "paid") {
          toast.success("Pagamento ricevuto", {
            description: "Grazie! La prenotazione risulta pagata.",
          });
        } else if (status === "failed") {
          toast.error("Pagamento non riuscito", {
            description:
              "Non ti è stato addebitato nulla: puoi riprovare o pagare in struttura.",
          });
        } else if (status === "pending") {
          toast.info("Pagamento in verifica", {
            description: "La pagina si aggiorna da sola appena SumUp conferma.",
          });
        }
      })
      .catch(() => undefined);
  }, [returning, isSignedIn, refresh, code]);

  if (!payment) return null;

  // Un pagamento fatto resta visibile anche se il club spegne il pagamento
  // online: spegnerlo ferma i pagamenti nuovi, non cancella quelli avvenuti.
  if (payment.paid) {
    return (
      <div className="border-border flex items-start gap-3 rounded-2xl border p-4 text-sm">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
        <div>
          <p className="font-medium">
            Pagata online · {formatEuro(payment.paid.amount)}
          </p>
          <p className="text-muted-foreground mt-0.5 leading-relaxed">
            Hai pagato per la squadra indicata
            {payment.paid.transactionCode
              ? ` (ricevuta SumUp ${payment.paid.transactionCode})`
              : ""}
            . Chi si aggiunge dopo paga la sua quota in struttura.
          </p>
          <RefundRule />
        </div>
      </div>
    );
  }

  // Il rimborso lo decide la struttura: chi l'ha ricevuto deve saperlo, anche
  // se la prenotazione resta valida e si può ripagare.
  const refunded = payment.refunded && (
    <div className="border-border flex items-start gap-3 rounded-2xl border p-4 text-sm">
      <Undo2 className="text-muted-foreground mt-0.5 size-5 shrink-0" />
      <div>
        <p className="font-medium">
          Pagamento rimborsato · {formatEuro(payment.refunded.amount)}
        </p>
        <p className="text-muted-foreground mt-0.5 leading-relaxed">
          La struttura ti ha restituito l'importo sulla carta con cui hai
          pagato: può servire qualche giorno perché compaia.
        </p>
      </div>
    </div>
  );

  // `canPay` è falso anche quando il pagamento online è spento.
  if (!payment.canPay) return refunded || null;

  const failed = payment.latest?.status === "failed";
  const resume = payment.latest?.open;

  return (
    <div className="flex flex-col gap-3">
      {refunded}
      <div className="border-border rounded-2xl border p-4">
        <p className="text-sm font-medium">Vuoi pagare adesso?</p>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          {failed
            ? "L'ultimo tentativo non è andato a buon fine e non ti è stato addebitato nulla. "
            : ""}
          Paghi {formatEuro(payment.amount)} per te e i compagni indicati, con
          carta, Apple Pay o Google Pay sulla pagina sicura di SumUp. Altrimenti
          si paga in struttura come sempre.
        </p>
        <RefundRule />
        <Button
          type="button"
          size="pill"
          className="mt-4"
          disabled={starting !== null}
          onClick={() => void pay(code)}
        >
          <CreditCard className="size-4" />
          {starting
            ? "Ti portiamo su SumUp…"
            : resume
              ? "Riprendi il pagamento"
              : `Paga ora ${formatEuro(payment.amount)}`}
        </Button>
      </div>
    </div>
  );
}
