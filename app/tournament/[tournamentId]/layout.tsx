"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

export default function TournamentLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { setTheme } = useTheme();

  useEffect(() => {
    setTheme("neutral");
  }, [setTheme]);

  return (
    <div className="md:flex justify-center">
      <div className="md:max-w-5xl">{children}</div>
    </div>
  );
}
