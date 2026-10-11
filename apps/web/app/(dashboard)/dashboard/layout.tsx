import type { Viewport } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import type React from "react";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import main_icon from "@/public/favicon/black-icon.png";
import { BottomTabBar } from "../_components/bottom-tab-bar";
import { DASHBOARD_CHROME_COLOR } from "../_components/chrome";
import DashboardNav from "../_components/dashboard-nav";
import { TourMenuButton } from "../_components/tour/tour-menu-button";
import UserCard from "../_components/user-card";
import ConfirmProvider from "../_providers/confirm.provider";
import CountsProvider from "../_providers/counts.provider";
import FloatingActionProvider from "../_providers/floating-action.provider";
import ProfileDialogProvider from "../_providers/profile-dialog.provider";
import HapticsProvider from "../_providers/sound.provider";
import InternalThemeProvider from "../_providers/theme.provider";
import TourProvider from "../_providers/tour.provider";

export const metadata = {
  title: "Dashboard",
  description: "Area riservata allo staff autorizzato.",
};

export const viewport: Viewport = {
  // Lo stesso grigio chiarissimo del fondo: la barra di stato non fa stacco.
  themeColor: DASHBOARD_CHROME_COLOR,
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/** Il nome del cookie in cui `SidebarProvider` ricorda se era aperta o chiusa. */
const SIDEBAR_COOKIE_NAME = "sidebar_state";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  /**
   * Lo stato della barra si legge dal cookie *prima* di disegnare.
   *
   * `SidebarProvider` il cookie lo scrive già da sé, ma se non glielo si
   * rilegge parte sempre da «aperta»: chi l'aveva richiusa la vedrebbe
   * spalancarsi e poi richiudersi di scatto a idratazione avvenuta, a ogni
   * caricamento. È il passaggio che shadcn mette nella documentazione proprio
   * per questo.
   */
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get(SIDEBAR_COOKIE_NAME)?.value !== "false";

  return (
    <HapticsProvider>
      <InternalThemeProvider>
        <ProfileDialogProvider>
          <CountsProvider>
            <ConfirmProvider>
              {/*
               * Il tour avvolge tutto ciò che si vede della dashboard, pulsante
               * fluttuante compreso: durante la guida è questo blocco che si
               * rimpicciolisce nella cornice.
               */}
              <TourProvider>
                <FloatingActionProvider>
                  <SidebarProvider
                    defaultOpen={defaultOpen}
                    className="bg-background"
                  >
                    <Sidebar collapsible="icon">
                      <SidebarHeader>
                        <SidebarMenu>
                          <SidebarMenuItem className="flex items-center gap-1">
                            <SidebarMenuButton
                              size="lg"
                              asChild
                              className="flex-1"
                            >
                              <Link href="/dashboard">
                                <Avatar className="size-8 shrink-0 border p-1">
                                  <AvatarImage
                                    src={main_icon.src}
                                    alt="Padel Sport Logo"
                                  />
                                </Avatar>
                                <span className="truncate font-semibold">
                                  Dashboard
                                </span>
                              </Link>
                            </SidebarMenuButton>
                            {/*
                             * Chiudere si fa da qui; riaprire dal bordo (`SidebarRail`)
                             * o con ⌘B, perché a barra stretta questo tasto non ci sta
                             * accanto al logo senza rubargli il posto.
                             */}
                            <SidebarTrigger className="group-data-[collapsible=icon]:hidden" />
                          </SidebarMenuItem>
                        </SidebarMenu>
                      </SidebarHeader>

                      <SidebarContent>
                        <DashboardNav />
                      </SidebarContent>

                      <SidebarFooter>
                        <TourMenuButton />
                        <UserCard />
                      </SidebarFooter>

                      <SidebarRail />
                    </Sidebar>
                    {/*
                     * Da telefono la barra laterale non c'è: la navigazione è la barra
                     * in basso, e il fondo della pagina le lascia spazio perché
                     * l'ultima riga non finisca sotto.
                     */}
                    <SidebarInset className="bg-background pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0">
                      {children}
                    </SidebarInset>
                    <BottomTabBar />
                  </SidebarProvider>
                </FloatingActionProvider>
              </TourProvider>
            </ConfirmProvider>
          </CountsProvider>
        </ProfileDialogProvider>
        <Toaster />
      </InternalThemeProvider>
    </HapticsProvider>
  );
}
