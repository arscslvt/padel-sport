"use client";

import { CircleHelp } from "lucide-react";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

import { useDashboardTour } from "../../_providers/tour.provider";

/**
 * «Guida» in fondo alla barra laterale, sopra il proprio nome: da qui si
 * rivede il tour. Da telefono la stessa voce sta in «Altro».
 */
export function TourMenuButton() {
  const { start } = useDashboardTour();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton onClick={start} tooltip="Guida della dashboard">
          <CircleHelp />
          <span>Guida</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
