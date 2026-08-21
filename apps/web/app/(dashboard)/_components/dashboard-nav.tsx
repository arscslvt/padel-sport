"use client";

import {
  CalendarDays,
  Inbox,
  LayoutDashboard,
  type LucideIcon,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const routes: ReadonlyArray<{ name: string; href: string; icon: LucideIcon }> =
  [
    { name: "Riepilogo", href: "/dashboard", icon: LayoutDashboard },
    { name: "Richieste", href: "/dashboard/requests", icon: Inbox },
    { name: "Clienti", href: "/dashboard/clients", icon: Users },
    { name: "Eventi", href: "/dashboard/events", icon: CalendarDays },
    { name: "Configurazione", href: "/dashboard/settings", icon: Settings },
  ];

export default function DashboardNav() {
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <SidebarGroup>
      <SidebarMenu>
        {routes.map((route) => (
          <SidebarMenuItem key={route.href}>
            <Link
              href={route.href}
              onClick={() => {
                if (isMobile) setOpenMobile(false);
              }}
              className="peer/menu-button flex h-11 w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-hidden transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring active:bg-sidebar-accent active:text-sidebar-accent-foreground md:h-8"
            >
              <route.icon className="size-4 shrink-0" />
              <span className="truncate">{route.name}</span>
            </Link>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
