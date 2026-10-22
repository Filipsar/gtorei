import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SEO } from '@/components/seo/SEO';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

/**
 * Excluir a conta. Pública de propósito: é o link que a Play Store pede para
 * quem quer apagar a conta sem abrir o app. Sem login, pede para entrar antes.
 */
export default function DeleteAccountPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [confirmacao, setConfirmacao] = useState('');
  const [excluindo, setExcluindo] = useState(false);

  const excluir = async () => {
    setExcluindo(true);
    const { error } = await supabase.functions.invoke('delete-account', { body: { confirmacao } });
    setExcluindo(false);
    if (error) {
      toast.error('Não foi possível excluir a conta agora. Tente de novo em alguns minutos.');
      return;
    }
    await signOut().catch(() => undefined);
    toast.success('Conta excluída. Seus dados foram apagados.');
    navigate('/', { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <SEO
        title="Excluir conta — GTORei"
        description="Peça a exclusão da sua conta do GTORei e de todos os seus dados."
        path="/excluir-conta"
      />
      <Card className="w-full max-w-md">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <h1 className="text-xl font-bold">Excluir minha conta</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            A exclusão é definitiva e acontece na hora. Apaga o perfil, as mãos e sessões de treino, o ranking, as
            conquistas, os posts e comentários, as indicações e as imagens do perfil. Uma compra do PRO feita no Google
            Play não é reembolsada pela exclusão.
          </p>

          {!user ? (
            <>
              <p className="text-sm">Entre na conta que quer excluir para continuar.</p>
              <Button asChild className="w-full">
                <Link to="/auth">Entrar</Link>
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm">
                Conta: <span className="font-medium">{user.email}</span>
              </p>
              <div className="space-y-2">
                <Label htmlFor="confirmacao">Digite EXCLUIR para confirmar</Label>
                <Input
                  id="confirmacao"
                  value={confirmacao}
                  onChange={(e) => setConfirmacao(e.target.value.toUpperCase())}
                  autoComplete="off"
                />
              </div>
              <Button
                variant="destructive"
                className="w-full"
                disabled={confirmacao !== 'EXCLUIR' || excluindo}
                onClick={excluir}
              >
                {excluindo ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Excluir conta para sempre'}
              </Button>
              <Button asChild variant="ghost" className="w-full">
                <Link to="/treinar">Cancelar</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
