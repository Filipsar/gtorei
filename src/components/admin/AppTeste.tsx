import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Loader2, Smartphone, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// Bucket privado: só o admin lê e grava (migration 20261024120000_app_teste_storage.sql)
const BUCKET = 'app-teste';
const TIPO_APK = 'application/vnd.android.package-archive';
// O link assinado vale 10 minutos: dá para baixar, não serve para espalhar
const VALIDADE_DO_LINK_S = 600;

interface Arquivo {
  name: string;
  created_at: string | null;
  metadata: { size?: number } | null;
}

const emMB = (bytes?: number) => (bytes ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : '');

/**
 * APKs de teste do app Android, antes do teste fechado da Play Store. O admin
 * envia o arquivo pelo computador e baixa pelo celular, nesta mesma aba.
 */
export function AppTeste() {
  const { toast } = useToast();
  const [arquivos, setArquivos] = useState<Arquivo[] | null>(null);
  const [indisponivel, setIndisponivel] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const entrada = useRef<HTMLInputElement>(null);

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list('', { limit: 50, sortBy: { column: 'created_at', order: 'desc' } });
    if (error) {
      setIndisponivel(true);
      setArquivos([]);
      return;
    }
    setIndisponivel(false);
    setArquivos(((data ?? []) as Arquivo[]).filter((a) => a.name.toLowerCase().endsWith('.apk')));
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const enviar = async (arquivo: File) => {
    if (!arquivo.name.toLowerCase().endsWith('.apk')) {
      toast({ title: 'Escolha um arquivo .apk', variant: 'destructive' });
      return;
    }
    // Nome do arquivo vira caminho no Storage: só letras, números, ponto, hífen e sublinhado
    const nome = arquivo.name.replace(/[^A-Za-z0-9._-]/g, '-');
    setEnviando(true);
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(nome, arquivo, { contentType: TIPO_APK, upsert: true });
    setEnviando(false);
    if (entrada.current) entrada.current.value = '';
    if (error) {
      toast({ title: 'Não deu para enviar', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'APK enviado', description: nome });
    void carregar();
  };

  const baixar = async (nome: string) => {
    setOcupado(nome);
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(nome, VALIDADE_DO_LINK_S, { download: nome });
    setOcupado(null);
    if (error || !data) {
      toast({ title: 'Não deu para gerar o link', description: error?.message, variant: 'destructive' });
      return;
    }
    // O link responde como anexo: o navegador baixa e a página fica onde está
    window.location.href = data.signedUrl;
  };

  const apagar = async (nome: string) => {
    if (!window.confirm(`Apagar ${nome}? Não dá para desfazer.`)) return;
    setOcupado(nome);
    const { error } = await supabase.storage.from(BUCKET).remove([nome]);
    setOcupado(null);
    if (error) {
      toast({ title: 'Não deu para apagar', description: error.message, variant: 'destructive' });
      return;
    }
    void carregar();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Smartphone className="h-5 w-5 text-primary" /> App Android (teste)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {indisponivel ? (
            <p className="text-sm text-muted-foreground">
              O armazenamento do APK ainda não existe. Falta aplicar a migration{' '}
              <code className="rounded bg-muted px-1">20261024120000_app_teste_storage.sql</code>.
            </p>
          ) : arquivos === null ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : arquivos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum APK enviado ainda.</p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border">
              {arquivos.map((a, i) => (
                <li key={a.name} className="flex flex-wrap items-center gap-3 p-3">
                  {/* No celular o nome ocupa a linha toda: cortado, sumia justo a versão */}
                  <div className="min-w-0 flex-1 basis-full sm:basis-0">
                    <p className="break-all font-medium">
                      {a.name}
                      {i === 0 && <span className="ml-2 rounded bg-primary/15 px-1.5 py-0.5 text-xs text-primary">mais novo</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {a.created_at ? new Date(a.created_at).toLocaleString('pt-BR') : ''} {emMB(a.metadata?.size)}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => void baixar(a.name)} disabled={ocupado === a.name}>
                    {ocupado === a.name ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                    Baixar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void apagar(a.name)}
                    disabled={ocupado === a.name}
                    aria-label={`Apagar ${a.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          {!indisponivel && (
            <div>
              <input
                ref={entrada}
                type="file"
                accept=".apk,application/vnd.android.package-archive"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void enviar(f);
                }}
              />
              <Button variant="outline" onClick={() => entrada.current?.click()} disabled={enviando}>
                {enviando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Enviar APK novo
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Como instalar no celular</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
            <li>Abra esta página no Chrome do celular, logado na conta de admin, e toque em Baixar no APK mais novo.</li>
            <li>O Chrome avisa que o arquivo pode ser perigoso: é o aviso padrão para app fora da loja. Toque em Baixar mesmo assim.</li>
            <li>Abra o arquivo baixado. Na primeira vez, o Android pede para permitir que o Chrome instale apps: permita e volte.</li>
            <li>Versão nova instala por cima da anterior, sem desinstalar. Antes de instalar a versão da Play Store, desinstale esta.</li>
          </ol>
          <p className="mt-3 text-xs text-muted-foreground">
            O APK de teste usa anúncios de exemplo do Google e não faz compra real: o PRO só funciona no app baixado pela Play Store.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
