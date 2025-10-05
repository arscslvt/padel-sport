import React from "react";

import padelsportLogo from "@/assets/branding/logo.svg";
import Image from "next/image";
import { getInfo } from "@/lib/info";
import { Facebook, Instagram } from "lucide-react";
import { Button } from "./ui/button";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="px-6 lg:px-32 py-8 text-white max-w-dvw">
      <div className="flex flex-col items-center md:items-end md:flex-row gap-8 lg:gap-12">
        <div className="flex flex-col md:flex-row items-center flex-1 gap-8">
          <div>
            <Image
              src={padelsportLogo}
              alt="Padel Sport Logo"
              className="object-contain w-20 md:w-28"
            />
          </div>
          <div className="text-sm text-center md:text-left flex-1">
            <h4 className="font-medium">{getInfo("name")}</h4>
            <p className="text-white/80">{getInfo("address")}</p>
            <p className="text-white/80">{getInfo("email")}</p>
            <p className="text-white/80">CF/P.IVA {getInfo("cf")}</p>
          </div>
        </div>
        <div className="flex flex-row items-center lg:flex-col lg:items-end gap-1">
          <div className="text-sm">
            <h4 className="font-medium">Seguici su</h4>
          </div>
          <div className="flex gap-2 translate-x-3">
            <Link
              href={getInfo("instagramUrl") || "#"}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size={"icon"} variant={"ghost"} className="rounded-full">
                <Instagram className="h-8 w-8" strokeWidth={1.3} />
              </Button>
            </Link>
            <Link
              href={getInfo("facebookUrl") || "#"}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size={"icon"} variant={"ghost"} className="rounded-full">
                <Facebook className="h-8 w-8" strokeWidth={1.3} />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
