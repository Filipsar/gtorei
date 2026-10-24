import { useMemo, useState, type CSSProperties } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ChevronRight, Lock, Play, RotateCcw, Star } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { SEO } from '@/components/seo/SEO';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { FichaLicao } from '@/components/trilha/FichaLicao';
import { useAuth } from '@/contexts/AuthContext';
import { SCENARIOS } from '@/data/gtoRanges';
import { LICOES, NIVEIS, VAR_DA_COR, nivelDaLicao, type Licao, type Nivel } from '@/data/trilha';
import { ACERTOS_PARA_PASSAR, MAOS_POR_LICAO, estadosDaTrilha, lerProgresso, type Estado } from '@/lib/trilha';
import { usarLayoutDoApp } from '@/lib/nativo/plataforma';
import { cn } from '@/lib/utils';

// Zigue-zague das fichas, em px a partir do centro. Cada nível começa no meio.
const DESVIOS = [0, 56, 84, 56, 0, -56, -84, -56];
const ALTURA_DA_LINHA = 112;
// Dias sem lição até o Rei aparecer cochilando no resumo
const DIAS_PARA_COCHILAR = 3;
// Pose do segundo rei, nos níveis com 5 lições ou mais (sempre diferente da do nível)
const REI_EXTRA = ['confiante', 'pensando', 'explicando'] as const;
// Blinds de cada nível, como na estrutura de um torneio (só ambientação)
const BLINDS = ['25/50', '50/100', '100/200', '200/400', '400/800', '800/1.600'];

const nomeDoCenario = (s: string) => SCENARIOS.find((c) => c.id === s)?.label ?? s;
const nomeDoModo: Record<string, string> = { rangeTraining: 'Mesa cheia', hu: 'Heads-up', threeHand: 'Três na mesa', bounty: 'Bounty' };

/** Trilha de aprendizado do app (/trilha): níveis de torneio, fichas como lições */
export default function TrilhaPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [aberta, setAberta] = useState<Licao | null>(null);
  // Lido a cada montagem: ao voltar de uma lição a página monta de novo
  const progresso = useMemo(() => lerProgresso(user?.id), [user?.id]);
  const estados = useMemo(() => estadosDaTrilha(progresso), [progresso]);

  // A trilha é do app; no site, quem cair aqui vai para o treino
  if (!usarLayoutDoApp()) return <Navigate to="/treinar" replace />;

  const atual = LICOES.find((l) => estados.get(l.id) === 'atual') ?? null;
  const feitas = LICOES.filter((l) => estados.get(l.id) === 'feita').length;
  const estrelas = LICOES.reduce((s, l) => s + (progresso[l.id]?.estrelas ?? 0), 0);
  const jogar = (l: Licao) => navigate(`/treinar?licao=${l.id}`);
  // Última lição jogada: some faz dias, o Rei cochila no resumo
  const ultimaVez = Object.values(progresso).reduce<string | null>((max, r) => (!max || r.em > max ? r.em : max), null);

  return (
    <MainLayout>
      <SEO title="Trilha — GTORei" description="Trilha de aprendizado do GTORei." path="/trilha" noindex />
      <div className="mx-auto max-w-lg px-4 pb-10 pt-4">
        <Resumo atual={atual} feitas={feitas} estrelas={estrelas} ultimaVez={ultimaVez} onContinuar={() => atual && jogar(atual)} />

        {NIVEIS.map((nivel, i) => (
          <NivelDaTrilha
            key={nivel.id}
            nivel={nivel}
            indice={i}
            estados={estados}
            estrelasDe={(id) => progresso[id]?.estrelas ?? 0}
            onAbrir={setAberta}
          />
        ))}

        <p className="mt-6 text-center text-sm text-muted-foreground">Mais níveis em breve.</p>
      </div>

      <DetalheDaLicao
        licao={aberta}
        estado={aberta ? estados.get(aberta.id) ?? 'bloqueada' : 'bloqueada'}
        melhor={aberta ? progresso[aberta.id]?.melhor : undefined}
        atual={atual}
        onFechar={() => setAberta(null)}
        onJogar={jogar}
      />
    </MainLayout>
  );
}

