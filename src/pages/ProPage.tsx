import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Crown, Loader2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SEO } from '@/components/seo/SEO';
import { useAuth } from '@/contexts/AuthContext';
import { useSupporter, EVENTO_PRO_ATUALIZADO } from '@/hooks/useSupporter';
import { ehApp } from '@/lib/nativo/plataforma';
import type { ProdutoPro } from '@/lib/nativo/compras';

// O que o PRO libera hoje. Se mudar o que é de apoiador (MODOS_APOIADOR,
// CENARIOS_APOIADOR, limite da análise por IA), mudar aqui também.
const BENEFICIOS = [
  'Sem anúncios no app',
  'Modos Bounty e Aleatório',
  'Cenários Multiway e Simulação',
  'Análise por IA: 30 por dia, em vez de 5',
  'Vale no site e no app, na mesma conta',
];

export default function ProPage() {
  const { user } = useAuth();
  const { isSupporter, loading } = useSupporter();
  const app = ehApp();
  const [produto, setProduto] = useState<ProdutoPro | null>(null);
  const [comprando, setComprando] = useState(false);
  const [restaurando, setRestaurando] = useState(false);

  useEffect(() => {
    if (!app) return;
    void import('@/lib/nativo/compras').then(({ carregarProdutoPro }) => carregarProdutoPro().then(setProduto));
  }, [app]);

  const comprar = async () => {
    if (!user) return;
    setComprando(true);
    const { comprarPro } = await import('@/lib/nativo/compras');
    const r = await comprarPro(user.id);
    setComprando(false);
    if (r === 'pro') {
      window.dispatchEvent(new Event(EVENTO_PRO_ATUALIZADO));
      toast.success('Você agora é PRO!', { description: 'Anúncios removidos e tudo liberado.' });
    } else if (r === 'pendente') {
      toast('Pagamento em processamento', {
        description: 'O PRO libera assim que o Google confirmar. Pode levar alguns minutos.',
      });
    }
  };

  const restaurar = async () => {
    setRestaurando(true);
    const { restaurarPro } = await import('@/lib/nativo/compras');
    const ok = await restaurarPro();
    setRestaurando(false);
    if (ok) {
      window.dispatchEvent(new Event(EVENTO_PRO_ATUALIZADO));
      toast.success('Compra restaurada. Você é PRO.');
    } else {
      toast('Nenhuma compra do PRO encontrada nesta conta do Google.');
    }
  };

  return (
    <MainLayout>
      <SEO title="GTORei PRO" description="Tudo liberado e sem anúncios." path="/pro" noindex />
      <div className="p-4 sm:p-6 lg:p-8 max-w-xl mx-auto space-y-6">
        <div className="text-center">
          <Crown className="mx-auto h-12 w-12 text-primary" aria-hidden="true" />
          <h1 className="mt-3 text-heading-md sm:text-heading-lg">
            GTORei <span className="text-primary">PRO</span>
          </h1>
          <p className="text-body-sm text-muted-foreground mt-1">Tudo liberado, sem anúncios.</p>
        </div>

        <Card className="border-primary/30">
          <CardContent className="p-5 sm:p-6">
            <ul className="space-y-3">
              {BENEFICIOS.map((b) => (
                <li key={b} className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-primary shrink-0" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : isSupporter ? (
          <p className="text-center font-medium text-primary">Você é PRO. Obrigado por apoiar o GTORei!</p>
        ) : app ? (
          <div className="space-y-3">
            <Button size="lg" className="w-full" onClick={comprar} disabled={comprando || !produto}>
              {comprando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : produto ? (
                `Seja PRO por ${produto.preco}`
              ) : (
                'Carregando preço…'
              )}
            </Button>
            <p className="text-center text-body-xs text-muted-foreground">
              Pagamento único pelo Google Play. Não é assinatura.
            </p>
            <Button variant="ghost" size="sm" className="w-full" onClick={restaurar} disabled={restaurando}>
              <RotateCcw className="h-4 w-4" />
              {restaurando ? 'Procurando…' : 'Já comprei: restaurar'}
            </Button>
          </div>
        ) : (
          <Card>
            <CardContent className="p-5 text-sm space-y-3">
              <p>
                No site, o PRO vem do apoio ao projeto: quem apoia com Pix recebe o acesso na conta. No app Android, o
                PRO é comprado pelo Google Play.
              </p>
              <Button asChild className="w-full">
                <Link to="/apoiar">Apoiar com Pix</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
