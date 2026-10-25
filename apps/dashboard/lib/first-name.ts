/**
 * Il nome con cui salutare un utente Clerk: il nome di battesimo, o la prima
 * parola del nome completo, o lo username. Vale sul server e nel browser, per
 * questo sta in un file a sé e non in lib/staff-name.ts, che è solo del
 * browser.
 */
export function firstNameOf(user: {
  firstName?: string | null;
  fullName?: string | null;
  username?: string | null;
}): string | null {
  const first = user.firstName?.trim();
  if (first) return first;
  const full = user.fullName?.trim().split(/\s+/)[0];
  if (full) return full;
  return user.username?.trim() || null;
}
