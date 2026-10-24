import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, ArrowLeft, Eye, EyeOff, Loader2, Mail, MailCheck } from 'lucide-react';
import { SEO } from '@/components/seo/SEO';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { VERSAO_TERMOS } from '@/data/legal';
import { erroDeLogin, loginSchema, signupSchema, type LoginForm, type SignupForm } from '@/lib/login';
import { abrirLoginNoNavegador } from '@/lib/nativo/loginApp';
import { ehApp } from '@/lib/nativo/plataforma';
import { cn } from '@/lib/utils';

type Etapa = 'inicio' | 'entrar' | 'criar' | 'confirmar';

// O link de confirmação do e-mail precisa abrir no site, não no endereço
// interno do app (https://localhost). Apex, como o site manda em produção.
const VOLTA_DO_EMAIL = 'https://gtorei.com.br';

/** Login do app, do zero: um caminho por vez em vez de abas */
export function LoginApp() {
  const navigate = useNavigate();
  const [etapa, setEtapa] = useState<Etapa>('inicio');
  const [emailConfirmar, setEmailConfirmar] = useState('');

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-x-clip bg-background">
      <SEO title="Entrar — GTORei" description="Entre no GTORei." path="/auth" noindex />

      {/* A mesa: feltro verde saindo do topo, o Rei de pé atrás dela */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[46dvh] overflow-hidden">
        <div className="absolute -top-[40%] left-1/2 h-[120%] w-[160%] -translate-x-1/2 rounded-[50%] border-[10px] border-[hsl(var(--table-border))] table-felt shadow-[inset_0_0_80px_rgba(0,0,0,0.6)]" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-background" />
      </div>

      {etapa === 'inicio' && <Inicio onEmail={() => setEtapa('entrar')} onCriar={() => setEtapa('criar')} />}
      {etapa === 'entrar' && (
        <Painel titulo="Entrar com e-mail" onVoltar={() => setEtapa('inicio')}>
          <FormEntrar onEntrou={() => navigate('/trilha', { replace: true })} onCriar={() => setEtapa('criar')} />
        </Painel>
      )}
      {etapa === 'criar' && (
        <Painel titulo="Criar conta" onVoltar={() => setEtapa('inicio')}>
          <FormCriar
            onCriou={(email) => {
              setEmailConfirmar(email);
              setEtapa('confirmar');
            }}
            onEntrar={() => setEtapa('entrar')}
          />
        </Painel>
      )}
      {etapa === 'confirmar' && <Confirmar email={emailConfirmar} onEntrar={() => setEtapa('entrar')} />}
    </div>
  );
}