function Resumo({ atual, feitas, estrelas, ultimaVez, onContinuar }: {
  atual: Licao | null;
  feitas: number;
  estrelas: number;
  ultimaVez: string | null;
  onContinuar: () => void;
}) {
  const total = LICOES.length;
  const sumido = !!ultimaVez && Date.now() - new Date(ultimaVez).getTime() > DIAS_PARA_COCHILAR * 86_400_000;
  // Quem chega dá com o Rei acenando; quem sumiu, com ele cochilando; no resto, estudando
  const rei = !ultimaVez ? 'acenando' : sumido ? 'cochilando' : 'lendo';
  return (
    <section className="relative mb-8 overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 via-card to-card p-4">
      <img
        src={`/mascote/rei-${rei}.webp`}
        alt=""
        aria-hidden="true"
        width={330}
        height={420}
        className="pointer-events-none absolute -bottom-3 -right-2 h-32 w-auto"
      />
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">Seu torneio</p>
      <h1 className="mt-1 pr-24 text-xl font-bold leading-tight">
        {atual ? atual.titulo : 'Trilha completa'}
      </h1>
      <p className="mt-1 pr-24 text-sm text-muted-foreground">
        {sumido && <span className="mb-1 block text-foreground">Faz uns dias, hein? Uma lição rápida para voltar ao ritmo.</span>}
        {feitas} de {total} lições ·{' '}
        <span className="inline-flex items-center gap-0.5 align-middle">
          {estrelas} <Star className="h-3.5 w-3.5 fill-current text-primary" aria-label="estrelas" />
        </span>
      </p>
      {/* mr-24: a barra termina antes do rei, que fica no canto */}
      <div className="mr-24 mt-3 h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(100 * feitas) / total}%` }} />
      </div>
      {atual && (
        <Button className="mt-4 h-12 w-full max-w-[14rem] text-base font-bold" onClick={onContinuar}>
          <Play className="mr-2 h-5 w-5 fill-current" aria-hidden="true" />
          {feitas === 0 ? 'Começar' : 'Continuar'}
        </Button>
      )}
    </section>
  );
}

function NivelDaTrilha({
  nivel,
  indice,
  estados,
  estrelasDe,
  onAbrir,
}: {
  nivel: Nivel;
  indice: number;
  estados: Map<string, Estado>;
  estrelasDe: (id: string) => 0 | 1 | 2 | 3;
  onAbrir: (l: Licao) => void;
}) {
  const doNivel = nivel.licoes.map((l) => estados.get(l.id) ?? 'bloqueada');
  const feitas = doNivel.filter((e) => e === 'feita').length;
  const bloqueado = doNivel.every((e) => e === 'bloqueada');
  // Níveis pares fazem o zigue-zague para o outro lado, e o rei troca de lado
  const lado = indice % 2 === 0 ? 1 : -1;
  // Cada nível tem a pose dele; fechado, o rei comemora
  const fechado = feitas === nivel.licoes.length;
  const rei = fechado ? 'acertou' : nivel.rei;
  // Nível comprido ganha um segundo rei, do outro lado, mais embaixo
  const segundoRei = nivel.licoes.length >= 5 ? REI_EXTRA[indice % REI_EXTRA.length] : null;
  const primeiraLicao = NIVEIS.slice(0, indice).reduce((s, n) => s + n.licoes.length, 0);

  return (
    <section aria-labelledby={`nivel-${nivel.id}`} className="mb-10">
      <header
        className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4"
        style={{ '--nivel': VAR_DA_COR[nivel.cor] } as CSSProperties}
      >
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider">
            {/* Texto preto sobre a cor do nível: passa de 4,5:1 nas cinco cores */}
            <span className="rounded-md px-2 py-0.5 font-bold text-black" style={{ background: 'hsl(var(--nivel))' }}>
              Nível {nivel.numero}
            </span>
            <span className="text-muted-foreground">Blinds {BLINDS[indice] ?? ''}</span>
          </p>
          <h2 id={`nivel-${nivel.id}`} className="mt-2 text-lg font-bold leading-tight">
            {nivel.titulo}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{nivel.descricao}</p>
        </div>
        <div className="flex shrink-0 flex-col items-center gap-1">
          <img
            src={`/trilha/${nivel.ilustracao}.webp`}
            alt=""
            aria-hidden="true"
            width={300}
            height={320}
            className={cn('h-14 w-auto', bloqueado && 'opacity-40 grayscale')}
          />
          {bloqueado ? (
            <Lock className="h-4 w-4 text-muted-foreground" aria-label="Nível bloqueado" />
          ) : (
            <p className="text-sm font-bold tabular-nums">
              {feitas}/{nivel.licoes.length}
            </p>
          )}
        </div>
      </header>

      {/* mt-12: espaço para o balão "Jogar" quando a atual é a primeira do nível */}
      <ol className="relative mt-12" aria-label={`Lições do nível ${nivel.numero}`}>
        {/* O rei acompanha cada nível do lado oposto ao das fichas. Enfeite. */}
        <img
          src={`/mascote/rei-${rei}.webp`}
          alt=""
          aria-hidden="true"
          width={346}
          height={397}
          className={cn(
            'pointer-events-none absolute w-24 select-none',
            lado === 1 ? 'left-0' : 'right-0',
            bloqueado && 'opacity-40 grayscale'
          )}
          style={{ top: ALTURA_DA_LINHA * 1.3 }}
        />
        {segundoRei && (
          <img
            src={`/mascote/rei-${segundoRei}.webp`}
            alt=""
            aria-hidden="true"
            width={346}
            height={397}
            className={cn(
              'pointer-events-none absolute w-20 select-none',
              lado === 1 ? 'right-0' : 'left-0',
              bloqueado && 'opacity-40 grayscale'
            )}
            style={{ top: ALTURA_DA_LINHA * 4 - 8 }}
          />
        )}
        {nivel.licoes.map((licao, i) => (
          <li
            key={licao.id}
            className="flex justify-center"
            style={{ height: ALTURA_DA_LINHA, transform: `translateX(${DESVIOS[i % DESVIOS.length] * lado}px)` }}
          >
            <FichaLicao
              licao={licao}
              numero={primeiraLicao + i + 1}
              estado={estados.get(licao.id) ?? 'bloqueada'}
              estrelas={estrelasDe(licao.id)}
              cor={nivel.cor}
              onAbrir={() => onAbrir(licao)}
            />
          </li>
        ))}
      </ol>
      {/* O baú fecha o nível: abre quando a mesa final passa. Só enfeite. */}
      <div className="flex justify-center" aria-hidden="true">
        <img
          src={fechado ? '/trilha/bau-aberto.webp' : '/trilha/bau-fechado.webp'}
          alt=""
          width={360}
          height={330}
          className={cn('h-20 w-auto', bloqueado && 'opacity-40 grayscale')}
        />
      </div>
    </section>
  );
}

