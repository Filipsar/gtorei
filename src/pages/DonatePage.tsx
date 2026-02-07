import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Heart, ExternalLink, Copy } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import qrCodeImage from '@/assets/qr-code-donate.png';
import gtoreiLogo from '@/assets/gtorei-logo.png';

const DONATION_LINK = 'https://cobranca.c6pix.com.br/01KGMHQ3SVAQM3S0EQ6MNZP8YE';

export default function DonatePage() {
  const navigate = useNavigate();

  const handleCopyLink = () => {
    navigator.clipboard.writeText(DONATION_LINK);
    toast({
      title: 'Link copiado!',
      description: 'O link foi copiado para a área de transferência.'
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <img src={gtoreiLogo} alt="GTORei" className="h-8 w-8" />
            <span className="text-heading-xs text-foreground">GTORei</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/20 mb-4">
            <Heart className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-display-md sm:text-display-lg text-foreground mb-4">
            Apoie o GTORei
          </h1>
          <p className="text-body-lg text-muted-foreground max-w-lg mx-auto">
            Sua contribuição ajuda a manter o projeto gratuito e acessível para todos os jogadores.
          </p>
        </div>

        {/* Info card */}
        <Card className="mb-8 bg-muted/30">
          <CardContent className="p-6">
            <h2 className="text-heading-xs mb-3">Por que apoiar?</h2>
            <ul className="space-y-2 text-body-md text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary">✓</span>
                Manter o projeto 100% gratuito
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">✓</span>
                Ajudar jogadores de baixa renda a evoluírem
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">✓</span>
                Melhorias contínuas estão sendo desenvolvidas
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">✓</span>
                Novos cenários e funcionalidades em breve
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* QR Code section */}
        <Card className="mb-6">
          <CardContent className="p-6 text-center">
            <h2 className="text-heading-xs mb-4">Escaneie o QR Code</h2>
            <div className="inline-block p-4 bg-background rounded-xl shadow-lg mb-4 border border-border">
              <img
                src={qrCodeImage}
                alt="QR Code para doação"
                className="w-48 h-48 sm:w-56 sm:h-56"
              />
            </div>
            <p className="text-body-sm text-muted-foreground mb-4">
              Ou clique no botão abaixo para abrir o link de pagamento
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                asChild
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <a href={DONATION_LINK} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ajudar
                </a>
              </Button>
              <Button
                variant="outline"
                onClick={handleCopyLink}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copiar Link
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Thank you message */}
        <div className="text-center text-muted-foreground">
          <p className="text-body-sm">
            Qualquer valor é bem-vindo! Obrigado pelo apoio. ❤️
          </p>
        </div>

        {/* Back to home */}
        <div className="text-center mt-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao início
          </Button>
        </div>
      </div>
    </div>
  );
}
