"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useMediaQuery } from "usehooks-ts";

import logo from "@/assets/branding/logo.svg";
import { Button } from "./ui/button";

import { AnimatePresence, motion } from "motion/react";

import { cn } from "@/lib/utils";
import {
  BOOKING_LINK,
  CLUB_LINK,
  EVENTS_LINK,
  WHERE_WE_ARE_LINK,
} from "@/lib/links";
import { getInfo } from "@/lib/info";

const routes: ReadonlyArray<{
  name: string;
  href: string;
  disabled?: boolean;
}> = [
  { name: "Dove trovarci", href: WHERE_WE_ARE_LINK },
  { name: "Il Club", href: CLUB_LINK, disabled: true },
  { name: "Tornei ed Eventi", href: EVENTS_LINK },
];

export default function Header() {
  const isMobile = useMediaQuery("(max-width: 768px)", {
    initializeWithValue: false,
  });
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
        "relative w-dvw top-0 z-50 flex flex-col lg:flex-row justify-center items-center sm:h-32 min-h-22 lg:px-32 pt-6 lg:pt-0",
        isHome ? "pb-2" : "pb-5 sm:pb-2",
        isHome ? "fixed" : "sticky",
        "bg-transparent",
      )}
    >
      {!isHome && (
        <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-background via-background/95 to-background/80" />
      )}
      <div className="relative z-10">
        <Link href={"/"}>
          <Image
            src={logo}
            alt="PadelSport Logo"
            className="h-10 lg:h-12 w-auto"
          />
        </Link>
      </div>
      <div className="relative z-10 justify-end flex-1 flex">
        <nav aria-label="Link utili" className="pt-4 lg:pt-0">
          <motion.ul className="flex gap-3" layout>
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
            <AnimatePresence>
              {currentPath !== "/" && !isMobile && (
                <motion.li
                  initial={{ opacity: 0, x: 10, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, x: 10, width: 0, filter: "blur(4px)" }}
                  transition={{ duration: 0.2 }}
                  key="booking-button"
                >
                  <Link
                    href={getInfo("bookingUrl") || ""}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
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
                </motion.li>
              )}
            </AnimatePresence>
          </motion.ul>
        </nav>
      </div>
    </div>
  );
}
