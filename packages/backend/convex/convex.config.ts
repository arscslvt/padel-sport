import migrations from "@convex-dev/migrations/convex.config.js";
import { defineApp } from "convex/server";
import tournaments from "./components/tournaments/convex.config";

const app = defineApp();
app.use(tournaments, { name: "tournaments" });
app.use(migrations);
export default app;
