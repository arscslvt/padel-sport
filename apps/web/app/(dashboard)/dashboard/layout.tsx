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
import DashboardNav from "../_components/dashboard-nav";
import MobileHeader from "../_components/mobile-header";
import UserCard from "../_components/user-card";
import ProfileDialogProvider from "../_providers/profile-dialog.provider";
import HapticsProvider from "../_providers/sound.provider";
import InternalThemeProvider from "../_providers/theme.provider";

export const metadata = {
  title: "Dashboard",
  description: "Area riservata allo staff autorizzato.",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
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
          <SidebarProvider defaultOpen={defaultOpen} className="bg-white">
            <Sidebar collapsible="icon">
              <SidebarHeader>
                <SidebarMenu>
                  <SidebarMenuItem className="flex items-center gap-1">
                    <SidebarMenuButton size="lg" asChild className="flex-1">
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
                <UserCard />
              </SidebarFooter>

              <SidebarRail />
            </Sidebar>
            <SidebarInset className="bg-white">
              <MobileHeader />
              {children}
            </SidebarInset>
          </SidebarProvider>
        </ProfileDialogProvider>
        <Toaster />
      </InternalThemeProvider>
    </HapticsProvider>
  );
}
