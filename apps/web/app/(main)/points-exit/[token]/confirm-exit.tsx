"use client";

import { api } from "@padel-sport/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ExitRules } from "@/app/(main)/me/_components/program-exit";
import { Button } from "@/components/ui/button";
import { convexMessage } from "@/lib/clients";
import { formatClubDate } from "@/lib/points";

/** Dieci giorni per riscattare: è la regola del regolamento, sezione 8. */
const EXIT_WINDOW_MS = 10 * 24 * 60 * 60 * 1000;

/**
 * Le regole e il pulsante. Il pulsante è l'uscita vera: prima di premerlo non
 * è cambiato niente, dopo la pagina si ricarica e lo dice.
 */
export function ConfirmExit({
  token,
  balance,
}: {
  token: string;
  balance: number;
}) {
  const confirm = useMutation(api.modules.points.exit.confirmByToken);
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Una stima per la lettura: la data vera la fissa il backend alla conferma.
  const deadline = formatClubDate(Date.now() + EXIT_WINDOW_MS);

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      await confirm({ token });
      router.refresh();
    } catch (caught) {
      setError(convexMessage(caught, "Riprova fra poco."));
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl space-y-6">
      <ExitRules balance={balance} deadline={deadline} />

      {error && <p className="text-destructive text-sm">{error}</p>}

      <Button
        variant="destructive"
        size="pill-lg"
        className="w-full sm:w-auto"
        disabled={loading}
        onClick={() => void submit()}
      >
        {loading && <Loader2 className="size-4 animate-spin" />}
        Esci dal programma
      </Button>
    </div>
  );
}
