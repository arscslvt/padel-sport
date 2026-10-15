"use client";

import { useSession, useUser } from "@clerk/nextjs";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { KeyRound, Laptop, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";

import { ListGroup, ListRow } from "@/app/_components/list";
import { useProfileDialog } from "@/app/_providers/profile-dialog.provider";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type Sessions = Awaited<
  ReturnType<NonNullable<ReturnType<typeof useUser>["user"]>["getSessions"]>
>;

/** La password: se c'è, e dove si cambia. */
export function PasswordRow() {
  const { user } = useUser();
  const { openProfile } = useProfileDialog();

  if (!user) return null;

  return (
    <ListGroup>
      <ListRow
        leading={<KeyRound className="size-5" />}
        title="Password"
        subtitle={
          user.passwordEnabled
            ? "Impostata"
            : "Non impostata: entri con il codice via email"
        }
        chevron
        onClick={() => openProfile("security")}
      />
    </ListGroup>
  );
}

/**
 * Dove sei collegato in questo momento: telefono, computer, browser e città.
 *
 * Serve a riconoscere a colpo d'occhio un accesso che non è tuo. Scollegare
 * un dispositivo si fa dal pannello di Clerk, che può chiedere di confermare
 * chi sei prima di farlo.
 */
export function ActiveDevices() {
  const { user } = useUser();
  const { session: current } = useSession();
  const { openProfile } = useProfileDialog();
  const [sessions, setSessions] = useState<Sessions | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    user
      .getSessions()
      .then((all) => {
        if (!cancelled) {
          setSessions(all.filter((session) => session.status === "active"));
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user) return null;

  return (
    <ListGroup>
      {failed ? (
        <p className="text-muted-foreground px-4 py-4 text-[15px]">
          Non riusciamo a caricare i dispositivi. Riprova ricaricando la pagina.
        </p>
      ) : sessions === null ? (
        <DeviceSkeleton />
      ) : (
        // Questo dispositivo in cima: è quello che si riconosce per primo.
        [...sessions]
          .sort(
            (a, b) =>
              Number(b.id === current?.id) - Number(a.id === current?.id) ||
              b.lastActiveAt.getTime() - a.lastActiveAt.getTime(),
          )
          .map((session) => {
            const activity = session.latestActivity;
            const isCurrent = session.id === current?.id;
            const device =
              activity?.deviceType ||
              (activity?.isMobile ? "Telefono" : "Computer");
            const where = [activity?.browserName, activity?.city]
              .filter(Boolean)
              .join(", ");
            const when = isCurrent
              ? null
              : `attivo ${formatDistanceToNow(session.lastActiveAt, {
                  addSuffix: true,
                  locale: it,
                })}`;
            const Icon = activity?.isMobile ? Smartphone : Laptop;

            return (
              <ListRow
                key={session.id}
                leading={<Icon className="size-5" />}
                title={device}
                subtitle={
                  [where, when].filter(Boolean).join(" · ") || undefined
                }
                trailing={
                  isCurrent ? (
                    <Badge variant="secondary">Questo dispositivo</Badge>
                  ) : null
                }
              />
            );
          })
      )}

      <ListRow
        title="Gestisci i dispositivi"
        chevron
        onClick={() => openProfile("security")}
        className="text-primary"
      />
    </ListGroup>
  );
}

function DeviceSkeleton() {
  return (
    <div aria-hidden className="flex min-h-14 items-center gap-3 px-4 py-2.5">
      <Skeleton className="size-5 rounded-md" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-3 w-44 max-w-full" />
      </div>
    </div>
  );
}
