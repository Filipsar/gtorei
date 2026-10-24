import { Swords } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/app/RankingApp';
import { EloBadge } from '@/components/app/EloBadge';
import { comSinal, jogador, outroLado, type VisaoDoDuelo } from '@/lib/duelo';

interface Props {
  visao: VisaoDoDuelo;
  onDeNovo: () => void;
  onSair: () => void;
}

/** Fim do duelo: quem venceu, o saldo em BB e o acerto GTO de cada um */
export function DueloFim({ visao, onDeNovo, onSair }: Props) {
  const meus = jogador(visao, visao.eu);
  const dele = jogador(visao, outroLado(visao.eu));
  const venceu = visao.vencedor === 'eu';
  const empate = visao.vencedor === null;

  const pose = empate ? 'ombros' : venceu ? 'trofeu' : 'triste';
  const titulo = empate ? 'Empate' : venceu ? 'Você venceu!' : 'Não foi dessa vez';
  const motivo =
    visao.motivo_fim === 'abandono'
      ? venceu
        ? `${dele.nome} saiu da mesa: o tempo dele acabou.`
        : 'Seu tempo acabou duas vezes seguidas.'
      : visao.motivo_fim === 'desistencia'
        ? venceu
          ? `${dele.nome} desistiu do duelo.`
          : 'Você saiu do duelo.'
        : `${visao.total_maos} mãos jogadas.`;

  const linhas = [
    { ...meus, rotulo: 'Você' },
    { ...dele, rotulo: dele.nome },
  ];

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 pb-10 pt-6 text-center">
      <img
        src={`/mascote/rei-${pose}.webp`}
        alt=""
        aria-hidden="true"
        className="mx-auto h-40 w-auto motion-safe:animate-rei-sobe"
      />
      <div>
        <h1 className="text-2xl font-bold">{titulo}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{motivo}</p>
      </div>

      <ul className="space-y-2 text-left">
        {linhas.map((j, i) => (
          <li key={i} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
            <Avatar url={j.avatar} nome={j.nome} tamanho={40} />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 truncate font-semibold">
                <EloBadge elo={j.elo} tamanho={16} />
                <span className="truncate">{j.rotulo}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                {j.decisoes > 0 ? `GTO: ${j.acertos} de ${j.decisoes} decisões certas` : 'Nenhuma decisão com nota'}
              </p>
            </div>
            <p className="shrink-0 text-lg font-bold tabular-nums">{comSinal(j.saldo)} BB</p>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        Nota GTO só nas decisões que o treino de heads-up cobre: abrir do SB e responder no BB.
      </p>

      <div className="space-y-2">
        <Button className="h-14 w-full text-lg font-bold" onClick={onDeNovo}>
          <Swords className="mr-2 h-5 w-5" aria-hidden="true" /> Duelar de novo
        </Button>
        <Button variant="ghost" className="w-full" onClick={onSair}>
          Voltar
        </Button>
      </div>
    </div>
  );
}