function Inicio({ onEmail, onCriar }: { onEmail: () => void; onCriar: () => void }) {
  const [abrindo, setAbrindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const google = async () => {
    setErro(null);
    setAbrindo(true);
    try {
      // No app o Google não deixa entrar dentro da WebView: o login acontece no
      // Chrome e a sessão volta para o app (src/lib/nativo/loginApp.ts)
      if (ehApp()) {
        await abrirLoginNoNavegador();
      } else {
        const { error } = await lovable.auth.signInWithOAuth('google', { redirect_uri: window.location.origin });
        if (error) throw error;
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não deu para abrir o login do Google');
    } finally {
      setAbrindo(false);
    }
  };

  return (
    <main className="relative mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <div className="flex flex-1 flex-col items-center justify-end pb-6 pt-10">
        <img src="/mascote/rei-acenando.webp" alt="" aria-hidden="true" width={348} height={420} className="h-48 w-auto drop-shadow-2xl" />
        <h1 className="mt-4 text-4xl font-bold tracking-tight">
          <span className="text-primary">GTO</span>Rei
        </h1>
        <p className="mt-2 text-center text-base text-muted-foreground">
          Sente na mesa e treine cada decisão,
          <br />
          mão a mão.
        </p>
      </div>

      <div className="space-y-3">
        {erro && <Aviso>{erro}</Aviso>}
        {/* Botão branco com o G colorido: é o que a marca do Google pede para o login */}
        <Button
          onClick={google}
          disabled={abrindo}
          className="h-14 w-full bg-white text-base font-semibold text-neutral-900 hover:bg-white/90 active:bg-white/80"
        >
          {abrindo ? <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" /> : <LogoGoogle />}
          Continuar com Google
        </Button>
        <Button variant="outline" onClick={onEmail} className="h-14 w-full text-base">
          <Mail className="mr-2 h-5 w-5" aria-hidden="true" />
          Entrar com e-mail
        </Button>
        <p className="pt-1 text-center text-sm text-muted-foreground">
          Ainda não tem conta?{' '}
          <button type="button" onClick={onCriar} className="min-h-[44px] font-semibold text-primary underline-offset-4 hover:underline">
            Criar com e-mail
          </button>
        </p>
        <p className="text-center text-xs leading-relaxed text-muted-foreground">
          Ao continuar com o Google pela primeira vez, você cria uma conta e aceita os{' '}
          <Link to="/termos" className="underline">Termos</Link> e a <Link to="/privacidade" className="underline">Política de Privacidade</Link>.
        </p>
      </div>
    </main>
  );
}

function Painel({ titulo, onVoltar, children }: { titulo: string; onVoltar: () => void; children: React.ReactNode }) {
  return (
    <main className="relative mx-auto w-full max-w-md flex-1 px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4">
      <button
        type="button"
        onClick={onVoltar}
        className="-ml-2 flex min-h-[44px] items-center gap-1 rounded-md px-2 text-sm text-muted-foreground active:bg-muted"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Voltar
      </button>
      <div className="mt-[18dvh] rounded-3xl border border-border bg-card/95 p-5 shadow-2xl backdrop-blur">
        <div className="mb-4 flex items-center gap-3">
          <img src="/mascote/rei-avatar.webp" alt="" aria-hidden="true" width={192} height={256} className="h-10 w-auto" />
          <h1 className="text-xl font-bold">{titulo}</h1>
        </div>
        {children}
      </div>
    </main>
  );
}

function Aviso({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/50 bg-destructive/10 p-3 text-sm">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400 [.light_&]:text-red-700" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

const classeDoCampo = 'h-12 text-base';

function CampoSenha({ field, autoComplete, mostrar, onAlternar }: {
  field: object;
  autoComplete: string;
  mostrar: boolean;
  onAlternar: () => void;
}) {
  return (
    <div className="relative">
      <Input {...field} type={mostrar ? 'text' : 'password'} autoComplete={autoComplete} className={cn(classeDoCampo, 'pr-12')} />
      <button
        type="button"
        onClick={onAlternar}
        aria-label={mostrar ? 'Esconder senha' : 'Mostrar senha'}
        aria-pressed={mostrar}
        className="absolute right-0 top-0 flex h-12 w-12 items-center justify-center text-muted-foreground active:text-foreground"
      >
        {mostrar ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      </button>
    </div>
  );
}

function FormEntrar({ onEntrou, onCriar }: { onEntrou: () => void; onCriar: () => void }) {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mostrar, setMostrar] = useState(false);
  const form = useForm<LoginForm>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });

  const entrar = async (dados: LoginForm) => {
    setErro(null);
    setEnviando(true);
    const { error } = await supabase.auth.signInWithPassword({ email: dados.email, password: dados.password });
    setEnviando(false);
    if (error) {
      setErro(erroDeLogin(error.message));
      return;
    }
    onEntrou();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(entrar)} className="space-y-4" noValidate>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-mail</FormLabel>
              <FormControl>
                <Input {...field} type="email" inputMode="email" autoComplete="email" autoCapitalize="none" className={classeDoCampo} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Senha</FormLabel>
              <FormControl>
                <CampoSenha field={field} autoComplete="current-password" mostrar={mostrar} onAlternar={() => setMostrar((m) => !m)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {erro && <Aviso>{erro}</Aviso>}
        <Button type="submit" disabled={enviando} className="h-12 w-full text-base font-bold">
          {enviando ? <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" /> : null}
          {enviando ? 'Entrando…' : 'Entrar'}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Não tem conta?{' '}
          <button type="button" onClick={onCriar} className="min-h-[44px] font-semibold text-primary">
            Criar agora
          </button>
        </p>
      </form>
    </Form>
  );
}

function FormCriar({ onCriou, onEntrar }: { onCriou: (email: string) => void; onEntrar: () => void }) {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mostrar, setMostrar] = useState(false);
  const form = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: { username: '', email: '', password: '', confirmPassword: '', aceite: false as unknown as true },
  });

  const criar = async (dados: SignupForm) => {
    setErro(null);
    setEnviando(true);
    const { error } = await supabase.auth.signUp({
      email: dados.email,
      password: dados.password,
      options: {
        emailRedirectTo: ehApp() ? VOLTA_DO_EMAIL : window.location.origin,
        data: {
          full_name: dados.username,
          // Registro de qual versão dos termos foi aceita, e quando
          termos_aceitos: VERSAO_TERMOS,
          termos_aceitos_em: new Date().toISOString(),
        },
      },
    });
    setEnviando(false);
    if (error) {
      setErro(erroDeLogin(error.message));
      return;
    }
    onCriou(dados.email);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(criar)} className="space-y-4" noValidate>
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome de usuário</FormLabel>
              <FormControl>
                <Input {...field} autoComplete="username" autoCapitalize="none" className={classeDoCampo} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-mail</FormLabel>
              <FormControl>
                <Input {...field} type="email" inputMode="email" autoComplete="email" autoCapitalize="none" className={classeDoCampo} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Senha</FormLabel>
              <FormControl>
                <CampoSenha field={field} autoComplete="new-password" mostrar={mostrar} onAlternar={() => setMostrar((m) => !m)} />
              </FormControl>
              <p className="text-xs text-muted-foreground">Mínimo 8 caracteres, com 1 maiúscula e 1 símbolo.</p>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Repita a senha</FormLabel>
              <FormControl>
                <Input {...field} type={mostrar ? 'text' : 'password'} autoComplete="new-password" className={classeDoCampo} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="aceite"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-start gap-3">
                <FormControl>
                  <Checkbox
                    checked={field.value === true}
                    onCheckedChange={(v) => field.onChange(v === true)}
                    className="mt-0.5 h-5 w-5"
                  />
                </FormControl>
                <FormLabel className="text-sm font-normal leading-snug">
                  Li e aceito os <Link to="/termos" className="text-primary underline">Termos de Uso</Link> e a{' '}
                  <Link to="/privacidade" className="text-primary underline">Política de Privacidade</Link>. Tenho 18 anos ou mais.
                </FormLabel>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        {erro && <Aviso>{erro}</Aviso>}
        <Button type="submit" disabled={enviando} className="h-12 w-full text-base font-bold">
          {enviando ? <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" /> : null}
          {enviando ? 'Criando conta…' : 'Criar conta'}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Já tem conta?{' '}
          <button type="button" onClick={onEntrar} className="min-h-[44px] font-semibold text-primary">
            Entrar
          </button>
        </p>
      </form>
    </Form>
  );
}

function Confirmar({ email, onEntrar }: { email: string; onEntrar: () => void }) {
  return (
    <main className="relative mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-end px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-center">
      <img src="/mascote/rei-acertou.webp" alt="" aria-hidden="true" width={445} height={372} className="h-36 w-auto" />
      <MailCheck className="mt-4 h-8 w-8 text-primary" aria-hidden="true" />
      <h1 className="mt-2 text-2xl font-bold">Confirme seu e-mail</h1>
      <p className="mt-2 text-muted-foreground">
        Mandamos um link para <strong className="break-all text-foreground">{email}</strong>. Abra, confirme e volte aqui para entrar.
      </p>
      <p className="mt-1 text-sm text-muted-foreground">Não chegou? Olhe o spam e as promoções.</p>
      <Button className="mt-8 h-14 w-full text-base font-bold" onClick={onEntrar}>
        Já confirmei, entrar
      </Button>
    </main>
  );
}

function LogoGoogle() {
  return (
    <svg aria-hidden="true" className="mr-3 h-5 w-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}
