import HeroVideo from "@/components/hero-video";
import { Button } from "@/components/ui/button";
import React from "react";

export default function Home() {
  return (
    <div>
      <div className="bg-gradient-to-t from-emerald-900 to-background">
        <div className="flex items-end justify-center h-dvh lg:h-[calc(100vh-6rem)] lg:mt-[6rem] gap-22">
          <div className="relative items-center z-10 flex-1 text-white flex flex-col gap-8 px-4 pb-8 bg-gradient-to-t from-emerald-900 from-50% to-transparent lg:pb-6">
            <div className="flex flex-col items-center gap-2">
              <h1 className="text-[28px] lg:text-4xl leading-10 font-heading font-semibold max-w-[580px] text-center">
                Mettersi in gioco non è mai stato così bello
              </h1>
              <h4 className="lg:text-lg text-white/80 text-center">
                Dal principiante al pro: qui trovi avversari, tornei e tanto
                divertimento.
              </h4>
            </div>

            <div>
              <Button
                size={"lg"}
                className="h-14 px-8 rounded-full bg-emerald-400 hover:bg-emerald-500 text-emerald-950 font-heading"
              >
                Prenota il tuo campo
              </Button>
            </div>
          </div>

          <div className="fixed inset-0 lg:p-12 lg:absolute flex justify-center w-dvw h-dvh lg:h-full lg:w-auto z-0">
            <HeroVideo
              autoPlay
              loop
              muted
              playsInline
              className="h-full w-auto rounded-none lg:rounded-t-3xl object-cover"
              preload="auto"
              controls={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
