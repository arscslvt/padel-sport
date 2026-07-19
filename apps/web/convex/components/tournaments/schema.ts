import { defineSchema } from "convex/server";
import categoryStageSelections from "./tables/categoryStageSelections";
import groupStandings from "./tables/groupStandings";
import groups from "./tables/groups";
import groupTeams from "./tables/groupTeams";
import matches from "./tables/matches";
import players from "./tables/players";
import teams from "./tables/teams";
import tournamentCategories from "./tables/tournamentCategories";
import tournaments from "./tables/tournaments";
import tournamentTeams from "./tables/tournamentTeams";

export default defineSchema({
  players,
  teams,

  tournaments,
  tournamentCategories,
  tournamentTeams,

  groups,
  groupStandings,
  groupTeams,

  matches,
  categoryStageSelections,
});
