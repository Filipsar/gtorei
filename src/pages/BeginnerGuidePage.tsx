import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { BookOpen, Target, Brain, Trophy, Zap, Shield } from 'lucide-react';
import { SEO } from '@/components/seo/SEO';

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "O que é poker GTO?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "GTO (Game Theory Optimal) é uma estratégia matematicamente equilibrada que não pode ser explorada pelos adversários. Define ranges e frequências ótimas para cada decisão.",
      },
    },
    {
      "@type": "Question",
      name: "Como funciona uma mão de Texas Hold'em?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Cada jogador recebe 2 cartas privadas. Há quatro rodadas de apostas: pré-flop, flop, turn e river. As 5 cartas comunitárias formam a melhor mão de 5 cartas junto às privadas.",
      },
    },
    {
      "@type": "Question",
      name: "Qual a importância da posição no poker?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Posição define a ordem de ação. Posições tardias (BTN, CO) jogam mais mãos pois agem por último, enquanto blinds e UTG jogam ranges mais apertados.",
      },
    },
  ],
};

export default function BeginnerGuidePage() {
  return (
    <MainLayout>
      <SEO
        title="Guia de Poker GTO para Iniciantes — GTORei"
        description="Aprenda fundamentos do poker e GTO: posições, ranges, fases da mão e tomada de decisão. Guia completo em português para iniciantes."
        path="/iniciante"
        jsonLd={faqJsonLd}
      />
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-heading-md sm:text-heading-lg text-foreground flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-primary" />
            Guia do Iniciante
          </h1>
          <p className="text-body-sm text-muted-foreground mt-1">
            Aprenda os fundamentos do poker e do GTO para tomar decisões melhores
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-heading-xs flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              O que é Poker?
            </h2>
          </CardHeader>
          <CardContent className="space-y-3 text-body-sm text-muted-foreground">
            <p>O poker é um jogo de cartas onde os jogadores fazem apostas com base na força da sua mão. No <strong className="text-foreground">Texas Hold'em</strong>, cada jogador recebe 2 cartas privadas e compartilha 5 cartas comunitárias na mesa.</p>
            <p>O objetivo é tomar as melhores decisões possíveis em cada situação, maximizando seus ganhos a longo prazo.</p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-heading-xs flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Passo a passo de uma mão
            </h2>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="preflop">
                <AccordionTrigger>1. Pré-Flop</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-2">
                  <p>Cada jogador recebe 2 cartas fechadas. A ação começa pelo jogador à esquerda do big blind.</p>
                  <p>Suas opções: <strong className="text-foreground">Fold</strong> (desistir), <strong className="text-foreground">Call</strong> (pagar) ou <strong className="text-foreground">Raise</strong> (aumentar).</p>
                  <p>A decisão pré-flop é a mais importante — jogar as mãos certas nas posições certas é a base do poker lucrativo.</p>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="flop">
                <AccordionTrigger>2. Flop</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  <p>3 cartas comunitárias são reveladas. Uma nova rodada de apostas começa, agora com opção de <strong className="text-foreground">Check</strong> (passar) ou <strong className="text-foreground">Bet</strong> (apostar).</p>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="turn">
                <AccordionTrigger>3. Turn</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  <p>A 4ª carta comunitária é revelada. Outra rodada de apostas acontece.</p>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="river">
                <AccordionTrigger>4. River</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  <p>A 5ª e última carta comunitária é revelada. Última rodada de apostas. Quem tiver a melhor combinação de 5 cartas vence.</p>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="positions">
                <AccordionTrigger>5. Posições na Mesa</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-2">
                  <p><strong className="text-foreground">UTG (Under the Gun):</strong> Primeira posição, range mais apertado.</p>
                  <p><strong className="text-foreground">CO (Cutoff):</strong> Penúltima posição, range mais solto.</p>
                  <p><strong className="text-foreground">BTN (Button):</strong> Melhor posição — age por último no pós-flop.</p>
                  <p><strong className="text-foreground">SB/BB (Small/Big Blind):</strong> Blinds obrigatórios, agem primeiro no pós-flop.</p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-heading-xs flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              O que é GTO (Game Theory Optimal)?
            </h2>
          </CardHeader>
          <CardContent className="space-y-3 text-body-sm text-muted-foreground">
            <p><strong className="text-foreground">GTO</strong> é a estratégia matematicamente perfeita no poker. É baseada na Teoria dos Jogos e define a jogada ideal em cada situação, tornando você <strong className="text-foreground">inexploitável</strong> — nenhum oponente consegue lucrar contra você a longo prazo.</p>
            <p>Jogar GTO significa escolher a ação com maior <strong className="text-foreground">EV (Expected Value)</strong> — o valor esperado de cada decisão. Tomar a decisão de maior EV repetidamente garante lucro no longo prazo.</p>
            <p>Envolve ranges de mãos, frequências de ação e equilíbrio entre value bets e bluffs.</p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-heading-xs flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Por que o GTORei?
            </h2>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  <p className="font-medium text-foreground">Treino Prático</p>
                </div>
                <p className="text-body-sm text-muted-foreground">Pratique decisões pré-flop contra ranges GTO reais, com feedback instantâneo sobre cada jogada.</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <div className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  <p className="font-medium text-foreground">Dificuldade Adaptativa</p>
                </div>
                <p className="text-body-sm text-muted-foreground">O sistema ajusta a complexidade das mãos conforme seu nível evolui, sempre te desafiando.</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  <p className="font-medium text-foreground">Análise Detalhada</p>
                </div>
                <p className="text-body-sm text-muted-foreground">Veja onde você está errando com estatísticas por posição, cenário e tipo de decisão.</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <p className="font-medium text-foreground">100% Gratuito</p>
                </div>
                <p className="text-body-sm text-muted-foreground">Acesso completo sem precisar pagar. Feito pela comunidade, para a comunidade.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}