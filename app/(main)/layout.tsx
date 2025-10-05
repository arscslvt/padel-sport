import Footer from "@/components/footer";
import Header from "@/components/header";
import React from "react";

export default function ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div>
      <main className="relative max-w-dvw overflow-x-hidden">
        <Header />
        {children}
      </main>
      <Footer />
    </div>
  );
}
