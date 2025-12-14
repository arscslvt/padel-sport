"use client";

import Image from "next/image";

import mapImage from "@/assets/map/map-1.jpg";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  ResponsiveDrawer,
  ResponsiveDrawerContent,
  ResponsiveDrawerFooter,
  ResponsiveDrawerHeader,
} from "@/components/ui/responsive-drawer";
import { useRouter } from "next/navigation";
import { Copy } from "lucide-react";
import { toast } from "sonner";

export default function WherePage() {
  const router = useRouter();

  const handleCopyAddress = () => {
    navigator.clipboard.writeText("Via Pertini, 96010 Melilli SR");
    toast.success("Indirizzo copiato negli appunti!", {
      description: (
        <span className="text-muted-foreground">
          Apri la tua app di mappe e incolla l'indirizzo.
        </span>
      ),
    });
  };

  return (
    <ResponsiveDrawer
      className="min-h-dvh flex flex-col"
      open
      setOpen={(o) => !o && router.back()}
    >
      <ResponsiveDrawerContent>
        <ResponsiveDrawerHeader title="Dove siamo" />
        <div className="flex flex-1 flex-col items-center px-4 md:px-0">
          <div className="max-w-200 md:max-h-150 overflow-clip border border-white/20 rounded-xl mx-auto shadow-lg shadow-black/20">
            <Image
              src={mapImage}
              alt="Map"
              objectFit="cover"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-col items-center">
            <p className="text-center mt-4 px-4 max-w-150 mx-auto">
              Ci trovi a Melilli, in provincia di Siracusa.
              <br />
              <span className="font-medium">
                Via Pertini, 96010 Melilli SR{" "}
                <Button
                  variant={"ghost"}
                  size={"icon"}
                  onClick={handleCopyAddress}
                >
                  <Copy />
                </Button>
              </span>
            </p>
          </div>
        </div>
        <ResponsiveDrawerFooter className="flex justify-center">
          <Link
            href={"https://maps.app.goo.gl/WWQoVqCrdZEY8Tj87"}
            target="_blank"
            rel="noopener noreferrer"
            passHref
            className="flex"
          >
            <Button
              size={"lg"}
              variant="default"
              className="w-full mt-8 rounded-full"
            >
              Apri in Google Maps
            </Button>
          </Link>
        </ResponsiveDrawerFooter>
      </ResponsiveDrawerContent>
    </ResponsiveDrawer>
  );
}
