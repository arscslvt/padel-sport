"use client";

import { Box, Button, Card, Flex, Stack, Text } from "@sanity/ui";
import { type ObjectInputProps, type Path, useFormValue } from "sanity";

import { dashboardUrl } from "@/lib/dashboard-url";

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

/**
 * Input del blocco «Modulo di iscrizione»: i campi standard più il
 * collegamento alle iscrizioni già arrivate.
 *
 * Gli iscritti non si leggono più da qui: sono dati dello staff, e lo staff
 * ha il suo gestionale su un altro dominio, con il proprio accesso. Il
 * pulsante apre la pagina «Iscrizioni» già posizionata su questo modulo — la
 * stessa coppia evento/blocco che usano le notifiche (`staffEventFormUrl`).
 */
export function RsvpFormInput(props: ObjectInputProps) {
  const documentId = String(useFormValue(["_id"]) ?? "").replace(
    /^drafts\./,
    "",
  );
  const blockKey = keyFromPath(props.path);

  const href =
    documentId && blockKey
      ? `${dashboardUrl()}/events?form=${encodeURIComponent(`${documentId}:${blockKey}`)}`
      : null;

  return (
    <Stack space={4}>
      {props.renderDefault(props)}

      <Card padding={3} radius={2} shadow={1} tone="transparent">
        <Flex align="center" gap={2}>
          <Box flex={1}>
            <Stack space={2}>
              <Text size={1} weight="semibold">
                Iscrizioni ricevute
              </Text>
              <Text size={1} muted>
                {href
                  ? "L'elenco degli iscritti e i posti occupati sono nel gestionale."
                  : "Salva il documento per iniziare a raccogliere le iscrizioni."}
              </Text>
            </Stack>
          </Box>
          {href && (
            <Button
              as="a"
              href={href}
              target="_blank"
              rel="noreferrer"
              mode="ghost"
              fontSize={1}
              padding={2}
              text="Apri nel gestionale"
            />
          )}
        </Flex>
      </Card>
    </Stack>
  );
}
