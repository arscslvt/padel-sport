"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

export default function ThemeSetter({ theme }: { theme: string }) {
  const { setTheme } = useTheme();

  useEffect(() => {
    setTheme(theme);
  }, [setTheme, theme]);

  return null;
}
