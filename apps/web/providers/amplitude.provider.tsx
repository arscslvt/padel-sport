"use client";

import * as amplitude from "@amplitude/unified";
import { useEffect } from "react";

import { useConsent } from "@/providers/consent.provider";

/*
 * Chiave di ingestione Amplitude: è pubblica per definizione (viene inlinata
 * nel bundle dal prefisso NEXT_PUBLIC_), ma se manca al momento del build la
 * variabile diventa `undefined` e l'SDK resterebbe spento in silenzio: per
 * questo l'init la controlla e lo dice a voce alta in console.
 */
const AMPLITUDE_API_KEY = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY;

/*
 * `initAll` va eseguito una sola volta per ciclo di vita dell'app. I flag
 * stanno a livello di modulo, non nel componente: in dev StrictMode monta due
 * volte e un ref non basterebbe a impedire la doppia inizializzazione.
 */
let initAttempted = false;
let sdkLive = false;

/** Inizializza l'SDK una volta sola. Ritorna `true` se è davvero attivo. */
function initAmplitude() {
  if (initAttempted) return sdkLive;
  initAttempted = true;

  if (!AMPLITUDE_API_KEY) {
    console.warn("Amplitude API key missing — analytics disabled");
    return false;
  }

  amplitude.initAll(AMPLITUDE_API_KEY, {
    analytics: { autocapture: true },
    sessionReplay: { sampleRate: 1 },
  });
  sdkLive = true;

  return true;
}

/**
 * Inizializza Amplitude (analytics + session replay) per tutto il sito, ma
 * solo dopo un consenso esplicito. Va montato una volta sola, nel layout
 * radice, dentro <ConsentProvider>.
 */
export function AmplitudeAnalytics() {
  const { analytics } = useConsent();

  // L'SDK tocca window/document: l'init deve stare in un effetto, mai nel
  // render lato server.
  useEffect(() => {
    // Scelta non ancora espressa: non si carica niente e non si scrive niente
    // sul dispositivo.
    if (analytics === null) return;

    if (analytics) {
      if (initAmplitude()) amplitude.setOptOut(false);
      return;
    }

    /*
     * Revoca dopo un consenso: `initAll` non si disfa entro la stessa pagina,
     * ma l'opt-out ferma l'invio degli eventi e la registrazione del replay.
     * Al caricamento successivo l'init non parte proprio.
     */
    if (sdkLive) amplitude.setOptOut(true);
  }, [analytics]);

  return null;
}

/**
 * Evento esplicito della home. Gli eventi emessi prima che `initAll` abbia
 * finito vengono messi in coda dall'SDK e spediti all'init: montarlo dentro la
 * pagina — e non nel layout — evita di attribuire "Viewed Home Page" a rotte
 * come /book o /events, che condividono lo stesso layout radice.
 */
export function TrackHomePageView() {
  const { analytics } = useConsent();

  useEffect(() => {
    if (!analytics) return;

    amplitude.track("Viewed Home Page", { prompt_version: "BA400.4" }); // helps improve this setup flow — safe to remove once you've verified the event lands
  }, [analytics]);

  return null;
}
