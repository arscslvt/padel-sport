"use client";

import { usePathname } from "next/navigation";
import type React from "react";

import Footer from "@/components/footer";
import Header from "@/components/header";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

export default function MainLayout({
	children,
	modal,
}: Readonly<{
	children: React.ReactNode;
	modal: React.ReactNode;
}>) {
	const pathname = usePathname();
	// Sulla home l'hero deve passare sotto la pillola dell'header; altrove serve
	// lo spazio per non finirci sotto.
	const isHome = pathname === "/";

	return (
		<div className="relative bg-background">
			<Header />
			<main
				className={cn(
					"max-w-dvw overflow-x-hidden",
					!isHome && "pt-24 sm:pt-28",
				)}
			>
				{children}
			</main>
			<Footer />
			{modal}
			<Toaster />
		</div>
	);
}
