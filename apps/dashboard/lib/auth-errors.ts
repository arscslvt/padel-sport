/**
 * Gli errori di Clerk, detti in italiano.
 *
 * Clerk risponde in inglese e con messaggi pensati per qualunque app. Qui si
 * traducono quelli in cui si inciampa davvero entrando nel gestionale; per gli
 * altri resta il testo di Clerk, che è sempre meglio di un «errore» muto.
 */
const MESSAGES: Record<string, string> = {
  form_identifier_not_found: "Nessun account dello staff con questa email.",
  form_param_format_invalid: "Controlla l'indirizzo email.",
  form_param_nil: "Compila il campo.",
  form_code_incorrect: "Codice non corretto: controlla le cifre e riprova.",
  strategy_for_user_invalid:
    "Questo account non può entrare con un codice via email. Scrivi a chi gestisce il gestionale.",
  verification_expired: "Il codice è scaduto: fattene mandare uno nuovo.",
  verification_failed:
    "Troppi tentativi con questo codice: fattene mandare uno nuovo.",
  user_locked:
    "Account bloccato per troppi tentativi. Riprova fra qualche minuto.",
  too_many_requests: "Troppi tentativi. Aspetta un attimo e riprova.",
  rate_limit_exceeded: "Troppi tentativi. Aspetta un attimo e riprova.",
  session_exists: "Hai già fatto l'accesso.",
  not_allowed_access: "Questo account non è abilitato al gestionale.",
  sign_up_restricted_waitlist: "Questo account non è abilitato al gestionale.",
  identifier_already_signed_in: "Hai già fatto l'accesso.",
};

/** La forma comune a errori di campo, errori globali ed errori di rete. */
export interface AuthErrorLike {
  code?: string;
  message?: string;
  longMessage?: string;
  /** Gli errori dell'API arrivano impacchettati: il codice vero sta qui. */
  errors?: { code?: string; longMessage?: string; message?: string }[];
}

export function authErrorMessage(
  error: AuthErrorLike | null | undefined,
): string | null {
  if (!error) return null;

  const inner = error.errors?.[0];
  const code = inner?.code ?? error.code;
  if (code && MESSAGES[code]) return MESSAGES[code];

  return (
    inner?.longMessage ??
    inner?.message ??
    error.longMessage ??
    error.message ??
    "Qualcosa è andato storto. Riprova."
  );
}
