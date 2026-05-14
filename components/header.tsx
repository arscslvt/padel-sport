"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import logo from "@/assets/branding/logo.svg";
import { Button } from "./ui/button";

import { motion } from "motion/react";

import { cn } from "@/lib/utils";
import { BOOKING_LINK, EVENTS_LINK, WHERE_WE_ARE_LINK } from "@/lib/links";
import { getInfo } from "@/lib/info";

const routes: ReadonlyArray<{
  name: string;
  href: string;
  disabled?: boolean;
}> = [
  { name: "Dove trovarci", href: WHERE_WE_ARE_LINK },
  // { name: "Il Club", href: CLUB_LINK, disabled: true },
  { name: "Tornei ed Eventi", href: EVENTS_LINK },
];

interface HeaderProps {
  hideNav?: boolean;
  hideBackground?: boolean;
}

export default function Header({ hideNav, hideBackground }: HeaderProps) {
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

  const isHome = currentPath === "/";

  return (
    <div
      className={cn(
        "relative w-dvw top-0 z-50 flex flex-col md:flex-row justify-center md:items-center sm:h-32 min-h-22 gap-3 md:px-16 lg:px-24 pt-6 lg:pt-0",
        isHome ? "pb-2" : "pb-5 sm:pb-2",
        isHome ? "fixed" : "sticky",
        "bg-transparent",
      )}
    >
      {!isHome && !hideBackground && (
        <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-background via-background/95 to-background/0" />
      )}
      <div className="relative flex justify-between z-10 px-4 pb-3 md:pb-0 md:px-0">
        <Link href={"/"} className="pl-2 md:pl-0">
          <Image
            src={logo}
            alt="PadelSport Logo"
            className="h-10 lg:h-12 w-auto"
          />
        </Link>

        <div className="flex md:hidden">
          <Link href={getInfo("bookingUrl") ?? "#"}>
            <Button
              variant={"secondary"}
              className={cn(
                "font-medium font-heading lg:px-4 rounded-full cursor-pointer transition-colors",
                currentPath === BOOKING_LINK && "bg-white/30",
              )}
            >
              PRENOTA ORA
            </Button>
          </Link>
        </div>
      </div>
      {!hideNav && (
        <div className="relative z-10 md:justify-end md:flex-1 flex px-4 md:px-0">
          <nav
            aria-label="Link utili"
            className="flex flex-1 md:flex-none border border-accent/20 bg-background/10 md:bg-foreground/30 backdrop-blur-sm md:bg-none rounded-full"
          >
            <motion.ul className="flex flex-1 md:flex-none" layout>
              {routes.map((route) => {
                const isActive = currentPath === route.href;

                return (
                  <li key={route.href} className="flex-1">
                    <Link
                      href={route.disabled ? "#" : route.href}
                      aria-current={isActive ? "page" : undefined}
                      className="flex-1 flex"
                    >
                      <Button
                        variant={"ghost"}
                        className={cn(
                          "flex-1 text-white hover:bg-white/20 hover:text-white font-medium lg:px-4 rounded-full cursor-pointer transition-colors",
                          isActive && "bg-white/30",
                        )}
                        disabled={route.disabled}
                      >
                        {route.name}
                      </Button>
                    </Link>
                  </li>
                );
              })}
            </motion.ul>
          </nav>
        </div>
      )}
    </div>
  );
}
