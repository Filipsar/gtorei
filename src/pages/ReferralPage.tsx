import { useEffect, useState } from 'react';
import { Check, Copy, Gift, Share2, Users, UserPlus, Clock, Award } from 'lucide-react';
import { toast } from 'sonner';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { SEO } from '@/components/seo/SEO';
import { AchievementIcon } from '@/components/achievements/AchievementIcon';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import {
  MAOS_PARA_VALER,
  NIVEIS_INDICACAO,
  PRAZO_DIAS,
  PREMIO_INDICACAO_ATIVO,
  linkDeConvite,
  proximoNivel,
  type ResumoIndicacao,
  type SituacaoIndicado,
} from '@/data/indicacao';

const SITUACAO: Record<SituacaoIndicado, { rotulo: string; classe: string }> = {
  valido: { rotulo: 'Válido', classe: 'bg-primary/15 text-primary border-primary/30' },
  pendente: { rotulo: 'Treinando', classe: 'bg-muted text-foreground border-border' },
  expirado: { rotulo: 'Prazo encerrado', classe: 'bg-muted text-muted-foreground border-border' },
};

const dataCurta = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

export default function ReferralPage() {
  const [codigo, setCodigo] = useState<string | null>(null);
  const [resumo, setResumo] = useState<ResumoIndicacao | null>(null);
  const [indisponivel, setIndisponivel] = useState(false);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    let cancelado = false;
    Promise.all([supabase.rpc('get_my_referral_code'), supabase.rpc('get_my_referrals')]).then(
      ([cod, res]) => {
        if (cancelado) return;
        // Sem a migration aplicada as funções não existem: a tela avisa em vez de quebrar
        if (cod.error || res.error) {
          setIndisponivel(true);
          return;
        }
        setCodigo(cod.data as string);
        setResumo(res.data as unknown as ResumoIndicacao);
      },
    );
    return () => {
      cancelado = true;
    };
  }, []);

  const link = codigo ? linkDeConvite(codigo) : '';
  const validos = resumo?.validos ?? 0;
  const proximo = proximoNivel(validos);
  const anterior = proximo ? NIVEIS_INDICACAO[proximo.nivel.nivel - 2]?.indicados ?? 0 : 100;
  const progresso = proximo ? Math.round(((validos - anterior) / (proximo.nivel.indicados - anterior)) * 100) : 100;
  const textoConvite = `Estou treinando poker GTO de graça no GTORei. Entra pelo meu link: ${link}`;

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      toast.error('Não deu para copiar. Selecione o link e copie à mão.');
    }
  };

  const compartilhar = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'GTORei', text: textoConvite });
        return;
      } catch {
        // Cancelado pelo usuário: nada a fazer
        return;
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(textoConvite)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <MainLayout>
      <SEO title="Indique e ganhe — GTORei" description="Convide amigos para treinar no GTORei e suba de nível." path="/indicar" noindex />
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-heading-md sm:text-heading-lg text-foreground flex items-center gap-3">
            <Gift className="h-8 w-8 text-primary" />
            Indique e ganhe
          </h1>
          <p className="text-body-sm text-muted-foreground mt-1">
            Convide quem joga com você. Cada amigo que treinar {MAOS_PARA_VALER} mãos sobe você de nível.
          </p>
        </div>

        {indisponivel ? (
          <Card>
            <CardContent className="p-6 text-body-sm text-muted-foreground">
              O programa de indicação está sendo ativado. Volte em breve.
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Link */}
            <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card">
              <CardContent className="p-5 sm:p-6 space-y-4">
                <p className="text-sm font-medium">Seu link de convite</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div
                    className="flex-1 min-w-0 rounded-md border border-border bg-background px-3 py-2.5 font-mono text-sm truncate"
                    aria-label="Link de convite"
                  >
                    {link || 'Carregando…'}
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={copiar} disabled={!link} variant="outline" className="flex-1 sm:flex-none">
                      {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {copiado ? 'Copiado' : 'Copiar'}
                    </Button>
                    <Button onClick={compartilhar} disabled={!link} className="flex-1 sm:flex-none">
                      <Share2 className="h-4 w-4" />
                      Compartilhar
                    </Button>
                  </div>
                </div>
                {codigo && (
                  <p className="text-body-xs text-muted-foreground">
                    Código: <span className="font-mono font-semibold text-foreground">{codigo}</span>
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Progresso */}
            <Card>
              <CardContent className="p-5 sm:p-6">
                <div className="grid grid-cols-3 gap-4 text-center mb-5">
                  <div>
                    <p className="text-3xl font-bold text-primary tabular-nums">{validos}</p>
                    <p className="text-body-xs text-muted-foreground">válidos</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold tabular-nums">{resumo?.pendentes ?? 0}</p>
                    <p className="text-body-xs text-muted-foreground">treinando</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold tabular-nums">{resumo?.nivel ?? 0}</p>
                    <p className="text-body-xs text-muted-foreground">nível</p>
                  </div>
                </div>
                {proximo ? (
                  <>
                    <div className="flex justify-between text-body-xs text-muted-foreground mb-2">
                      <span>Próximo: nível {proximo.nivel.nivel}, {proximo.nivel.nome}</span>
                      <span>
                        faltam {proximo.faltam} {proximo.faltam === 1 ? 'indicado' : 'indicados'}
                      </span>
                    </div>
                    <Progress value={progresso} className="h-2.5 bg-muted" />
                  </>
                ) : (
                  <p className="text-center text-sm font-medium text-primary">Você chegou ao nível máximo.</p>
                )}
              </CardContent>
            </Card>

            {/* Níveis */}
            <div>
              <h2 className="text-heading-xs mb-3">Níveis</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {NIVEIS_INDICACAO.map((n) => {
                  const alcancado = (resumo?.nivel ?? 0) >= n.nivel;
                  return (
                    <Card key={n.nivel} className={cn(alcancado ? 'border-primary/40 bg-primary/5' : 'opacity-80')}>
                      <CardContent className="p-4 flex lg:flex-col items-center lg:items-start gap-3">
                        <div
                          className={cn(
                            'h-11 w-11 shrink-0 rounded-lg flex items-center justify-center',
                            alcancado ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
                          )}
                        >
                          <AchievementIcon achievement={n.conquista} className="h-7 w-7" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-body-xs text-muted-foreground">Nível {n.nivel}</p>
                          <p className="font-semibold leading-tight">{n.nome}</p>
                          <p className="text-body-xs text-muted-foreground mt-1">
                            {n.indicados} {n.indicados === 1 ? 'indicado' : 'indicados'}
                          </p>
                          <p className="text-sm font-medium text-primary mt-1">
                            {n.xp > 0
                              ? `+${n.xp.toLocaleString('pt-BR')} XP`
                              : PREMIO_INDICACAO_ATIVO
                                ? 'Concorre a US$ 100 no mês'
                                : 'Conquista Embaixador'}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Como funciona */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-heading-xs">Como funciona</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3 text-sm">
                <div className="flex gap-3">
                  <UserPlus className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <p>Seu amigo cria a conta pelo seu link. Vale só para conta nova.</p>
                </div>
                <div className="flex gap-3">
                  <Clock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <p>
                    Ele treina {MAOS_PARA_VALER} mãos em até {PRAZO_DIAS} dias. Aí a indicação passa a valer.
                  </p>
                </div>
                <div className="flex gap-3">
                  <Award className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <p>Ao completar cada nível, o XP e a conquista caem na sua conta na hora.</p>
                </div>
              </CardContent>
            </Card>

            {/* Indicados */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-heading-xs flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Seus indicados
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!resumo || resumo.indicados.length === 0 ? (
                  <p className="text-body-sm text-muted-foreground py-4">
                    Ninguém entrou pelo seu link ainda. Que tal mandar para o seu grupo de poker?
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {resumo.indicados.map((i, k) => (
                      <li key={k} className="py-3 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{i.nome}</p>
                          <p className="text-body-xs text-muted-foreground">
                            {i.situacao === 'pendente'
                              ? `${i.maos}/${MAOS_PARA_VALER} mãos · até ${dataCurta(i.prazo)}`
                              : `desde ${dataCurta(i.desde)}`}
                          </p>
                          {i.situacao === 'pendente' && (
                            <Progress value={(i.maos / MAOS_PARA_VALER) * 100} className="h-1.5 mt-2 max-w-xs bg-muted" />
                          )}
                        </div>
                        <Badge variant="outline" className={cn('shrink-0', SITUACAO[i.situacao].classe)}>
                          {SITUACAO[i.situacao].rotulo}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {PREMIO_INDICACAO_ATIVO && (
              <p className="text-body-xs text-muted-foreground">
                Sorteio mensal entre quem está no nível 5, conforme o regulamento autorizado.
              </p>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}
