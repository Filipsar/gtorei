import { Loader2 } from 'lucide-react';

/**
 * O que o app mostra em "/" enquanto descobre se há alguém logado. Antes era a
 * página inicial do site, que aparecia por um instante a cada abertura. Quem
 * leva para a trilha ou para o login é a PonteNativa (src/components/nativo/PonteApp.tsx).
 */
export function AberturaDoApp() {
  return (
    <div
      className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 bg-background px-6"
      role="status"
      aria-label="Abrindo o GTORei"
    >
      <img src="/mascote/rei-confiante.webp" alt="" width={314} height={391} className="h-40 w-auto" />
      <p className="text-3xl font-bold">
        <span className="text-primary">GTO</span>Rei
      </p>
      <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
    </div>
  );
}
