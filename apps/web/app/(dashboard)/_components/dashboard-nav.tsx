"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

import { useCounts } from "../_providers/counts.provider";
import { CountBadge } from "./count-badge";
import { activeHref, type NavItem, PRIMARY_NAV, SECONDARY_NAV } from "./nav";

/**
 * La barra laterale da desktop. Le voci sono le stesse della barra in basso
 * del telefono (nav.ts): le quattro di tutti i giorni in cima, poi eventi e
 * club. Il numero accanto a una voce è quante cose ci aspettano.
 */
export default function DashboardNav() {
  const pathname = usePathname();
  const active = activeHref(pathname);
  const { counts } = useCounts();

  const renderItem = (item: NavItem) => {
    const count = item.count ? counts?.[item.count] : undefined;

    return (
      <SidebarMenuItem key={item.href}>
        {/*
         * `tooltip`: a barra stretta resta solo l'icona, e senza l'etichetta
         * al passaggio del mouse le icone diventano quadratini da indovinare.
         */}
        <SidebarMenuButton
          asChild
          isActive={active === item.href}
          tooltip={item.name}
        >
          <Link href={item.href}>
            <item.icon />
            <span>{item.name}</span>
          </Link>
        </SidebarMenuButton>
        {/* `SidebarMenuBadge` solo per la posizione: l'aspetto è di CountBadge. */}
        {count ? (
          <SidebarMenuBadge className="p-0">
            <CountBadge count={count} />
          </SidebarMenuBadge>
        ) : null}
      </SidebarMenuItem>
    );
  };

  return (
    <>
      <SidebarGroup>
        <SidebarMenu>{PRIMARY_NAV.map(renderItem)}</SidebarMenu>
      </SidebarGroup>
      {SECONDARY_NAV.map((group) => (
        <SidebarGroup key={group.title}>
          <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
          <SidebarMenu>{group.items.map(renderItem)}</SidebarMenu>
        </SidebarGroup>
      ))}
    </>
  );
}
