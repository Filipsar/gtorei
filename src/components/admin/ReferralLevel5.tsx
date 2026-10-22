import { useEffect, useState } from 'react';
import { Gift } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { PREMIO_INDICACAO_ATIVO } from '@/data/indicacao';

interface Linha {
  user_id: string;
  username: string | null;
  email: string;
  validos: number;
  nivel5_desde: string;
}

/**
 * Quem chegou ao nível 5 da indicação (100 indicados válidos). É a lista de
 * participantes do sorteio mensal; o sorteio é feito fora do app, pelo
 * regulamento autorizado.
 */
export function ReferralLevel5() {
  const [linhas, setLinhas] = useState<Linha[] | null>(null);
  const [indisponivel, setIndisponivel] = useState(false);

  useEffect(() => {
    void supabase.rpc('admin_referral_level5').then(({ data, error }) => {
      if (error) {
        setIndisponivel(true);
        return;
      }
      setLinhas((data ?? []) as Linha[]);
    });
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Gift className="h-4 w-4 text-primary" /> Indicação: nível 5
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm">
        {!PREMIO_INDICACAO_ATIVO && (
          <p className="text-xs text-muted-foreground mb-3">
            Prêmio desligado no site (PREMIO_INDICACAO_ATIVO em src/data/indicacao.ts) até a autorização do sorteio.
          </p>
        )}
        {indisponivel ? (
          <p className="text-muted-foreground">Aplique a migration 20261021120000_indicacao_e_desafios para ver esta lista.</p>
        ) : !linhas ? (
          <p className="text-muted-foreground">Carregando…</p>
        ) : linhas.length === 0 ? (
          <p className="text-muted-foreground">Ninguém chegou a 100 indicados válidos ainda.</p>
        ) : (
          <ul className="divide-y divide-border">
            {linhas.map((l) => (
              <li key={l.user_id} className="py-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{l.username ?? 'Jogador'}</p>
                  <p className="text-xs text-muted-foreground truncate">{l.email}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold tabular-nums">{l.validos}</p>
                  <p className="text-xs text-muted-foreground">
                    desde {new Date(l.nivel5_desde).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
