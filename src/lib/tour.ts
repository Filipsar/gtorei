// Tour do GTORei: leva a pessoa de página em página com o rei explicando cada
// uma. Substitui o tutorial que abria sozinho como pop-up no Treinar.
//
// Quem abre é a própria pessoa: pelo menu lateral (site) ou pelo Mais (app)
// nos primeiros dias da conta, e depois pelas Configurações. O passo atual
// fica no sessionStorage para sobreviver a um recarregar no meio do tour.

import { useSyncExternalStore } from 'react';
import { usarLayoutDoApp } from '@/lib/nativo/plataforma';

export interface PassoDoTour {
  rota: string;
  titulo: string;
  texto: string;
  /** Arquivo em /public/mascote, sem o .webp */
  rei: string;
}

const PASSOS_DO_SITE: PassoDoTour[] = [
  {
    rota: '/treinar',
    rei: 'rei-acenando',
    titulo: 'Bem-vindo ao GTORei!',
    texto:
      'Eu sou o Rei e vou te mostrar a casa. Aqui no Treinar você escolhe o modo (8-max, heads-up, três jogadores ou bounty), a posição, o stack e o cenário, e decide a mão. Depois de cada decisão você vê o que a range faz com ela.',
  },
  {
    rota: '/tabelas',
    rei: 'rei-explicando',
    titulo: 'Tabelas de range',
    texto: 'Aqui ficam as matrizes de cada posição e stack. Vale abrir antes de treinar um spot novo ou depois de errar uma mão.',
  },
  {
    rota: '/desafios',
    rei: 'rei-subiu',
    titulo: 'Desafios',
    texto: 'Todo dia, toda semana e todo mês tem desafio novo. Completar dá XP extra e ajuda a manter o ritmo de estudo.',
  },
  {
    rota: '/analise',
    rei: 'rei-lendo',
    titulo: 'Sua análise',
    texto: 'Precisão do mês, evolução sessão a sessão e o ponto em que você mais erra, por posição e por cenário. Os números reiniciam todo mês.',
  },
  {
    rota: '/analise-ia',
    rei: 'rei-pensando',
    titulo: 'Analisar com IA',
    texto: 'Mande o hand history (.txt) do seu torneio e a IA comenta suas decisões mão a mão, com o spot de cada uma lido do próprio arquivo.',
  },
  {
    rota: '/ranking',
    rei: 'rei-trofeu',
    titulo: 'Ranking e ligas',
    texto: 'Todo dia você disputa com quem está no seu elo: os primeiros sobem e os últimos caem. O ranking global do mês corre junto e zera todo mês.',
  },
  {
    rota: '/conquistas',
    rei: 'rei-confiante',
    titulo: 'XP, níveis e conquistas',
    texto: 'Cada mão dá XP. Com XP você sobe de nível, de Iniciante a GTO Rei, e vai desbloqueando conquistas pelo caminho.',
  },
  {
    rota: '/comunidade',
    rei: 'rei-rindo',
    titulo: 'Comunidade',
    texto: 'Poste mãos, comente e veja o que os outros jogadores estão estudando.',
  },
  {
    rota: '/treinar',
    rei: 'rei-acertou',
    titulo: 'Agora é com você!',
    texto: 'Escolha um modo e jogue as primeiras mãos. Se quiser rever o tour, ele fica no menu lateral nos primeiros dias e depois em Configurações.',
  },
];

const PASSOS_DO_APP: PassoDoTour[] = [
  {
    rota: '/trilha',
    rei: 'rei-acenando',
    titulo: 'Bem-vindo ao GTORei!',
    texto: 'Eu sou o Rei e vou te mostrar o app. A Trilha tem lições em sequência: cada uma é um punhado de mãos sobre um tema, do básico ao avançado.',
  },
  {
    rota: '/treinar',
    rei: 'rei-explicando',
    titulo: 'Treinar',
    texto: 'Aqui você escolhe modo, posição, stack e cenário e treina quanto quiser. Depois de cada decisão você vê o que a range faz com a mão.',
  },
  {
    rota: '/duelo',
    rei: 'rei-allin',
    titulo: 'Duelo',
    texto: 'Heads-up ao vivo contra outro jogador: um no small blind, outro no big blind, na mesma mão.',
  },
  {
    rota: '/ranking',
    rei: 'rei-trofeu',
    titulo: 'Ranking e ligas',
    texto: 'Todo dia você disputa com quem está no seu elo: os primeiros sobem e os últimos caem. O ranking global do mês corre junto.',
  },
  {
    rota: '/desafios',
    rei: 'rei-subiu',
    titulo: 'Desafios',
    texto: 'Desafios do dia, da semana e do mês. Completar dá XP extra.',
  },
  {
    rota: '/analise',
    rei: 'rei-lendo',
    titulo: 'Sua análise',
    texto: 'Precisão do mês e o ponto em que você mais erra, por posição e por cenário.',
  },
  {
    rota: '/mais',
    rei: 'rei-acertou',
    titulo: 'E o resto mora aqui',
    texto: 'Tabelas de range, análise com IA, conquistas e comunidade ficam no Mais. O tour também fica aqui nos primeiros dias e depois em Configurações.',
  },
];

export function passosDoTour(): PassoDoTour[] {
  return usarLayoutDoApp() ? PASSOS_DO_APP : PASSOS_DO_SITE;
}

const CHAVE_PASSO = 'gtorei_tour_passo';
const CHAVE_FEITO = 'gtorei_tour_feito';
/** Por quantos dias a conta é "nova" e o tour aparece no menu */
export const DIAS_NO_MENU = 7;

function lerPasso(): number | null {
  try {
    const v = sessionStorage.getItem(CHAVE_PASSO);
    return v === null ? null : Number(v);
  } catch {
    return null;
  }
}

let passo: number | null = lerPasso();
const ouvintes = new Set<() => void>();

function mudar(novo: number | null) {
  passo = novo;
  try {
    if (novo === null) sessionStorage.removeItem(CHAVE_PASSO);
    else sessionStorage.setItem(CHAVE_PASSO, String(novo));
  } catch {
    // sem sessionStorage o tour só não sobrevive a um recarregar
  }
  ouvintes.forEach((f) => f());
}

export const tour = {
  iniciar: () => mudar(0),
  avancar: () => {
    if (passo === null) return;
    if (passo >= passosDoTour().length - 1) tour.encerrar();
    else mudar(passo + 1);
  },
  voltar: () => {
    if (passo !== null && passo > 0) mudar(passo - 1);
  },
  encerrar: () => {
    try {
      localStorage.setItem(CHAVE_FEITO, '1');
    } catch {
      // segue no menu enquanto a conta for nova
    }
    mudar(null);
  },
};

export function tourAtivo(): boolean {
  return passo !== null;
}

function assinar(f: () => void) {
  ouvintes.add(f);
  return () => ouvintes.delete(f);
}

/** Passo atual (null fora do tour), para os componentes */
export function usePassoDoTour(): number | null {
  return useSyncExternalStore(assinar, () => passo, () => null);
}

export function tourFeito(): boolean {
  try {
    return localStorage.getItem(CHAVE_FEITO) === '1';
  } catch {
    return false;
  }
}

/** No menu lateral (ou no Mais) só nos primeiros dias e enquanto não fez o tour */
export function tourNoMenu(criadaEm: string | undefined, feito: boolean, agora = Date.now()): boolean {
  if (feito || !criadaEm) return false;
  const criada = new Date(criadaEm).getTime();
  return Number.isFinite(criada) && agora - criada < DIAS_NO_MENU * 24 * 60 * 60 * 1000;
}
