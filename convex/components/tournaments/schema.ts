import { defineSchema } from "convex/server";

import tournaments from "./tables/tournaments";
import players from "./tables/players";
import teams from "./tables/teams";
import groups from "./tables/groups";
import groupStandings from "./tables/groupStandings";
import tournamentCategories from "./tables/tournamentCategories";
import tournamentTeams from "./tables/tournamentTeams";
import matches from "./tables/matches";

export default defineSchema({
  players,
  teams,

  tournaments,
  tournamentCategories,
  tournamentTeams,

  groups,
  groupStandings,

  matches,
});
