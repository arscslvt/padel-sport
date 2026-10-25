"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import {
  ChevronRight,
  CircleHelp,
  ExternalLink,
  LogOut,
  MoreHorizontal,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Avatar, AvatarImage } from "@/components/ui/avatar";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { staffRoleLabel } from "@/lib/clerk";
import { siteUrl } from "@/lib/site";
import { cn } from "@/lib/utils";

import { useCounts } from "../_providers/counts.provider";
import { useDashboardTour } from "../_providers/tour.provider";
import { CountBadge } from "./count-badge";
import { ListGroup, ListRow } from "./list";
import {
  activeHref,
  isSecondary,
  type NavItem,
  PRIMARY_NAV,
  SECONDARY_NAV,
} from "./nav";
import { ThemeSegmentedControl } from "./theme-picker";

/**
 * La navigazione da telefono: una barra fluttuante in basso, dove arriva il
 * pollice, con le quattro sezioni di tutti i giorni e «Altro».
 *
 * Prende il posto del menu ad hamburger, che chiedeva due tocchi e copriva la
 * pagina per cambiare sezione. Il numero su una voce è quante cose ci
 * aspettano: si vede dove c'è lavoro senza aprire niente.
 *
 * Il materiale è traslucido perché il contenuto ci scorre sotto. Per chi ha
 * chiesto meno trasparenza diventa pieno (`.dashboard-material`, globals.css).
 *
 * La voce toccata si accende subito, come in un'app, senza aspettare che la
 * pagina nuova arrivi: finché l'indirizzo non cambia vale quella toccata
 * (`pending`). La pagina intanto mostra il suo scheletro (i `loading.tsx`,
 * page-skeleton.tsx), che Next scarica insieme ai link della barra.
 */
export function BottomTabBar({ staffOrgSlug }: { staffOrgSlug: string }) {
  const pathname = usePathname();
  const [pending, setPending] = useState<string | null>(null);
  const active = pending ?? activeHref(pathname);
  const { counts } = useCounts();
  const [moreOpen, setMoreOpen] = useState(false);

  // Cambiata pagina, il pannello «Altro» non ha più niente da dire.
  // biome-ignore lint/correctness/useExhaustiveDependencies: si chiude al cambio di rotta.
  useEffect(() => {
    setMoreOpen(false);
    setPending(null);
  }, [pathname]);

  // Il profilo non è una voce della barra, ma ci si arriva da «Altro».
  const onProfile = pathname === "/profile";
  const moreActive = isSecondary(active) || onProfile;

  return (
    <>
      <nav
        aria-label="Sezioni della dashboard"
        // Il contenitore, da bordo a bordo, ha lo sfondo della pagina: Safari
        // su iOS colora la sua barra in basso con lo sfondo dell'elemento
        // fissato al bordo, e su uno trasparente ripiega sul bianco. Stesso
        // colore della pagina, quindi la fascia non si vede; la sfumatura
        // sopra evita il taglio netto dove il contenuto le scorre sotto.
        className="bg-background before:from-background fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] before:pointer-events-none before:absolute before:inset-x-0 before:-top-6 before:h-6 before:bg-gradient-to-t before:to-transparent md:hidden"
      >
        <div
          data-tour="nav"
          className="dashboard-material bg-background/80 supports-[backdrop-filter]:bg-background/70 mx-auto flex max-w-md items-stretch rounded-[1.75rem] border p-1 shadow-[0_8px_30px_-12px_oklch(0.2_0_0/0.25)] backdrop-blur-xl backdrop-saturate-150"
        >
          {PRIMARY_NAV.map((item) => (
            <TabLink
              key={item.href}
              item={item}
              active={active === item.href}
              count={item.count ? counts?.[item.count] : undefined}
              onNavigate={() => setPending(item.href)}
            />
          ))}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            data-tour="more"
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            className={tabClass(moreActive)}
          >
            <MoreHorizontal className="size-5" />
            <span>Altro</span>
          </button>
        </div>
      </nav>

      <MoreDrawer
        open={moreOpen}
        onOpenChange={setMoreOpen}
        active={active}
        onProfile={onProfile}
        staffOrgSlug={staffOrgSlug}
      />
    </>
  );
}

