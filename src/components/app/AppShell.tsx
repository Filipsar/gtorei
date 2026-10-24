import { ReactNode, useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { LayoutGrid, Route, Swords, Trophy, Zap, type LucideIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { UpdatesPopup } from '@/components/ui/UpdatesPopup';
import { getLevelName } from '@/data/localStorage';
import { cn } from '@/lib/utils';

interface Aba {
  rotulo: string;
  url: string;
  icone: LucideIcon;
  /** Outras rotas que acendem esta aba */
  tambem?: string[];
}

// No máximo cinco abas: o resto mora em Mais
const ABAS: Aba[] = [
  { rotulo: 'Trilha', url: '/trilha', icone: Route },
  { rotulo: 'Treinar', url: '/treinar', icone: Zap },
  { rotulo: 'Duelo', url: '/duelo', icone: Swords },
  { rotulo: 'Ranking', url: '/ranking', icone: Trophy },
  {
    rotulo: 'Mais',
    url: '/mais',
    icone: LayoutGrid,
    tambem: ['/desafios', '/perfil', '/conquistas', '/tabelas', '/analise', '/autoanalise', '/analise-ia', '/favoritos', '/indicar', '/comunidade', '/buscar', '/iniciante', '/atualizacoes', '/pro', '/admin'],
  },
];

// Altura da barra de abas, sem a área segura do Android. Fica também em
// --altura-abas para o que é fixo embaixo (aviso de privacidade) subir junto.
const ALTURA_ABAS = 64;

/**
 * Esqueleto do app Android: barra de cima com nível e XP, conteúdo e abas
 * embaixo. Substitui a barra lateral do site, que no celular era um menu
 * escondido atrás de um botão. A faixa de anúncio (quando existe) fica abaixo
 * das abas, por isso elas sobem --altura-anuncio.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  // Lição e partida do duelo: a tela é só da mão, sem abas nem pop-up tirando o
  // foco (no duelo, sair da mesa por uma aba estouraria o tempo de decisão)
  const busca = new URLSearchParams(location.search);
  const emLicao =
    (location.pathname === '/treinar' && busca.has('licao')) ||
    (location.pathname === '/duelo' && busca.has('partida'));

  useEffect(() => {
    const raiz = document.documentElement.style;
    raiz.setProperty('--altura-abas', emLicao ? '0px' : `${ALTURA_ABAS}px`);
    return () => raiz.setProperty('--altura-abas', '0px');
  }, [emLicao]);

  // O que passa da borda (assento da mesa, fichas da trilha) não pode alargar
  // a página: no app isso deixava arrastar a tela para o lado. "clip" corta
  // sem criar outra área de rolagem, então a barra do topo continua grudada.
  useEffect(() => {
    const html = document.documentElement.style;
    const body = document.body.style;
    html.overflowX = 'clip';
    body.overflowX = 'clip';
    html.overscrollBehaviorX = 'none';
    return () => {
      html.overflowX = '';
      body.overflowX = '';
      html.overscrollBehaviorX = '';
    };
  }, []);

  return (
    <div className="flex min-h-[100dvh] flex-col overflow-x-clip bg-background">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Pular para o conteúdo
      </a>
      {!emLicao && <BarraDoTopo />}
      <main
        id="conteudo"
        tabIndex={-1}
        className="flex-1 focus:outline-none"
        style={{ paddingBottom: emLicao ? 0 : ALTURA_ABAS }}
      >
        {children}
      </main>
      {!emLicao && <Abas />}
      {!emLicao && <UpdatesPopup />}
    </div>
  );
}

function BarraDoTopo() {
  const { profile } = useAuth();
  const nivel = profile?.level ?? 1;
  const xp = profile?.total_xp ?? 0;

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <Link to="/trilha" className="flex min-h-[44px] items-center gap-2" aria-label="GTORei, ir para a trilha">
        <img src="/lovable-uploads/9c0d8326-a96e-47a8-9e95-40f28d54d109.png" alt="" className="h-7 w-7 object-contain" />
        <span className="text-lg font-bold">
          <span className="text-primary">GTO</span>Rei
        </span>
      </Link>
      {profile && (
        <Link
          to="/perfil"
          className="flex min-h-[44px] min-w-0 items-center gap-2 whitespace-nowrap rounded-full border border-border bg-card px-3 text-sm transition-colors active:bg-muted"
          aria-label={`Seu nível: ${getLevelName(nivel)}, ${xp.toLocaleString('pt-BR')} XP. Abrir perfil`}
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {nivel}
          </span>
          {/* Em tela estreita fica só o número do nível e o XP */}
          <span className="font-semibold max-[379px]:hidden">{getLevelName(nivel)}</span>
          <span className="tabular-nums text-muted-foreground">{xp.toLocaleString('pt-BR')} XP</span>
        </Link>
      )}
    </header>
  );
}

function Abas() {
  const location = useLocation();
  const ativa = (aba: Aba) =>
    location.pathname === aba.url || (aba.tambem ?? []).some((r) => location.pathname.startsWith(r));

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-background/85"
      style={{ bottom: 'var(--altura-anuncio, 0px)' }}
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5" style={{ height: ALTURA_ABAS }}>
        {ABAS.map((aba) => {
          const on = ativa(aba);
          return (
            <li key={aba.url} className="flex">
              <NavLink
                to={aba.url}
                aria-current={on ? 'page' : undefined}
                className={cn(
                  'relative flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors active:bg-muted/60',
                  on ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {/* Marca da aba atual: cor e um traço em cima, não só a cor */}
                <span
                  aria-hidden="true"
                  className={cn('absolute top-0 h-1 w-8 rounded-b-full bg-primary transition-opacity', on ? 'opacity-100' : 'opacity-0')}
                />
                <aba.icone className={cn('h-6 w-6', on && 'stroke-[2.5]')} aria-hidden="true" />
                {aba.rotulo}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
