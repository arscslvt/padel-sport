"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

import logo from "@/assets/branding/logo.svg";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

const routes: ReadonlyArray<{
  name: string;
  href: string;
  disabled?: boolean;
}> = [
  { name: "Dove trovarci", href: "/where" },
  { name: "Il Club", href: "/club", disabled: true },
  { name: "Tornei ed Eventi", href: "/events" },
];

export default function Header() {
  const pathname = usePathname();
  const [currentPath, setCurrentPath] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!pathname) {
      setCurrentPath(null);
      return;
    }

    const [cleanPath] = pathname.split("?");
    setCurrentPath(cleanPath);
  }, [pathname]);

  return (
    <div className="sticky w-dvw top-0 z-50 flex flex-col lg:flex-row justify-center items-center pb-8 sm:h-32 min-h-22 lg:px-32 pt-6 lg:pt-0">
      <div>
        <Link href={"/"}>
          <Image
            src={logo}
            alt="PadelSport Logo"
            className="h-10 lg:h-12 w-auto"
          />
        </Link>
      </div>
      <div className="flex justify-end flex-1">
        <nav aria-label="Navigazione principale" className="pt-4 lg:pt-0">
          <ul className="flex gap-3">
            {routes.map((route) => {
              const isActive = currentPath === route.href;

              return (
                <li key={route.href}>
                  <Link
                    href={route.disabled ? "#" : route.href}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <Button
                      variant={"ghost"}
                      className={cn(
                        "text-white hover:bg-white/20 hover:text-white font-medium lg:px-4 rounded-full cursor-pointer transition-colors",
                        isActive && "bg-white/30"
                      )}
                      disabled={route.disabled}
                    >
                      {route.name}
                    </Button>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}
