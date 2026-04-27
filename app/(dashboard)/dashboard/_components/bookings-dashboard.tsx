"use client";

import { useMutation, useQuery } from "convex/react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Phone,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/(dashboard)/_components/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/(dashboard)/_components/tabs";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

type Booking = Doc<"bookings">;

const levelLabels: Record<Booking["level"], string> = {
  principiante: "Principiante",
  intermedio: "Intermedio",
  avanzato: "Avanzato",
};

const statusLabels: Record<Booking["status"], string> = {
  pending_on_site_payment: "In attesa",
  accepted_on_site_payment: "Accettata",
};

function formatBookingDate(timestamp: number) {
  return format(timestamp, "EEEE d MMMM, HH:mm", { locale: it });
}

function BookingStatusBadge({ status }: { status: Booking["status"] }) {
  return (
    <Badge
      variant={"default"}
      className={cn(
        status === "accepted_on_site_payment"
          ? "bg-green-200 text-green-950"
          : "bg-amber-400 text-amber-950",
      )}
    >
      {statusLabels[status]}
    </Badge>
  );
}

function DashboardSkeleton() {
  const statSkeletons = ["stat-a", "stat-b", "stat-c"] as const;
  const listSkeletons = ["row-a", "row-b", "row-c"] as const;

  return (
    <div className="space-y-6 px-4">
      <div className="grid gap-4 md:grid-cols-3">
        {statSkeletons.map((item) => (
          <Card key={item}>
            <CardHeader className="gap-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
            </CardHeader>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-3">
          {listSkeletons.map((item) => (
            <Skeleton key={item} className="h-28 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function BookingCard({
  booking,
  isUpdating,
  onAccept,
}: {
  booking: Booking;
  isUpdating: boolean;
  onAccept: (bookingId: Id<"bookings">) => Promise<void>;
}) {
  const totalAmount = booking.pricePerPlayer * booking.players.length;

  return (
    <article className="rounded-lg border bg-muted p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold">{booking.bookedBy}</h3>
            <BookingStatusBadge status={booking.status} />
            <Badge variant="secondary">{levelLabels[booking.level]}</Badge>
          </div>

          <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <CalendarDays className="size-4" />
              <span className="capitalize">
                {formatBookingDate(booking.bookingDate)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="size-4" />
              <span>{booking.phone || "Numero non disponibile"}</span>
            </div>
            <div className="flex items-center gap-2">
              <UsersRound className="size-4" />
              <span>
                {booking.players.length} giocatori, {totalAmount} EUR totali
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock3 className="size-4" />
              <span>
                Inserita il{" "}
                {format(booking.createdAt, "d MMM yyyy, HH:mm", { locale: it })}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {booking.players.map((player) => (
              <Badge
                key={player}
                variant="outline"
                className="font-normal bg-white"
              >
                {player}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex min-w-0 flex-col items-stretch gap-2 lg:w-44">
          <div className="rounded-lg bg-muted/50 sm:px-3 sm:py-2 text-sm">
            <div className="font-medium">Pagamento</div>
            <div className="text-muted-foreground">In struttura</div>
          </div>
          {booking.status === "pending_on_site_payment" ? (
            <Button
              onClick={() => onAccept(booking._id)}
              disabled={isUpdating}
              className="w-full"
            >
              <ShieldCheck className="size-4" />
              Conferma prenotazione
            </Button>
          ) : (
            <Button disabled variant="outline" className="w-full">
              <CheckCircle2 className="size-4" />
              Già accettata
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

export default function BookingsDashboard() {
  const bookings = useQuery(api.bookings.list.default, {
    includePast: false,
  });
  const acceptBooking = useMutation(api.bookings.accept.default);
  const [updatingId, setUpdatingId] = useState<Id<"bookings"> | null>(null);

  const pendingBookings = useMemo(
    () =>
      (bookings ?? []).filter(
        (booking) => booking.status === "pending_on_site_payment",
      ),
    [bookings],
  );

  const acceptedBookings = useMemo(
    () =>
      (bookings ?? []).filter(
        (booking) => booking.status === "accepted_on_site_payment",
      ),
    [bookings],
  );

  const nextBooking = bookings?.[0] ?? null;

  const handleAccept = async (bookingId: Id<"bookings">) => {
    try {
      setUpdatingId(bookingId);
      await acceptBooking({ bookingId });
      toast.success("Prenotazione accettata", {
        description: "La prenotazione e ora visibile come confermata.",
      });
    } catch (error) {
      toast.error("Operazione non completata", {
        description:
          error instanceof Error
            ? error.message
            : "Non sono riuscito ad aggiornare la prenotazione.",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  if (bookings === undefined) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold">Gestione prenotazioni</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Visualizza le richieste in arrivo e conferma gli slot da incassare in
          struttura.
        </p>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.3fr_1fr_1fr]">
        <Card>
          <CardHeader>
            <CardDescription>Prossima prenotazione</CardDescription>
            <CardTitle className="text-lg">
              {nextBooking
                ? formatBookingDate(nextBooking.bookingDate)
                : "Nessuna prenotazione in agenda"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {nextBooking ? (
              <div className="space-y-1">
                <div className="font-medium text-foreground">
                  {nextBooking.bookedBy}
                </div>
                <div>{nextBooking.players.length} giocatori</div>
              </div>
            ) : (
              <div>Non ci sono slot futuri da gestire.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Da confermare</CardDescription>
            <CardTitle className="text-3xl">{pendingBookings.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Richieste in attesa di accettazione dallo staff.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Confermate</CardDescription>
            <CardTitle className="text-3xl">
              {acceptedBookings.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Prenotazioni future gia validate nella dashboard.
          </CardContent>
        </Card>
      </section>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            In attesa ({pendingBookings.length})
          </TabsTrigger>
          <TabsTrigger value="all">Tutte ({bookings.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <div className="mb-4">
            <h4 className="text-lg font-medium">In attesa di conferma</h4>
            <p className="text-sm text-muted-foreground">
              Prenotazioni in arrivo che necessitano di essere accettate dallo
              staff. Accettando una prenotazione, confermi che il cliente
              paghera in struttura al suo arrivo.
            </p>
          </div>
          {pendingBookings.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CheckCircle2 className="size-5" />
                </EmptyMedia>
                <EmptyTitle>Nessuna richiesta in attesa</EmptyTitle>
                <EmptyDescription>
                  Le nuove prenotazioni compariranno qui appena arrivate.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="space-y-3">
              {pendingBookings.map((booking) => (
                <BookingCard
                  key={booking._id}
                  booking={booking}
                  isUpdating={updatingId === booking._id}
                  onAccept={handleAccept}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all">
          <div className="mb-4">
            <h4 className="text-lg font-medium">
              Tutte le prenotazioni future
            </h4>
            <p className="text-sm text-muted-foreground">
              Vista completa degli slot prenotati con stato e dettagli di
              contatto.
            </p>
          </div>
          {bookings.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CalendarDays className="size-5" />
                </EmptyMedia>
                <EmptyTitle>Agenda vuota</EmptyTitle>
                <EmptyDescription>
                  Non sono presenti prenotazioni future da mostrare.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="space-y-3">
              {bookings.map((booking) => (
                <BookingCard
                  key={booking._id}
                  booking={booking}
                  isUpdating={updatingId === booking._id}
                  onAccept={handleAccept}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
