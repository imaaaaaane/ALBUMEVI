// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({

  tanstackStart: {
 base: "/",
    server: { entry: "server" },
  },
  nitro: {
    preset: "cloudflare-pages",
    output: {
      dir: ".output",
      publicDir: ".output",
      serverDir: ".output/_worker.js",
    },
    hooks: {
      async compiled(nitro: any) {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const redirectsPath = path.join(nitro.options.output.dir, "_redirects");
        try {
          await fs.unlink(redirectsPath);
          nitro.logger.info("Removed _redirects to prevent routing conflicts in SSR mode.");
        } catch (e) {
          // ignore
        }
      },
    },
  } as any,
});

