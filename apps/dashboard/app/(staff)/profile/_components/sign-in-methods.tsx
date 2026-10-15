"use client";

import { useUser } from "@clerk/nextjs";
import { Link2, Mail } from "lucide-react";
import { FcGoogle } from "react-icons/fc";

import { ListGroup, ListRow } from "@/app/_components/list";
import { useProfileDialog } from "@/app/_providers/profile-dialog.provider";
import { Badge } from "@/components/ui/badge";

/**
 * Le porte d'ingresso al gestionale: le email e gli account collegati.
 *
 * Qui si leggono e basta. Aggiungere un'email o scollegare Google chiede un
 * codice di conferma: lo fa il pannello di Clerk, dall'ultima riga, che è
 * anche l'unico posto dove un errore qui potrebbe chiudere fuori qualcuno.
 */
export function SignInMethods() {
  const { user } = useUser();
  const { openProfile } = useProfileDialog();

  if (!user) return null;

  const emails = [...user.emailAddresses].sort(
    (a, b) =>
      Number(b.id === user.primaryEmailAddressId) -
      Number(a.id === user.primaryEmailAddressId),
  );

  return (
    <ListGroup>
      {emails.map((email) => {
        const primary = email.id === user.primaryEmailAddressId;
        const verified = email.verification?.status === "verified";

        return (
          <ListRow
            key={email.id}
            leading={<Mail className="size-5" />}
            title={email.emailAddress}
            subtitle={verified ? undefined : "Da confermare"}
            trailing={
              primary ? <Badge variant="secondary">Principale</Badge> : null
            }
          />
        );
      })}

      {user.externalAccounts.map((account) => (
        <ListRow
          key={account.id}
          leading={
            account.provider === "google" ? (
              <FcGoogle className="size-5" />
            ) : (
              <Link2 className="size-5" />
            )
          }
          title={account.providerTitle()}
          subtitle={account.emailAddress || account.accountIdentifier()}
        />
      ))}

      <ListRow
        title="Gestisci email e account"
        chevron
        onClick={() => openProfile("account")}
        className="text-primary"
      />
    </ListGroup>
  );
}
