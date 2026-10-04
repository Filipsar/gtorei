import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ABERTURA_100BB, POSICOES_GUIA, RANKS, acaoNaPosicao, combosDaMao, nomeDaMao } from '@/data/guiaIniciante';

type Destaque = 'todas' | 'pares' | 'suited' | 'offsuit';

const DESTAQUES: { id: Destaque; rotulo: string }[] = [
  { id: 'todas', rotulo: 'Todas' },
  { id: 'pares', rotulo: 'Pares' },
  { id: 'suited', rotulo: 'Mesmo naipe' },
  { id: 'offsuit', rotulo: 'Naipes diferentes' },
];

const ROTULO_POSICAO: Record<string, string> = { UTG1: 'UTG+1' };

const ACAO = {
  2: { rotulo: 'Abre', classe: 'bg-primary text-black/80' },
  1: { rotulo: 'Abre às vezes', classe: 'bg-primary/35 text-foreground' },
  0: { rotulo: 'Fold', classe: 'bg-muted/50 text-muted-foreground' },
} as const;

function tipoDaMao(mao: string): Exclude<Destaque, 'todas'> {
  if (mao.length === 2) return 'pares';
  return mao.endsWith('s') ? 'suited' : 'offsuit';
}

const DESCRICAO_TIPO = {
  pares: 'par na mão',
  suited: 'mesmo naipe (suited)',
  offsuit: 'naipes diferentes (offsuit)',
};

// Aceita "aks", "AK s", "kao"... e devolve no formato do motor ("AKs")
function normalizar(texto: string): string | null {
  const limpo = texto.toUpperCase().replace(/\s+/g, '').replace('10', 'T');
  const m = limpo.match(/^([AKQJT2-9])([AKQJT2-9])([SO]?)$/);
  if (!m) return null;
  const [, a, b, tipo] = m;
  const [alto, baixo] = RANKS.indexOf(a) <= RANKS.indexOf(b) ? [a, b] : [b, a];
  if (alto === baixo) return alto + baixo;
  return alto + baixo + (tipo === 'O' ? 'o' : 's');
}

export function StartingHandsMatrix({
  posicao,
  onPosicao,
}: {
  posicao: string;
  onPosicao: (p: (typeof POSICOES_GUIA)[number]) => void;
}) {
  const [destaque, setDestaque] = useState<Destaque>('todas');
  const [mao, setMao] = useState('AKs');
  const [busca, setBusca] = useState('');

  const abertura = ABERTURA_100BB[posicao];
  const acao = acaoNaPosicao(posicao, mao);
  const combosAbertos = useMemo(() => Math.round((abertura.pct * 1326) / 100), [abertura.pct]);

  // Em que posições essa mão abre: dá a ideia de "mão de botão" x "mão de UTG"
  const abreEm = POSICOES_GUIA.filter((p) => acaoNaPosicao(p, mao) === 2).map((p) => ROTULO_POSICAO[p] ?? p);

  const buscar = (texto: string) => {
    setBusca(texto);
    const m = normalizar(texto);
    if (m) setMao(m);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Posição">
        {POSICOES_GUIA.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPosicao(p)}
            aria-pressed={p === posicao}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              p === posicao ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-foreground hover:border-primary/60',
            )}
          >
            {ROTULO_POSICAO[p] ?? p}
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div>
          <div className="mb-2 flex items-baseline justify-between text-sm">
            <span className="text-muted-foreground">
              {ROTULO_POSICAO[posicao] ?? posicao} · 100 BB · todos desistiram antes
            </span>
            <span className="font-bold tabular-nums text-foreground">{abertura.pct.toLocaleString('pt-BR')}%</span>
          </div>
          {/* As casas são clicáveis com mouse ou toque; pelo teclado, a busca
              ao lado faz o mesmo sem obrigar a passar por 169 paradas de Tab. */}
          <div
            className="grid grid-cols-[repeat(13,minmax(0,1fr))] gap-[2px]"
            role="img"
            aria-label={`Matriz de mãos iniciais: ${ROTULO_POSICAO[posicao] ?? posicao} abre ${abertura.pct.toLocaleString('pt-BR')}% das mãos com 100 BB`}
          >
            {Array.from({ length: 169 }).map((_, i) => {
              const l = Math.floor(i / 13);
              const c = i % 13;
              const nome = nomeDaMao(l, c);
              const estado = Number(abertura.matriz[i]) as 0 | 1 | 2;
              const apagada = destaque !== 'todas' && tipoDaMao(nome) !== destaque;
              return (
                <div
                  key={nome}
                  onClick={() => setMao(nome)}
                  className={cn(
                    'flex aspect-square cursor-pointer select-none items-center justify-center rounded-[2px] text-[7px] font-semibold leading-none transition-opacity sm:text-[9px]',
                    ACAO[estado].classe,
                    apagada && 'opacity-20',
                    nome === mao && 'ring-2 ring-foreground ring-offset-1 ring-offset-background',
                  )}
                >
                  {nome}
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            {([2, 1, 0] as const).map((k) => (
              <span key={k} className="inline-flex items-center gap-1.5">
                <span className={cn('h-3 w-3 rounded-[2px]', ACAO[k].classe)} /> {ACAO[k].rotulo}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Destacar tipo de mão">
            {DESTAQUES.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDestaque(d.id)}
                aria-pressed={d.id === destaque}
                className={cn(
                  'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  d.id === destaque ? 'border-foreground bg-foreground text-background' : 'border-border text-muted-foreground hover:text-foreground',
                )}
              >
                {d.rotulo}
              </button>
            ))}
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Na diagonal ficam os pares. Acima dela, as mãos de mesmo naipe; abaixo, as de naipes diferentes.
          </p>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Procurar uma mão</span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input value={busca} onChange={(e) => buscar(e.target.value)} placeholder="ex.: AJs, 77, KQo" className="pl-9" />
            </div>
          </label>

          <div className="rounded-xl border border-border bg-card p-4" aria-live="polite">
            <div className="flex items-center justify-between gap-3">
              <span className="text-2xl font-bold text-foreground">{mao}</span>
              <span className={cn('rounded-md px-2 py-1 text-xs font-semibold', ACAO[acao].classe)}>{ACAO[acao].rotulo}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {DESCRICAO_TIPO[tipoDaMao(mao)]} · {combosDaMao(mao)} combinações de cartas
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              {abreEm.length === 0
                ? 'Não abre de nenhuma posição com 100 BB.'
                : abreEm.length === POSICOES_GUIA.length
                  ? 'Abre de todas as posições.'
                  : `Abre sempre de: ${abreEm.join(', ')}.`}
            </p>
          </div>

          <p className="text-xs leading-relaxed text-muted-foreground">
            {ROTULO_POSICAO[posicao] ?? posicao} abre cerca de {combosAbertos.toLocaleString('pt-BR')} das 1.326 combinações possíveis de duas cartas.
            Pares têm 6 combinações, mãos de mesmo naipe 4, e de naipes diferentes 12.
          </p>
        </div>
      </div>
    </div>
  );
}
