import { ConvexClientProvider } from "./convex.provider";

export default function Providers({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <ConvexClientProvider>{children}</ConvexClientProvider>;
}
