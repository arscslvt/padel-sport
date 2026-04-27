"use client";

import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { SidebarOpen } from "lucide-react";

export default function MobileHeader() {
  const { toggleSidebar } = useSidebar();

  return (
    <div className="md:hidden flex items-center px-4 py-2">
      <div>
        <Button
          size={"icon"}
          variant={"outline"}
          className="bg-transparent rounded-full"
          onClick={() => toggleSidebar()}
        >
          <SidebarOpen />
        </Button>
      </div>
      <div className="pl-2.5">
        <h1 className="text-lg font-semibold">Dashboard</h1>
      </div>
    </div>
  );
}
