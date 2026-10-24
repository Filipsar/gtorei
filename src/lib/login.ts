// Regras dos formulários de entrar e de criar conta. Site (AuthPage) e app
// (LoginApp) usam as mesmas: senha, nome e o aceite dos termos não podem
// divergir entre os dois.

import { z } from 'zod';

// Senha: no mínimo 8 caracteres, 1 maiúscula e 1 símbolo
export const senhaSchema = z
  .string()
  .min(8, 'A senha deve ter no mínimo 8 caracteres')
  .regex(/[A-Z]/, 'A senha deve conter pelo menos uma letra maiúscula')
  .regex(/[!@#$%^&*(),.?":{}|<>]/, 'A senha deve conter pelo menos um símbolo');

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
});

export const signupSchema = z
  .object({
    username: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres').max(20, 'Nome deve ter no máximo 20 caracteres'),
    email: z.string().email('E-mail inválido'),
    password: senhaSchema,
    confirmPassword: z.string(),
    // Consentimento explícito: caixa desmarcada, obrigatória, só para Termos e
    // Privacidade. Nada de marketing embutido no cadastro.
    aceite: z.literal(true, {
      errorMap: () => ({ message: 'Para criar a conta, aceite os Termos e a Política de Privacidade' }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });

export type LoginForm = z.infer<typeof loginSchema>;
export type SignupForm = z.infer<typeof signupSchema>;

/** Mensagem do Supabase traduzida para o que a pessoa entende */
export function erroDeLogin(mensagem: string): string {
  if (mensagem === 'Invalid login credentials') return 'E-mail ou senha incorretos';
  if (/Email not confirmed/i.test(mensagem)) return 'Confirme o e-mail antes de entrar: o link está na sua caixa de entrada';
  if (/already registered/i.test(mensagem)) return 'Esse e-mail já tem conta. Use a aba Entrar';
  return mensagem;
}
