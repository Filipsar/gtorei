import { lazy, type ComponentType } from 'react';

const RELOAD_KEY = 'gtorei_chunk_reload';

// Carrega a tela só quando alguém abre a rota. O site vinha num arquivo único
// de 2,4 MB, e a home (a página que o Google mede) esperava baixar até o admin.
//
// Depois de um deploy, quem está com a aba aberta pede pedaços do build antigo
// que não existem mais e o import falha. Nesse caso a página recarrega uma vez
// para pegar o index.html novo; a marca na sessão evita loop se o erro for outro.
export function lazyPage<T extends ComponentType<unknown>>(load: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      const mod = await load();
      try { sessionStorage.removeItem(RELOAD_KEY); } catch { /* sem storage, segue */ }
      return mod;
    } catch (err) {
      let jaRecarregou = false;
      try { jaRecarregou = sessionStorage.getItem(RELOAD_KEY) === '1'; } catch { jaRecarregou = true; }
      if (!jaRecarregou) {
        try { sessionStorage.setItem(RELOAD_KEY, '1'); } catch { /* idem */ }
        window.location.reload();
        // segura o Suspense enquanto a página recarrega
        return new Promise<{ default: T }>(() => {});
      }
      throw err;
    }
  });
}
