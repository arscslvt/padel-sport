"use client";

import {
  CalendarDays,
  ChevronRight,
  Inbox,
  LayoutDashboard,
  type LucideIcon,
  Megaphone,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";

interface Route {
  name: string;
  href: string;
  icon: LucideIcon;
  /**
   * Le voci figlie, per le sezioni che hanno più di una schermata.
   *
   * Una voce con figli resta comunque cliccabile: `href` porta alla prima
   * schermata della sezione. Un titolo che si limita ad aprire un elenco
   * costringe a due clic per arrivare dove si voleva andare.
   */
  children?: { name: string; href: string }[];
}

const routes: ReadonlyArray<Route> = [
  { name: "Riepilogo", href: "/dashboard", icon: LayoutDashboard },
  { name: "Richieste", href: "/dashboard/requests", icon: Inbox },
  { name: "Clienti", href: "/dashboard/clients", icon: Users },
  { name: "Eventi", href: "/dashboard/events", icon: CalendarDays },
  { name: "Social", href: "/dashboard/social", icon: Megaphone },
  {
    name: "Configurazione",
    href: "/dashboard/settings",
    icon: Settings,
    children: [
      // Prenotazioni resta sull'indirizzo storico e non su un
      // `/settings/prenotazioni`: quell'indirizzo è dentro gli avvisi già
      // partiti allo staff, e spostarlo li romperebbe tutti.
      { name: "Prenotazioni", href: "/dashboard/settings" },
      { name: "Social", href: "/dashboard/settings/social" },
    ],
  },
];

/** Una voce è attiva anche sulle sue sottopagine, ma `/dashboard` solo su sé stessa. */
function isActiveRoute(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function DashboardNav() {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const close = () => setOpenMobile(false);

  return (
    <SidebarGroup>
      <SidebarMenu>
        {routes.map((route) =>
          route.children ? (
            <CollapsibleRoute
              key={route.href}
              route={route}
              pathname={pathname}
              onNavigate={close}
            />
          ) : (
            <SidebarMenuItem key={route.href}>
              <SidebarMenuButton
                asChild
                isActive={isActiveRoute(pathname, route.href)}
                tooltip={route.name}
              >
                <Link href={route.href} onClick={close}>
                  <route.icon />
                  <span>{route.name}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ),
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
}

/**
 * Una voce con figli.
 *
 * Si apre da sola quando si è dentro la sezione — è lì che i figli servono — ma
 * resta apribile a mano da qualunque altra pagina: altrimenti l'unico modo di
 * scoprire che esiste una schermata sarebbe esserci già sopra.
 *
 * Il titolo continua a essere un link. Il triangolo che apre e chiude è un
 * bottone a parte, accanto: sovrapporli vorrebbe dire che chi clicca «per
 * andarci» apre invece un elenco.
 */
function CollapsibleRoute({
  route,
  pathname,
  onNavigate,
}: {
  route: Route;
  pathname: string;
  onNavigate: () => void;
}) {
  const inside = isActiveRoute(pathname, route.href);

  return (
    <Collapsible asChild defaultOpen={inside} className="group/collapsible">
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={inside}
          tooltip={route.name}
          className="pr-8"
        >
          <Link href={route.href} onClick={onNavigate}>
            <route.icon />
            <span>{route.name}</span>
          </Link>
        </SidebarMenuButton>

        <CollapsibleTrigger asChild>
          <button
            type="button"
            aria-label={`Mostra le voci di ${route.name}`}
            className="absolute top-1.5 right-1 flex size-5 items-center justify-center rounded-md text-sidebar-foreground/70 transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:hidden group-data-[state=open]/collapsible:rotate-90"
          >
            <ChevronRight className="size-4" />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <SidebarMenuSub>
            {route.children?.map((child) => (
              <SidebarMenuSubItem key={child.href}>
                <SidebarMenuSubButton
                  asChild
                  isActive={pathname === child.href}
                >
                  <Link href={child.href} onClick={onNavigate}>
                    <span>{child.name}</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}
