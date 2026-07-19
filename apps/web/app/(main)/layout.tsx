"use client";

import Footer from "@/components/footer";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { ArrowRight } from "lucide-react";
import { useTheme } from "next-themes";
import React from "react";

export default function ({
  children,
  modal,
}: Readonly<{
  children: React.ReactNode;
  modal: React.ReactNode;
}>) {
  const { setTheme } = useTheme();

  React.useEffect(() => {
    setTheme("light");
  }, [setTheme]);

  return (
    <div className="relative">
      <Header />
      <main className="max-w-dvw overflow-x-hidden">{children}</main>
      <Footer />
      {modal}
      <Toaster />
    </div>
  );
}
