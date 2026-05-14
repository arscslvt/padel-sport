import { defineApp } from "convex/server";
import tournaments from "./components/tournaments/convex.config";

const app = defineApp();
app.use(tournaments, { name: "tournaments" });
export default app;
