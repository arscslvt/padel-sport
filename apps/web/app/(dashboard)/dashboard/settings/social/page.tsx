import { requireStaffMember } from "@/lib/staff";

import { SocialSettings } from "../_components/social-settings";

/** Le impostazioni cambiano da sotto: mai servite dalla cache. */
export const dynamic = "force-dynamic";

export default async function DashboardSocialSettingsPage() {
  await requireStaffMember();

  return (
    <div className="space-y-6 p-4 md:p-6">
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold">Configurazione social</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Se il circolo pubblica, cosa pubblica e con che voce. Qui sta il{" "}
          <em>come suona</em>: i divieti veri — niente nomi di soci, niente
          prezzi inventati — stanno nel codice, perché sono regole di sicurezza
          e vogliono una revisione, non una casella di testo.
        </p>
      </section>

      <SocialSettings />
    </div>
  );
}
