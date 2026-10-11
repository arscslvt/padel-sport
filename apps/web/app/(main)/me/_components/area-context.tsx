"use client";

import { createContext, useContext } from "react";

import type { Wallet } from "./types";

/**
 * Il portafoglio letto una volta sola dal guscio dell'area personale e
 * condiviso con le sezioni.
 *
 * Ogni sezione è una rotta a sé, ma la sottoscrizione Convex vive nel layout:
 * passando da «Punti» a «Premi» il saldo non si ricarica e non lampeggia.
 */
const PersonalAreaContext = createContext<Wallet | null>(null);

export const PersonalAreaProvider = PersonalAreaContext.Provider;

export function useWallet(): Wallet {
  const wallet = useContext(PersonalAreaContext);
  if (!wallet) {
    throw new Error("useWallet va usato dentro il guscio dell'area personale.");
  }
  return wallet;
}
