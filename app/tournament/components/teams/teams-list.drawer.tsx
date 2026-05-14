import { useQuery } from "convex/react";
import {
  ResponsiveDrawer,
  ResponsiveDrawerContent,
  ResponsiveDrawerHeader,
  type ResponsiveDrawerProps,
} from "@/components/ui/responsive-drawer";

import { api } from "@/convex/_generated/api";

interface TeamsListDrawerProps extends ResponsiveDrawerProps {
  categoryName?: string;
  categoryId?: string;
}

export default function TeamsListDrawer({
  categoryName,
  categoryId,
  ...props
}: TeamsListDrawerProps) {
  const teams = useQuery(
    api.modules.tournaments.teams.get.getTeamsByCategoryId,
    categoryId ? { categoryId } : "skip",
  );

  return (
    <ResponsiveDrawer {...props}>
      <ResponsiveDrawerContent>
        <ResponsiveDrawerHeader
          title={"Squadre iscritte"}
          description={`Categoria: ${categoryName || "N/A"}`}
        />

        <div className="divide-y px-4 pb-2 overflow-y-auto">
          {teams?.map((team) => (
            <div key={team._id} className="py-3">
              <p className="font-medium">{team.name}</p>
              <p className="text-sm text-muted-foreground">
                {team.players
                  .map((player) => `${player.lastName} ${player.firstName}`)
                  .join(", ")}
              </p>
            </div>
          ))}
        </div>
      </ResponsiveDrawerContent>
    </ResponsiveDrawer>
  );
}
