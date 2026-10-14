import type { OpeningWindow } from "@/lib/booking";

/**
 * Il salvataggio della prenotazione online, condiviso da Orari e Regole.
 *
 * Fasce e anticipo vanno sempre inviati; le tre regole solo se cambiano: il
 * backend tiene quelle che mancano. Così ogni linguetta salva soltanto il
 * suo, e una modifica agli orari ancora aperta non parte insieme a una
 * regola, né viceversa.
 */
export interface BookingSettingsPatch {
  windows: OpeningWindow[];
  bookableDays: number;
  membershipRequired?: boolean;
  fullSquadRequired?: boolean;
  onlinePaymentsEnabled?: boolean;
}

export async function saveBookingSettings(
  body: BookingSettingsPatch,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const response = await fetch("/api/dashboard/booking-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (response.ok) return { ok: true };

    const payload = await response.json().catch(() => null);
    return { ok: false, error: payload?.error ?? "Riprova fra poco." };
  } catch {
    return { ok: false, error: "Controlla la connessione e riprova." };
  }
}
