"use client";

import {
  CalendarDays,
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
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const routes: ReadonlyArray<{ name: string; href: string; icon: LucideIcon }> =
  [
    { name: "Riepilogo", href: "/dashboard", icon: LayoutDashboard },
    { name: "Richieste", href: "/dashboard/requests", icon: Inbox },
    { name: "Clienti", href: "/dashboard/clients", icon: Users },
    { name: "Eventi", href: "/dashboard/events", icon: CalendarDays },
    { name: "Social", href: "/dashboard/social", icon: Megaphone },
    { name: "Configurazione", href: "/dashboard/settings", icon: Settings },
  ];

/**
 * Quale voce è accesa.
 *
 * Il prefisso conta, così `/dashboard/events/arrivi` tiene acceso «Eventi» —
 * chi è in una sottopagina deve vedere da dove ci è arrivato. «Riepilogo» fa
 * eccezione perché la sua rotta è la radice di tutte le altre: senza il
 * confronto esatto resterebbe accesa ovunque, e due voci accese non indicano
 * più niente.
 */
function isActiveRoute(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function DashboardNav() {
  const { isMobile, setOpenMobile } = useSidebar();
  const pathname = usePathname();

  return (
    <SidebarGroup>
      <SidebarMenu>
        {routes.map((route) => (
          <SidebarMenuItem key={route.href}>
            {/*
             * `tooltip` non è un vezzo: a barra stretta resta solo l'icona, e
             * senza l'etichetta al passaggio del mouse «Inbox» e «Impostazioni»
             * diventano due quadratini da indovinare.
             */}
            <SidebarMenuButton
              asChild
              isActive={isActiveRoute(pathname, route.href)}
              tooltip={route.name}
              className="h-11 md:h-8"
            >
              <Link
                href={route.href}
                onClick={() => {
                  if (isMobile) setOpenMobile(false);
                }}
              >
                <route.icon />
                <span>{route.name}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
