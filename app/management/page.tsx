"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Spinner } from "@/components/ui/spinner";
import { format } from "date-fns";
import { it } from "date-fns/locale";

export default function ManagementPage() {
  const tournaments = useQuery(api.modules.tournaments.get.list);

  if (tournaments === undefined) {
    return (
      <div className="flex justify-center mt-10">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">Seleziona un torneo</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tournaments.map((tournament: any) => (
          <Card
            key={tournament._id}
            className="bg-background text-foreground border-border"
          >
            <CardHeader>
              <CardTitle>{tournament.name}</CardTitle>
              <CardDescription>
                Stato:{" "}
                <span className="font-semibold uppercase text-xs">
                  {tournament.status}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm mb-4">
                Inizio:{" "}
                {format(new Date(tournament.startDate), "dd MMMM yyyy", {
                  locale: it,
                })}
              </p>
              <Button asChild className="w-full">
                <Link href={`/management/${tournament.slug}`}>Gestisci</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
        {tournaments.length === 0 && (
          <p className="text-muted-foreground">Nessun torneo trovato.</p>
        )}
      </div>
    </div>
  );
}
