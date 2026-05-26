"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Diff, HashIcon, Users2 } from "lucide-react";

// This type is used to define the shape of our data.
// You can use a Zod schema here if you want.
export type Round = {
  id: string;
  position?: number;
  team: string;
  slot?: string;
  games: number;
  pts: number;
  victories: number;
  defeats: number;
  dg: number;
};

export const columns: ColumnDef<Round>[] = [
  {
    accessorKey: "position",
    header: () => {
      return (
        <div className="flex items-center justify-center gap-1">
          <HashIcon className="size-3.5 text-accent" />
        </div>
      );
    },
    cell: ({ row }) => {
      const position = row.original.position;
      return (
        <span className="text-lg font-medium font-heading italic text-accent">
          {position ?? "-"}
        </span>
      );
    },
  },
  {
    accessorKey: "team",
    header: () => {
      return (
        <span className="flex items-center gap-1">
          <Users2 className="size-3.5" /> Squadra
        </span>
      );
    },
    cell: ({ row }) => {
      const team = row.original.team;
      return (
        <div className="font-medium">
          <span>{team}</span>
          <div className="flex mt-1">
            {row.original.slot && (
              <span className="opacity-60">{row.original.slot}</span>
            )}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "games",
    header: "Partite",
  },
  {
    accessorKey: "pts",
    header: () => {
      return (
        <div className="flex items-center justify-center gap-1">
          <span className="font-semibold text-emerald-100">PTS</span>
        </div>
      );
    },
    cell: ({ row }) => {
      const pts = row.original.pts;
      return (
        <span className="font-semibold font-heading text-emerald-900 bg-emerald-100 shadow-xl shadow-accent/20 rounded-full block text-lg px-2 text-center">
          {pts}
        </span>
      );
    },
  },
  {
    accessorKey: "victories",
    header: "Vittorie",
  },
  {
    accessorKey: "defeats",
    header: "Sconfitte",
  },
  {
    accessorKey: "dg",
    header: () => {
      return <Diff className="size-4" />;
    },
    cell: ({ row }) => {
      const dg = row.original.dg;
      return (
        <span
          className={`font-semibold ${dg > 0 ? "text-emerald-500" : dg < 0 ? "text-destructive" : ""}`}
        >
          {dg > 0 ? `+${dg}` : dg}
        </span>
      );
    },
  },
];
