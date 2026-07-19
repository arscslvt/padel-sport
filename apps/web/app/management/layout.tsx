import { currentUser } from "@clerk/nextjs/server";
import { LayoutDashboard, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Toaster } from "@/components/ui/sonner";
import ThemeSetter from "./_components/theme-setter";
import UserMenu from "./_components/user-menu";

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
      <ThemeSetter theme="neutral" />
      <Toaster />
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-3 px-4 md:px-6 xl:px-8">
          <Link
            href="/management"
            className="flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="grid size-9 place-content-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <LayoutDashboard className="size-4" />
            </span>
            <span>
              <span className="block text-sm font-bold leading-none">
                Tournament Desk
              </span>
              <span className="mt-1 hidden items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:flex">
                <ShieldCheck className="size-3" /> Area operatori
              </span>
            </span>
          </Link>
          <UserMenu />
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1600px] px-4 pb-16 md:px-6 xl:px-8">
        {children}
      </main>
    </div>
  );
}
