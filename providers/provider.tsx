import { ThemeProvider } from "next-themes";
import { ConvexClientProvider } from "./convex.provider";

export default function Providers({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ConvexClientProvider>
      <ThemeProvider
        attribute="data-theme"
        defaultTheme="light"
        themes={["light", "dark", "neutral"]}
        enableSystem
        disableTransitionOnChange
      >
        {children}
      </ThemeProvider>
    </ConvexClientProvider>
  );
}
