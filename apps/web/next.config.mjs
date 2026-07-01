import path from "node:path";

const appRoot = process.cwd();
const repoRoot = path.resolve(appRoot, "../..");

const packageAliases = {
  "@ai-evaluator/config": path.resolve(repoRoot, "packages/config/src/index.ts"),
  "@ai-evaluator/db": path.resolve(repoRoot, "packages/db/src/index.ts"),
  "@ai-evaluator/evals-promptfoo": path.resolve(repoRoot, "packages/evals/promptfoo/src/index.ts"),
  "@ai-evaluator/integrations-github": path.resolve(repoRoot, "packages/integrations/github/src/index.ts"),
  "@ai-evaluator/integrations-compass": path.resolve(repoRoot, "packages/integrations/compass/src/index.ts"),
  "@ai-evaluator/logger": path.resolve(repoRoot, "packages/logger/src/index.ts"),
  "@ai-evaluator/types": path.resolve(repoRoot, "packages/types/src/index.ts"),
  "@ai-evaluator/ui": path.resolve(repoRoot, "packages/ui/src/index.tsx")
};

/** @type {import("next").NextConfig} */
const nextConfig = {
  typedRoutes: true,
  outputFileTracingRoot: repoRoot,
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": appRoot,
      ...packageAliases
    };
    return config;
  }
};

export default nextConfig;
