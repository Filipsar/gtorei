// Antes de mandar um hand history para a IA, os apelidos dos outros jogadores
// viram "Vilão 1", "Vilão 2"... Eles são dados de terceiros que não aceitaram
// nada, e a análise não precisa saber quem eram: só posição, stack e ação.
// O herói fica como "Herói" pelo mesmo motivo (é o apelido da pessoa no site
// de poker, não no GTORei).

interface JogadorMin {
  name: string;
  isHero: boolean;
}
interface AcaoMin {
  player: string;
  isHero: boolean;
}
interface MaoMin {
  heroName: string;
  players: JogadorMin[];
  actions: AcaoMin[];
}

export function anonimizarMaos<T extends MaoMin>(maos: T[]): T[] {
  return maos.map((m) => {
    const apelidos = new Map<string, string>();
    let n = 0;
    const trocar = (nome: string, heroi: boolean) => {
      if (heroi || nome === m.heroName) return 'Herói';
      if (!apelidos.has(nome)) apelidos.set(nome, `Vilão ${++n}`);
      return apelidos.get(nome)!;
    };
    return {
      ...m,
      heroName: 'Herói',
      players: m.players.map((p) => ({ ...p, name: trocar(p.name, p.isHero) })),
      actions: m.actions.map((a) => ({ ...a, player: trocar(a.player, a.isHero) })),
    };
  });
}