function tabClass(active: boolean) {
  return cn(
    "relative flex min-h-13 flex-1 flex-col items-center justify-center gap-0.5 rounded-[1.375rem] text-[11px] font-medium transition-[background-color,color,transform] duration-150 active:scale-95",
    // Al buio la voce attiva prende lo smeraldo del marchio, come la tinta
    // delle barre in basso di iOS; di giorno resta il nero del testo.
    active
      ? "bg-foreground/[0.07] text-foreground dark:text-primary"
      : "text-muted-foreground hover:text-foreground",
  );
}

function TabLink({
  item,
  active,
  count,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  count?: number;
  /** Il tocco che porta altrove: la voce si accende subito. */
  onNavigate: () => void;
}) {
  const label = item.short ?? item.name;

  return (
    <Link
      href={item.href}
      onNavigate={onNavigate}
      aria-current={active ? "page" : undefined}
      aria-label={count ? `${item.name}, ${count} da gestire` : item.name}
      className={tabClass(active)}
    >
      <span className="relative">
        <item.icon className="size-5" strokeWidth={active ? 2.25 : 2} />
        {count ? (
          <CountBadge
            count={count}
            size="sm"
            className="absolute -top-1.5 left-3.5"
          />
        ) : null}
      </span>
      <span>{label}</span>
    </Link>
  );
}

/** Le pagine meno frequenti e il proprio account, in un pannello dal basso. */
function MoreDrawer({
  open,
  onOpenChange,
  active,
  onProfile,
  staffOrgSlug,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  active: string | null;
  onProfile: boolean;
  staffOrgSlug: string;
}) {
  const { user } = useUser();
  // Il ruolo viaggia con l'utente di Clerk: nessuna richiesta in più.
  const membership = user?.organizationMemberships.find(
    (item) => item.organization.slug === staffOrgSlug,
  );
  const { signOut } = useAuth();
  const { start: startTour } = useDashboardTour();

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-background">
        <DrawerHeader className="text-left group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left">
          <DrawerTitle>Altro</DrawerTitle>
          <DrawerDescription className="sr-only">
            Eventi, configurazione del club, aspetto e il tuo account.
          </DrawerDescription>
        </DrawerHeader>

        <div className="space-y-5 overflow-y-auto px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          {SECONDARY_NAV.map((group) => (
            <ListGroup key={group.title} title={group.title}>
              {group.items.map((item) => (
                <ListRow
                  key={item.href}
                  href={item.href}
                  leading={<item.icon className="size-5" />}
                  title={item.name}
                  selected={active === item.href}
                  chevron
                />
              ))}
            </ListGroup>
          ))}

          <ListGroup
            title="Aspetto"
            footer="Automatico segue le impostazioni del dispositivo."
          >
            <div className="p-2">
              <ThemeSegmentedControl />
            </div>
          </ListGroup>

          <ListGroup title="Account">
            <ListRow
              leading={
                <Avatar className="size-8">
                  {user?.imageUrl && <AvatarImage src={user.imageUrl} alt="" />}
                </Avatar>
              }
              title={user?.fullName ?? "Profilo"}
              subtitle={
                membership ? staffRoleLabel(membership.role) : undefined
              }
              href="/profile"
              selected={onProfile}
              chevron
            />
            <ListRow
              leading={<CircleHelp className="size-5" />}
              title="Guida della dashboard"
              subtitle="Rivedi come funziona"
              trailing={
                <ChevronRight className="text-muted-foreground size-4" />
              }
              onClick={() => {
                onOpenChange(false);
                // Il tour parte a pannello chiuso: rimpicciolire la pagina
                // con il pannello ancora sopra lo lascerebbe fuori cornice.
                window.setTimeout(startTour, 350);
              }}
            />
            <ListRow
              href={siteUrl("/")}
              leading={<ExternalLink className="size-5" />}
              title="Vai al sito"
              chevron
            />
            <ListRow
              leading={<LogOut className="size-5" />}
              title="Esci"
              tone="danger"
              onClick={() => void signOut()}
            />
          </ListGroup>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
