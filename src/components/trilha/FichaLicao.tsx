import { Check, Lock, Star } from 'lucide-react';
import { VAR_DA_COR, faceDaFicha, fichaDaLicao, type CorDoNivel, type FaceDaFicha, type Licao } from '@/data/trilha';
import type { Estado, Estrelas } from '@/lib/trilha';
import { cn } from '@/lib/utils';

interface Props {
  licao: Licao;
  numero: number;
  estado: Estado;
  estrelas: Estrelas;
  cor: CorDoNivel;
  onAbrir: () => void;
}

/** O mesmo achatamento da face, para o texto parecer impresso nela */
const naFace = (f: FaceDaFicha) =>
  `translate(-50%, -50%) rotate(${f.giro}deg) scale(1, ${f.achatamento}) rotate(${-f.giro}deg)`;

/** Rótulo curto (BTN) cabe maior; "All-in" precisa diminuir para caber no miolo */
const corpoDoRotulo = (rotulo: string) => (rotulo.length <= 3 ? 'text-[17px]' : rotulo.length === 4 ? 'text-[14px]' : 'text-[12px]');

/**
 * Uma lição na trilha: a ficha de poker (arte em public/trilha) na cor da
 * posição que ela treina, deitada na mesa. O rótulo (BTN, 10BB…) é escrito
 * pelo app no miolo, deitado junto com a face: a arte vem sem letra, porque o
 * gerador de imagem erra. Bloqueada: ficha cinza com cadeado. A atual pulsa e
 * ganha o balão "Jogar".
 */
export function FichaLicao({ licao, numero, estado, estrelas, cor, onAbrir }: Props) {
  const bloqueada = estado === 'bloqueada';
  const tamanho = licao.mesaFinal ? 96 : 84;
  const src = fichaDaLicao(licao, bloqueada);
  const face = faceDaFicha(src);

  const descricao =
    estado === 'feita'
      ? `concluída, ${estrelas} de 3 estrelas`
      : estado === 'atual'
        ? 'próxima lição'
        : 'bloqueada';

  return (
    <div className="relative flex flex-col items-center">
      {/* Fora do fluxo: dentro dele, o balão apertava a ficha */}
      {estado === 'atual' && (
        <span
          aria-hidden="true"
          className="absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-xl border border-border bg-card px-3 py-1 text-xs font-bold uppercase tracking-wider text-foreground shadow-md motion-safe:animate-bounce"
        >
          Jogar
        </span>
      )}
      <button
        type="button"
        onClick={onAbrir}
        aria-label={`Lição ${numero}: ${licao.titulo}, ${descricao}`}
        className="group relative shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        style={{ width: tamanho, height: tamanho }}
      >
        {/* Brilho atrás da ficha da vez, na cor do nível */}
        {estado === 'atual' && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-[-14%] rounded-full opacity-70 blur-md motion-safe:animate-pulse"
            style={{ background: `radial-gradient(circle, hsl(${VAR_DA_COR[cor]} / 0.85), transparent 68%)` }}
          />
        )}
        {/* A ficha afunda um pouco ao tocar, como ficha empilhada. A caixa
            tem a proporção da arte, para o % da face cair no lugar certo. */}
        <span className="absolute inset-0 flex items-center transition-transform duration-100 group-active:translate-y-1">
          <span className="relative block w-full" style={{ aspectRatio: `${face.largura} / ${face.altura}` }}>
            <img
              src={src}
              alt=""
              aria-hidden="true"
              width={face.largura}
              height={face.altura}
              draggable={false}
              className={cn('h-full w-full select-none', bloqueada && 'opacity-90')}
            />
            {/* A mesa final liberada mostra o Rei da arte; bloqueada, o cadeado */}
            {(!licao.mesaFinal || bloqueada) && (
              <span
                className="pointer-events-none absolute flex items-center justify-center whitespace-nowrap font-black uppercase leading-none tracking-tight text-white [text-shadow:0_1px_0_rgb(0_0_0/0.45),0_0_3px_rgb(0_0_0/0.35)]"
                style={{ left: `${face.cx}%`, top: `${face.cy}%`, transform: naFace(face) }}
              >
                {bloqueada ? (
                  <Lock className="h-6 w-6 text-white/85 drop-shadow-[0_1px_0_rgb(0_0_0/0.5)]" aria-hidden="true" />
                ) : (
                  <span className={corpoDoRotulo(licao.rotulo)}>{licao.rotulo}</span>
                )}
              </span>
            )}
          </span>
        </span>

        {estado === 'feita' && (
          <span
            aria-hidden="true"
            className="absolute -right-1 top-0 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground"
          >
            <Check className="h-3.5 w-3.5 stroke-[3]" />
          </span>
        )}
      </button>
      {/* Estrelas só para quem já passou: 7, 8 e 9+ acertos de 10 */}
      <span aria-hidden="true" className={cn('mt-1 flex gap-0.5', estado !== 'feita' && 'invisible')}>
        {[1, 2, 3].map((i) => (
          <Star
            key={i}
            className={cn('h-4 w-4', i <= estrelas ? 'fill-current text-primary' : 'text-muted-foreground/50')}
          />
        ))}
      </span>
    </div>
  );
}
