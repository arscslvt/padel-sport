import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { safeRedirectPath } from "@/lib/auth-routes";

import { SignInForm } from "./_components/sign-in-form";

export const metadata: Metadata = {
  title: "Accedi",
};

/**
 * Il login del gestionale: email e codice, nessuna password.
 *
 * Chi ha già una sessione non vede il modulo: va dritto dove stava andando.
 * La destinazione arriva da Clerk in `?redirect_url=` (la mette il proxy
 * quando manda qui) e si accetta solo se resta su questo dominio.
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  const redirectTo = safeRedirectPath(
    params.redirect_url,
    `${protocol}://${host}`,
  );

  const { userId } = await auth();
  if (userId) redirect(redirectTo);

  return <SignInForm redirectTo={redirectTo} />;
}
