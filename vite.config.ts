import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import type { Plugin } from "vite";

// O app Android empacota o mesmo index.html: lá o anúncio é o AdMob, e o
// AdSense não pode rodar dentro de app. O build do app (--mode app) tira o
// bloco marcado no head.
const semAdSenseNoApp = (): Plugin => ({
  name: "sem-adsense-no-app",
  transformIndexHtml(html) {
    const sem = html.replace(/\s*<!-- ADSENSE:INICIO -->[\s\S]*?<!-- ADSENSE:FIM[^>]*-->/, "");
    if (sem === html) throw new Error("Bloco do AdSense não encontrado no index.html");
    return sem;
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger(), mode === "app" && semAdSenseNoApp()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