function DetalheDaLicao({
  licao,
  estado,
  melhor,
  atual,
  onFechar,
  onJogar,
}: {
  licao: Licao | null;
  estado: Estado;
  melhor?: number;
  atual: Licao | null;
  onFechar: () => void;
  onJogar: (l: Licao) => void;
}) {
  const nivel = licao ? nivelDaLicao(licao.id) : undefined;
  const bloqueada = estado === 'bloqueada';

  return (
    <Drawer open={!!licao} onOpenChange={(o) => !o && onFechar()}>
      <DrawerContent>
        {licao && (
          <div className="mx-auto w-full max-w-lg">
            <DrawerHeader className="text-left">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Nível {nivel?.numero} · {nivel?.titulo}
              </p>
              <DrawerTitle className="text-xl">{licao.titulo}</DrawerTitle>
              <DrawerDescription className="text-base">{licao.resumo}</DrawerDescription>
            </DrawerHeader>
            <div className="space-y-3 px-4">
              <ul className="flex flex-wrap gap-2 text-xs" aria-label="O que cai nesta lição">
                <li className="rounded-full bg-muted px-2.5 py-1">{nomeDoModo[licao.modo]}</li>
                <li className="rounded-full bg-muted px-2.5 py-1">{licao.cenarios.map(nomeDoCenario).join(' + ')}</li>
                <li className="rounded-full bg-muted px-2.5 py-1">
                  {licao.posicoes.length > 3 ? 'Várias posições' : licao.posicoes.join(', ')}
                </li>
                <li className="rounded-full bg-muted px-2.5 py-1">
                  {licao.stacks.length === 1 ? `${licao.stacks[0]} BB` : `${Math.min(...licao.stacks)} a ${Math.max(...licao.stacks)} BB`}
                </li>
              </ul>
              <p className="text-sm text-muted-foreground">
                {MAOS_POR_LICAO} mãos, com a resposta a cada uma. Passa com {ACERTOS_PARA_PASSAR} acertos e libera a próxima.
                {melhor !== undefined && ` Seu melhor: ${melhor} de ${MAOS_POR_LICAO}.`}
              </p>
              {bloqueada && atual && (
                <p className="flex items-center gap-2 rounded-lg bg-muted p-3 text-sm">
                  <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
                  Termine "{atual.titulo}" para chegar aqui.
                </p>
              )}
            </div>
            <DrawerFooter>
              {bloqueada ? (
                atual && (
                  <Button className="h-12 text-base font-bold" onClick={() => onJogar(atual)}>
                    Ir para a lição atual <ChevronRight className="ml-1 h-5 w-5" aria-hidden="true" />
                  </Button>
                )
              ) : (
                <Button className="h-12 text-base font-bold" onClick={() => onJogar(licao)}>
                  {estado === 'feita' ? (
                    <>
                      <RotateCcw className="mr-2 h-5 w-5" aria-hidden="true" /> Jogar de novo
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-5 w-5 fill-current" aria-hidden="true" /> Jogar lição
                    </>
                  )}
                </Button>
              )}
              <Button variant="ghost" className="h-12" onClick={onFechar}>
                Fechar
              </Button>
            </DrawerFooter>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
