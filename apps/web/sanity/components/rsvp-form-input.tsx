"use client";

import {
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Grid,
  Spinner,
  Stack,
  Text,
} from "@sanity/ui";
import { useCallback, useEffect, useState } from "react";
import { type ObjectInputProps, type Path, useFormValue } from "sanity";

type RsvpEntry = {
  id: string;
  name: string;
  email: string;
  guests: number;
  seats: number;
  createdAt: number;
};

type ListState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; entries: RsvpEntry[] }
  /** `signIn` distingue «non hai accesso» da «il servizio è rotto». */
  | { status: "error"; message: string; signIn?: boolean };

const dateFormatter = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Rome",
});

/**
 * Il blocco è un oggetto dentro un array: il suo `path` finisce con il
 * segmento `{_key}` che lo identifica. Finché il blocco non è stato salvato
 * una volta il `_key` c'è comunque — lo assegna lo Studio all'inserimento.
 */
function keyFromPath(path: Path) {
  for (let index = path.length - 1; index >= 0; index -= 1) {
    const segment = path[index];
    if (typeof segment === "object" && segment !== null && "_key" in segment) {
      return segment._key;
    }
  }

  return undefined;
}

function csvCell(value: string | number) {
  const text = String(value);
  return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Input del blocco «Modulo di iscrizione»: i campi standard più il pannello
 * con le iscrizioni già arrivate.
 *
 * L'elenco non viene da Sanity ma da `/api/events/rsvp/list`, che sta sullo
 * stesso dominio dello Studio e vuole una sessione Clerk dello staff. Chi apre
 * lo Studio senza essere loggato sul sito vede il modulo, non i nomi.
 */
export function RsvpFormInput(props: ObjectInputProps) {
  const documentId = String(useFormValue(["_id"]) ?? "").replace(
    /^drafts\./,
    "",
  );
  const blockKey = keyFromPath(props.path);
  const capacity = props.value?.capacity as number | undefined;

  const [state, setState] = useState<ListState>({ status: "idle" });

  const load = useCallback(async () => {
    if (!documentId || !blockKey) return;

    setState({ status: "loading" });

    try {
      const response = await fetch(
        `/api/events/rsvp/list?eventId=${encodeURIComponent(documentId)}&key=${encodeURIComponent(blockKey)}`,
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setState({
          status: "error",
          message: payload?.error ?? "Non riesco a leggere le iscrizioni.",
          signIn: response.status === 401 || response.status === 403,
        });
        return;
      }

      setState({ status: "ready", entries: payload?.entries ?? [] });
    } catch {
      setState({
        status: "error",
        message: "Non riesco a contattare il sito. Riprova fra poco.",
      });
    }
  }, [documentId, blockKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const entries = state.status === "ready" ? state.entries : [];
  const seatsTaken = entries.reduce((total, entry) => total + entry.seats, 0);

  const exportCsv = () => {
    const rows = [
      ["Nome", "Email", "Persone", "Iscritto il"],
      ...entries.map((entry) => [
        entry.name,
        entry.email,
        entry.seats,
        dateFormatter.format(new Date(entry.createdAt)),
      ]),
    ];

    // Il BOM serve a Excel per riconoscere l'UTF-8: senza, gli accenti saltano.
    const csv = `﻿${rows.map((row) => row.map(csvCell).join(",")).join("\n")}`;
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );

    const link = document.createElement("a");
    link.href = url;
    link.download = `iscrizioni-${documentId}-${blockKey}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Stack space={4}>
      {props.renderDefault(props)}

      <Card padding={3} radius={2} shadow={1} tone="transparent">
        <Stack space={3}>
          <Flex align="center" gap={2}>
            <Box flex={1}>
              <Text size={1} weight="semibold">
                Iscrizioni ricevute
              </Text>
            </Box>
            {state.status === "loading" && <Spinner size={1} />}
            <Button
              mode="bleed"
              fontSize={1}
              padding={2}
              text="Aggiorna"
              disabled={state.status === "loading"}
              onClick={() => void load()}
            />
            <Button
              mode="ghost"
              fontSize={1}
              padding={2}
              text="Esporta CSV"
              disabled={entries.length === 0}
              onClick={exportCsv}
            />
          </Flex>

          {!blockKey && (
            <Text size={1} muted>
              Salva il documento per iniziare a raccogliere le iscrizioni.
            </Text>
          )}

          {state.status === "error" && (
            <Card padding={3} radius={2} tone="caution">
              <Text size={1}>
                {state.message}
                {state.signIn && (
                  <>
                    {" "}
                    <a href="/dashboard" target="_blank" rel="noreferrer">
                      Accedi al sito
                    </a>{" "}
                    con l'account dello staff e ricarica.
                  </>
                )}
              </Text>
            </Card>
          )}

          {state.status === "ready" && (
            <Stack space={3}>
              <Grid columns={2} gap={2}>
                <Card padding={3} radius={2} tone="primary">
                  <Text size={1} muted>
                    Iscritti
                  </Text>
                  <Text size={3} weight="semibold">
                    {entries.length}
                  </Text>
                </Card>
                <Card padding={3} radius={2} tone="primary">
                  <Text size={1} muted>
                    Persone attese
                  </Text>
                  <Text size={3} weight="semibold">
                    {capacity ? `${seatsTaken} / ${capacity}` : seatsTaken}
                  </Text>
                </Card>
              </Grid>

              {entries.length === 0 ? (
                <Text size={1} muted>
                  Nessuna iscrizione, per ora.
                </Text>
              ) : (
                <Stack space={2}>
                  {entries.map((entry) => (
                    <Card key={entry.id} padding={3} radius={2} tone="default">
                      <Flex align="center" gap={3}>
                        <Box flex={1}>
                          <Text size={1} weight="medium">
                            {entry.name}
                          </Text>
                          <Box marginTop={2}>
                            <Text size={1} muted textOverflow="ellipsis">
                              {entry.email}
                            </Text>
                          </Box>
                        </Box>
                        <Badge tone="primary" fontSize={0}>
                          {entry.seats === 1
                            ? "1 persona"
                            : `${entry.seats} persone`}
                        </Badge>
                        <Text size={0} muted>
                          {dateFormatter.format(new Date(entry.createdAt))}
                        </Text>
                      </Flex>
                    </Card>
                  ))}
                </Stack>
              )}
            </Stack>
          )}
        </Stack>
      </Card>
    </Stack>
  );
}
