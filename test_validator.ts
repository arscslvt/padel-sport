import { v } from "convex/values";
import { doc } from "convex-helpers/validators";
import schema from "./convex/components/tournaments/schema";

const categoryWithTeamsValidator = v.object({
  ...doc(schema, "tournamentCategories").fields,
  teams: v.array(doc(schema, "tournamentTeams")),
});
