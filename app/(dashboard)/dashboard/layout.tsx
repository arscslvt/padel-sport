import { LayoutDashboard, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type React from "react";
import type { Viewport } from "next";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Toaster } from "@/components/ui/sonner";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
import main_icon from "@/public/favicon/black-icon.png";
import UserCard from "../_components/user-card";
import MobileHeader from "../_components/mobile-header";
import InternalThemeProvider from "../_providers/theme.provider";
import HapticsProvider from "../_providers/sound.provider";

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

const routes: ReadonlyArray<{ name: string; href: string; icon: LucideIcon }> =
  [{ name: "Riepilogo", href: "/dashboard", icon: LayoutDashboard }];

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <HapticsProvider>
      <InternalThemeProvider>
        <SidebarProvider className="bg-white">
          <Sidebar>
            <SidebarHeader>
              <div className="flex items-center gap-2">
                <Avatar className="border p-1">
                  <AvatarImage src={main_icon.src} alt="PadelSport Logo" />
                </Avatar>
                <h1 className="font-semibold">Dashboard</h1>
              </div>
            </SidebarHeader>

            <SidebarContent>
              <SidebarGroup>
                <SidebarMenu>
                  {routes.map((route) => (
                    <SidebarMenuItem key={route.href}>
                      <Link
                        href={route.href}
                        className="peer/menu-button flex h-8 w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-hidden transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring active:bg-sidebar-accent active:text-sidebar-accent-foreground"
                      >
                        <route.icon className="size-4 shrink-0" />
                        <span className="truncate">{route.name}</span>
                      </Link>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroup>
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
        <Toaster />
      </InternalThemeProvider>
    </HapticsProvider>
  );
}
