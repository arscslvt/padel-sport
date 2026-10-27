import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Come sito e gestionale: server autonomo tracciato dalla radice del
  // monorepo, pronto per scripts/stage-standalone.sh.
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../.."),
};

export default nextConfig;
