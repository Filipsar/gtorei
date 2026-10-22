import type { CapacitorConfig } from '@capacitor/cli';

// App Android do GTORei. Empacota o próprio site (pasta dist, do `npm run build`)
// e roda offline o que já roda no navegador; o banco continua o mesmo Supabase.
// Passo a passo de publicação em docs/PLAY-STORE.md.
const config: CapacitorConfig = {
  appId: 'br.com.gtorei.app',
  appName: 'GTORei',
  webDir: 'dist',
  android: {
    // Sem conteúdo misto e sem depuração da WebView na versão da loja
    allowMixedContent: false,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
