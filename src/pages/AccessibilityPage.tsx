import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Heart, Instagram, ExternalLink, Accessibility } from 'lucide-react';
import gtoreiLogo from '@/assets/gtorei-logo.png';

export default function AccessibilityPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border p-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <img alt="GTORei" className="h-8 w-8" src="/lovable-uploads/e8c660c4-4c5b-4279-ae0a-088914599503.png" />
            <span className="text-heading-sm">
              <span className="text-primary">GTO</span>Rei
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        {/* Title */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <Accessibility className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-display-md mb-2">
            <span className="text-primary">GTO</span>Rei Acessibilidade
          </h1>
          <p className="text-body-lg text-muted-foreground">
            Poker para todos, sem barreiras
          </p>
        </div>

        {/* Content */}
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-heading-sm mb-4 flex items-center gap-2">
                <Heart className="h-5 w-5 text-destructive" />
                Por que apoiar a acessibilidade?
              </h2>
              <p className="text-body-md text-muted-foreground mb-4">
                O poker é um jogo de habilidade que deve ser acessível a todos. 
                Infelizmente, muitos jogadores com deficiências enfrentam barreiras 
                significativas para aprender e praticar o jogo.
              </p>
              <p className="text-body-md text-muted-foreground mb-4">
                No mundo do poker competitivo, a inclusão ainda é um desafio. 
                Apoiar projetos de acessibilidade não é apenas uma questão de 
                responsabilidade social, mas também de reconhecer o potencial 
                de talentos que podem estar sendo negligenciados.
              </p>
              <p className="text-body-md text-muted-foreground">
                O GTORei acredita que toda pessoa merece a oportunidade de 
                aprender e evoluir no poker, independentemente de suas limitações físicas.
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-6">
              <h2 className="text-heading-sm mb-4">
                🎴 Conheça: Aces Inclusivos
              </h2>
              <p className="text-body-md text-muted-foreground mb-4">
                O <strong>Aces Inclusivos</strong> é um projeto incrível que promove 
                a inclusão de pessoas com deficiência no mundo do poker. Eles trabalham 
                para criar um ambiente acolhedor e adaptado, permitindo que todos 
                possam competir em igualdade de condições.
              </p>
              <p className="text-body-md text-muted-foreground mb-6">
                O projeto oferece treinamentos, eventos adaptados e suporte para 
                jogadores que enfrentam barreiras de acessibilidade. É uma iniciativa 
                que merece todo nosso apoio e reconhecimento.
              </p>
              <a
                href="https://www.instagram.com/acesinclusivos/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors font-medium">
                
                <Instagram className="h-5 w-5" />
                @acesinclusivos
                <ExternalLink className="h-4 w-4" />
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="text-heading-sm mb-4">
                ♿ Recursos de Acessibilidade do GTORei
              </h2>
              <ul className="space-y-3 text-body-md text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>Interface otimizada para leitores de tela</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>Contraste adequado para baixa visão</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>Navegação por teclado</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>Textos alternativos em imagens</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-muted-foreground">🔜</span>
                  <span>Leitor de tela integrado (em desenvolvimento)</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <div className="text-center pt-4">
            <Button onClick={() => navigate('/')} size="lg" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar para o início
            </Button>
          </div>
        </div>
      </main>
    </div>);

}