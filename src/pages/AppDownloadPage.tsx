import { Link } from 'react-router-dom';
import { CalendarClock, ExternalLink, MessageSquare, Smartphone, UserCheck, Users } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { SEO } from '@/components/seo/SEO';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CONTATO_EMAIL } from '@/data/legal';
import { GRUPO_TESTADORES_URL, LINK_LOJA_URL, LINK_TESTE_URL, TESTE_ANDROID_ABERTO } from '@/data/appAndroid';
import { ehApp } from '@/lib/nativo/plataforma';

const PASSOS = [
  {
    icone: Users,
    titulo: 'Entre no grupo de testadores',
    texto: 'Abra o grupo e toque em "Participar do grupo". Use a mesma conta Google que está no Google Play do seu celular.',
    botao: 'Entrar no grupo',
    url: GRUPO_TESTADORES_URL,
  },
  {
    icone: UserCheck,
    titulo: 'Aceite o convite do teste',
    texto: 'Com a mesma conta, abra o link e toque em "Tornar-se testador". Sem esse passo o Google Play não mostra o app.',
    botao: 'Virar testador',
    url: LINK_TESTE_URL,
  },
  {
    icone: Smartphone,
    titulo: 'Instale pelo Google Play',
    texto: 'Abra a página do app no celular e instale. Logo depois do passo 2 ela pode demorar alguns minutos para aparecer.',
    botao: 'Abrir no Google Play',
    url: LINK_LOJA_URL,
  },
];

/** Convite para o teste fechado do app Android (/baixar-app) */
export default function AppDownloadPage() {
  const app = ehApp();

  return (
    <MainLayout>
      <SEO
        title="App GTORei para Android (teste) — GTORei"
        description="Baixe o app do GTORei para Android: entre no teste fechado pelo Google Play em três passos e treine poker GTO no celular."
        path="/baixar-app"
        noindex
      />
      <div className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6 lg:p-8">
        <header>
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Android · teste fechado</p>
          <h1 className="mt-1 text-3xl font-bold">GTORei no celular</h1>
          <p className="mt-2 text-muted-foreground">
            O app está em teste no Google Play. A conta é a mesma do site: nível, XP e histórico vão junto.
          </p>
        </header>

        {app ? (
          <Card>
            <CardContent className="p-5">
              <p className="font-semibold">Você já está no app.</p>
              <p className="mt-1 text-sm text-muted-foreground">Obrigado por testar! Fique inscrito por pelo menos 14 dias.</p>
            </CardContent>
          </Card>
        ) : !TESTE_ANDROID_ABERTO ? (
          <Card>
            <CardContent className="p-5">
              <p className="font-semibold">As inscrições para o teste ainda não abriram.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Quando abrirem, o aviso aparece aqui e nas novidades do site. Enquanto isso, o treino continua pelo{' '}
                <Link to="/treinar" className="text-primary underline underline-offset-2">navegador</Link>.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <ol className="space-y-3">
              {PASSOS.map((p, i) => (
                <li key={p.titulo}>
                  <Card>
                    <CardContent className="flex gap-4 p-5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h2 className="flex items-center gap-2 font-semibold">
                          <p.icone className="h-4 w-4 text-primary" aria-hidden="true" />
                          {p.titulo}
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">{p.texto}</p>
                        <Button asChild size="sm" className="mt-3">
                          <a href={p.url} target="_blank" rel="noopener noreferrer">
                            {p.botao}
                            <ExternalLink className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
                          </a>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ol>

            <Card className="border-primary/40 bg-primary/5">
              <CardContent className="flex gap-3 p-5">
                <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                <div className="text-sm">
                  <p className="font-semibold">Fique no teste por 14 dias</p>
                  <p className="mt-1 text-muted-foreground">
                    O Google só libera o app para todo mundo depois que pelo menos 12 testadores ficam inscritos por 14
                    dias seguidos. Quem sai do grupo ou do teste antes disso deixa de contar, então não saia: é o que vai
                    colocar o GTORei na Play Store.
                  </p>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">iPhone:</strong> por enquanto o app é só para Android. No iPhone, o treino
            continua pelo navegador, com a mesma conta.
          </p>
          {CONTATO_EMAIL && (
            <p className="flex items-start gap-2">
              <MessageSquare className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                Achou um problema no app? Escreva para{' '}
                <a href={`mailto:${CONTATO_EMAIL}`} className="text-primary underline underline-offset-2">
                  {CONTATO_EMAIL}
                </a>{' '}
                contando o que aconteceu e o modelo do celular.
              </span>
            </p>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
