import type { Viewport } from "next";
import type React from "react";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
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

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <HapticsProvider>
      <InternalThemeProvider>
        <ProfileDialogProvider>
          <SidebarProvider className="bg-white">
            <Sidebar>
              <SidebarHeader>
                <div className="flex items-center gap-2">
                  <Avatar className="border p-1">
                    <AvatarImage src={main_icon.src} alt="Padel Sport Logo" />
                  </Avatar>
                  <h1 className="font-semibold">Dashboard</h1>
                </div>
              </SidebarHeader>

              <SidebarContent>
                <DashboardNav />
              </SidebarContent>

              <SidebarFooter>
                <UserCard />
              </SidebarFooter>
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
