"use client";

import AnimatedBackground from "@/components/animated-background";
import Header from "@/components/header";
import { useTheme } from "next-themes";
import React from "react";

export default function TournamentsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { setTheme } = useTheme();

  React.useEffect(() => {
    setTheme("neutral");
  }, [setTheme]);

  return (
    <>
      <div className="absolute top-0 left-0 w-dvw z-0">
        <AnimatedBackground
          colorStops={["#7cff67", "#10b981", "#2dd4bf"]}
          blend={0.9}
          amplitude={2.0}
          speed={0.3}
        />
      </div>
      <Header hideNav hideBackground />
      <main className="relative z-10">{children}</main>
    </>
  );
}
