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
      <main className="relative">
        <Header />
        {children}
      </main>
      <Footer />
    </div>
  );
}
