import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SEO } from '@/components/seo/SEO';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { ehApp, usarLayoutDoApp } from '@/lib/nativo/plataforma';
import { abrirLoginNoNavegador } from '@/lib/nativo/loginApp';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { VERSAO_TERMOS } from '@/data/legal';
import { loginSchema, signupSchema, type LoginForm, type SignupForm } from '@/lib/login';
import { LoginApp } from '@/components/app/LoginApp';
import { ArrowLeft, Eye, EyeOff, Mail, Lock, User } from 'lucide-react';

// Regras dos formulários: as mesmas do login do app (src/lib/login.ts)

// Parece invertido, mas não é: o endereço oficial do site é o www, e ainda assim
// o redirect do OAuth sai no apex. O broker do Lovable valida o redirect_uri
// contra uma lista do projeto onde só está o apex — mandar
// "https://www.gtorei.com.br" volta 400 e o login com Google morre. Na volta, o
// Vercel devolve 308 do apex para o www antes de qualquer script rodar, então o
// token chega no www, que é de onde o login partiu.
// Qualquer outra origem (localhost, preview) passa reto.
function origemParaOAuth(): string {
  const { origin, hostname, protocol } = window.location;
  return hostname === 'www.gtorei.com.br' ? `${protocol}//gtorei.com.br` : origin;
}

