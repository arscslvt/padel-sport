"use client";

import { usePathname } from "next/navigation";
import type React from "react";

import Footer from "@/components/footer";
import Header from "@/components/header";
import { MaintenancePage } from "@/components/maintenance";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

/**
 * Le pagine che lavorano con le prenotazioni e l'area personale: in
 * manutenzione lasciano il posto a «Torniamo subito». Le pagine vetrina
 * restano aperte, e dei loro moduli si ferma solo il modulo
 * (components/maintenance.tsx).
 */
const CONVEX_PAGES = [
	"/book",
	"/booking",
	"/me",
	"/join",
	"/invite",
	"/amico",
	"/points-exit",
];

/** Annullare l'iscrizione a un evento, o disiscriversi dalle comunicazioni. */
const CONVEX_EVENT_PAGES = /^\/events\/[^/]+\/(rsvp|comunicazioni)(\/|$)/;

function usesConvex(pathname: string) {
	return (
		CONVEX_PAGES.some(
			(page) => pathname === page || pathname.startsWith(`${page}/`),
		) || CONVEX_EVENT_PAGES.test(pathname)
	);
}

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
				{usesConvex(pathname) ? (
					<MaintenancePage>{children}</MaintenancePage>
				) : (
					children
				)}
			</main>
			<Footer />
			{modal}
			{/* Nell'area personale il dock occupa il fondo dello schermo: da
			    telefono i toast salgono sopra, invece di coprirlo. */}
			<Toaster
				mobileOffset={pathname.startsWith("/me") ? { bottom: 96 } : undefined}
			/>
		</div>
	);
}
