"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";

export default function MobileHeader() {
  const { toggleSidebar } = useSidebar();

  return (
    <div className="sticky top-0 z-20 bg-white/85 backdrop-blur-md md:hidden flex items-center px-4 py-2">
      <div>
        <Button
          size={"icon"}
          variant={"outline"}
          className="bg-transparent rounded-full"
          onClick={() => toggleSidebar()}
        >
          <Menu />
        </Button>
      </div>
      <div className="pl-2.5">
        <h1 className="text-lg font-semibold">Dashboard</h1>
      </div>
    </div>
  );
}
