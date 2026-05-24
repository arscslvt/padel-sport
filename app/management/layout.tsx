import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { ChevronRight } from "lucide-react";

export default async function ManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in?redirectUrl=/management");
  }

  // To check if user is allowed, we could check if they have some role "admin".
  // For now we just check if they are logged in since it says "protetto da autenticazione clerk già parzialmente implementata"

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 border-b border-border bg-background px-3 md:px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Gestione Tornei</h1>
      </header>
      <main className="px-3 md:p-6 max-w-5xl mx-auto">{children}</main>
    </div>
  );
}