export default function AuthPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' }
  });

  const signupForm = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: { username: '', email: '', password: '', confirmPassword: '', aceite: false as unknown as true }
  });

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      // No app, o Google não deixa logar dentro da WebView: o login acontece no
      // Chrome e a sessão volta para o app (src/lib/nativo/loginApp.ts)
      if (ehApp()) {
        await abrirLoginNoNavegador();
        return;
      }
      const { error } = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: origemParaOAuth()
      });
      if (error) throw error;
    } catch (error: any) {
      toast({
        title: 'Erro ao entrar com Google',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleLogin = async (data: LoginForm) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password
      });
      if (error) throw error;
      navigate('/treinar');
    } catch (error: any) {
      toast({
        title: 'Erro ao entrar',
        description: error.message === 'Invalid login credentials' ?
        'E-mail ou senha incorretos' :
        error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (data: SignupForm) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: origemParaOAuth(),
          data: {
            full_name: data.username,
            // Registro de qual versão dos termos foi aceita, e quando
            termos_aceitos: VERSAO_TERMOS,
            termos_aceitos_em: new Date().toISOString()
          }
        }
      });
      if (error) throw error;
      toast({
        title: 'Conta criada!',
        description: 'Verifique seu e-mail para confirmar sua conta.'
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao criar conta',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // No app, a tela de login feita para ele (src/components/app/LoginApp.tsx)
  if (usarLayoutDoApp()) return <LoginApp />;

  return (
    <div className="relative min-h-screen overflow-hidden bg-background flex items-center justify-center p-4 pt-16">
      <SEO
        title="Entrar ou Criar Conta — GTORei"
        description="Acesse sua conta no GTORei ou crie uma nova gratuitamente para treinar poker GTO, salvar progresso e participar do ranking."
        path="/auth"
        noindex
      />
      {/* Sem este link a tela de login era um beco: quem chegava pelo "Criar
          conta grátis" e queria reler a home só tinha o botão voltar. No app
          não há home, então ele some */}
      {!ehApp() && (
        <Link
          to="/"
          className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Início
        </Link>
      )}
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[620px] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />
      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-5 sm:mb-8">
          <div className="relative">
            {/* Ícone de 192px (23 KB) no lugar do original de 540px (145 KB): nítido até 80px em tela retina */}
            <img alt="GTORei" width={192} height={192} className="h-14 w-14 sm:h-20 sm:w-20 object-contain" src="/icon-192.png" />
          </div>
          {/* Título menor e centralizado: com 48px ele empurrava o formulário para fora da tela no celular */}
          <h1 className="text-2xl sm:text-3xl font-bold text-primary text-center text-balance mt-3 sm:mt-4">Acesse sua conta no GTORei</h1>
          <p className="text-body-md text-muted-foreground text-center">Treine seu jogo GTO</p>
        </div>

        <Card className="border-border/50 shadow-xl">
          <CardHeader className="text-center pb-2">
            <CardTitle>Bem-vindo!</CardTitle>
            <CardDescription>
              Entre ou crie sua conta para começar a treinar
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Google Sign In */}
            <Button
              variant="outline"
              className="w-full mb-6 h-12"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}>
              
              {/* G nas cores do Google, como pede a marca deles para o botão de login */}
              {googleLoading ?
              <span className="animate-spin mr-2">⏳</span> :

              <svg aria-hidden="true" className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              }
              Entrar com Google
            </Button>
            <p className="-mt-4 mb-6 text-center text-xs text-muted-foreground">
              Ao entrar com o Google pela primeira vez, você cria uma conta e aceita os{' '}
              <Link to="/termos" className="underline">Termos</Link> e a <Link to="/privacidade" className="underline">Privacidade</Link>.
            </p>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-body-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Ou continue com</span>
              </div>
            </div>

            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Criar Conta</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-4">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) =>
                      <FormItem>
                          <FormLabel>E-mail</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input {...field} type="email" placeholder="seu@email.com" className="pl-10" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      } />
                    
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) =>
                      <FormItem>
                          <FormLabel>Senha</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input
                              {...field}
                              type={showPassword ? 'text' : 'password'}
                              placeholder="••••••••"
                              className="pl-10 pr-10" />
                            
                              <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      } />
                    
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? 'Entrando...' : 'Entrar'}
                    </Button>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="signup" className="mt-4">
                <Form {...signupForm}>
                  <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
                    <FormField
                      control={signupForm.control}
                      name="username"
                      render={({ field }) =>
                      <FormItem>
                          <FormLabel>Nome de usuário</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input {...field} placeholder="Seu nome" className="pl-10" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      } />
                    
                    <FormField
                      control={signupForm.control}
                      name="email"
                      render={({ field }) =>
                      <FormItem>
                          <FormLabel>E-mail</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input {...field} type="email" placeholder="seu@email.com" className="pl-10" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      } />
                    
                    <FormField
                      control={signupForm.control}
                      name="password"
                      render={({ field }) =>
                      <FormItem>
                          <FormLabel>Senha</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input
                              {...field}
                              type={showPassword ? 'text' : 'password'}
                              placeholder="••••••••"
                              className="pl-10 pr-10" />
                            
                              <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </FormControl>
                          <p className="text-body-xs text-muted-foreground mt-1">
                            Mínimo 8 caracteres, 1 maiúscula e 1 símbolo
                          </p>
                          <FormMessage />
                        </FormItem>
                      } />
                    
                    <FormField
                      control={signupForm.control}
                      name="confirmPassword"
                      render={({ field }) =>
                      <FormItem>
                          <FormLabel>Confirmar Senha</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input
                              {...field}
                              type={showPassword ? 'text' : 'password'}
                              placeholder="••••••••"
                              className="pl-10" />
                            
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      } />
                    
                    <FormField
                      control={signupForm.control}
                      name="aceite"
                      render={({ field }) =>
                      <FormItem>
                          <div className="flex items-start gap-2">
                            <FormControl>
                              <Checkbox
                                checked={field.value === true}
                                onCheckedChange={(v) => field.onChange(v === true)}
                                className="mt-0.5" />
                            </FormControl>
                            <FormLabel className="text-sm font-normal leading-snug">
                              Li e aceito os <Link to="/termos" target="_blank" className="text-primary underline">Termos de Uso</Link> e a{' '}
                              <Link to="/privacidade" target="_blank" className="text-primary underline">Política de Privacidade</Link>. Tenho 18 anos ou mais.
                            </FormLabel>
                          </div>
                          <FormMessage />
                        </FormItem>
                      } />

                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? 'Criando conta...' : 'Criar Conta'}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>);

}