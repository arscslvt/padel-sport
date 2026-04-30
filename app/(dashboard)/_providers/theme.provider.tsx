"use client";

import { useEffect } from "react";

export default function InternalThemeProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  useEffect(() => {
    const metaThemeColor = document.querySelector("meta[name=theme-color]");
    const metaViewport = document.querySelector("meta[name=viewport]");
    const bg = "#ffffff";

    if (metaThemeColor) {
      metaThemeColor.setAttribute("content", bg);
    }

    // Ensure viewport-fit=cover for Safari iOS safe area
    if (metaViewport) {
      const viewportContent = metaViewport.getAttribute("content") || "";
      if (!viewportContent.includes("viewport-fit")) {
        metaViewport.setAttribute(
          "content",
          `${viewportContent}, viewport-fit=cover`,
        );
      }
    }

    // set both html and body background to ensure the page background is white
    if (document.documentElement) {
      document.documentElement.style.backgroundColor = bg;
      document.documentElement.style.overscrollBehavior = "none";
    }
    if (document.body) {
      document.body.style.backgroundColor = bg;
      document.body.style.overscrollBehavior = "none";
    }
  }, []);

  return <>{children}</>;
}
