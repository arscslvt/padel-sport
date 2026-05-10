"use client";

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
      <Header hideNav />
      {children}
    </>
  );
}
