import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite";
import { createOracleHandler } from "./server/oracle.ts";

/** Serves the book's `/api/oracle` endpoint from the dev and preview servers, keeping the API key off the browser. */
function oracleApi(env: Record<string, string>): Plugin {
  const handler = createOracleHandler(env);
  return {
    name: "oracle-api",
    configureServer(server) {
      server.middlewares.use("/api/oracle", handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use("/api/oracle", handler);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), tailwindcss(), oracleApi(env)],
  };
});
