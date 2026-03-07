// Minimal Node.js globals for Playwright e2e tests (avoids requiring @types/node).
declare const process: {
  env: Record<string, string | undefined>;
};
