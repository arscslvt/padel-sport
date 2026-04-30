"use client";

import { SoundProvider } from "@web-kits/audio/react";

import type React from "react";
import { useState } from "react";

export default function HapticsProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [enabled, setEnabled] = useState(true);
  const [volume, setVolume] = useState(0.8);
  return (
    <SoundProvider
      enabled={enabled}
      volume={volume}
      onEnabledChange={setEnabled}
      onVolumeChange={setVolume}
    >
      {children}
    </SoundProvider>
  );
}
