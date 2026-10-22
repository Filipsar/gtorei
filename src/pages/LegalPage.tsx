import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { SEO } from '@/components/seo/SEO';
import { CONTATO_EMAIL, CONTROLADOR, VIGENCIA } from '@/data/legal';
import { abrirPreferenciasDePrivacidade } from '@/lib/consentimento';

export type DocLegal = 'privacidade' | 'termos' | 'reembolso' | 'cookies';

// Políticas do GTORei. O texto descreve o que o código faz de verdade
// (conferido em 22/10/2026). Ao mudar coleta de dados, SDK ou cobrança, mudar
// aqui também e atualizar VIGENCIA em src/data/legal.ts.

const Pendente = ({ children }: { children: ReactNode }) => (
  <mark className="rounded bg-destructive/15 px-1 text-destructive">[{children}]</mark>
);

const quem = () => (CONTROLADOR ? <strong>{CONTROLADOR}</strong> : <Pendente>definir o responsável em src/data/legal.ts</Pendente>);
const contato = () =>
  CONTATO_EMAIL ? (
    <a href={`mailto:${CONTATO_EMAIL}`} className="text-primary underline">
      {CONTATO_EMAIL}
    </a>
  ) : (
    <Pendente>definir o e-mail de contato em src/data/legal.ts</Pendente>
  );

const H2 = ({ children }: { children: ReactNode }) => <h2 className="mt-8 mb-2 text-lg font-semibold">{children}</h2>;

const DOCS: Record<DocLegal, { titulo: string; descricao: string; corpo: () => ReactNode }> = {
  privacidade: {
    titulo: 'Política de Privacidade',
    descricao: 'Quais dados o GTORei coleta, para quê, com quem compartilha e como exercer seus direitos (LGPD).',
    corpo: () => (
      <>
        <p>
          Esta política explica como o GTORei (site gtorei.com.br e app Android) trata dados pessoais, conforme a Lei
          Geral de Proteção de Dados (Lei 13.709/2018). O controlador é {quem()}. Contato para assuntos de privacidade:{' '}
          {contato()}.
        </p>

        <H2>1. Dados que coletamos</H2>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Conta:</strong> e-mail, senha (guardada cifrada pelo provedor de login) ou login do Google, apelido e avatar.</li>
          <li><strong>Treino:</strong> mãos jogadas, decisões, acertos, XP, nível, sessões, favoritos, conquistas e desafios.</li>
          <li><strong>Comunidade:</strong> posts, comentários, reações e imagens que você envia ao perfil.</li>
          <li><strong>Indicação:</strong> quem convidou quem e se o convite foi validado. Quem convidou vê só o seu apelido e o seu progresso até 50 mãos.</li>
          <li><strong>Análise por IA:</strong> o hand history que você envia. Antes do envio, os apelidos dos outros jogadores são trocados por "Vilão 1", "Vilão 2" etc.</li>
          <li><strong>Compras (app):</strong> o comprovante da compra do PRO no Google Play (token e número do pedido). Não recebemos dados de cartão.</li>
          <li><strong>Anúncios (só no app grátis):</strong> o Google AdMob usa o ID de publicidade do aparelho e dados técnicos para mostrar e medir anúncios.</li>
        </ul>
        <p className="mt-2">
          Não coletamos localização, contatos, modelo do aparelho para fins de perfil, nem compramos dados de terceiros.
          O site não usa ferramentas de análise ou remarketing.
        </p>

        <H2>2. Para que usamos e com que base legal</H2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Criar e manter a conta, salvar o progresso, ranking, conquistas, desafios e indicação: <em>execução do contrato</em> (art. 7º, V).</li>
          <li>Liberar o PRO e cumprir obrigações fiscais e de consumo: <em>execução do contrato</em> e <em>obrigação legal</em> (art. 7º, II e V).</li>
          <li>Segurança, prevenção de fraude (por exemplo, indicações falsas) e limites de uso: <em>legítimo interesse</em> (art. 7º, IX).</li>
          <li>Anúncios personalizados no app: <em>consentimento</em> (art. 7º, I), que você pode negar ou retirar a qualquer momento. Sem ele, o app mostra só anúncios não personalizados.</li>
        </ul>

        <H2>3. Com quem compartilhamos</H2>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Supabase</strong> (banco de dados e login) e <strong>Lovable</strong> (hospedagem do banco e login com Google).</li>
          <li><strong>Vercel</strong> (hospedagem do site).</li>
          <li><strong>Google</strong>: login com Google, Gemini (análise por IA, só quando você pede), Google Play (compras) e AdMob (anúncios no app).</li>
        </ul>
        <p className="mt-2">
          Esses serviços podem guardar dados fora do Brasil, com as garantias do art. 33 da LGPD. Não vendemos dados pessoais.
          A lista técnica completa fica em docs/SDKS-E-DADOS.md, no repositório do projeto.
        </p>

        <H2>4. Quanto tempo guardamos</H2>
        <p>
          Enquanto a conta existir. O código de identificação de cada mão é apagado em 7 dias. Ao excluir a conta, os dados
          são apagados na hora, exceto o que a lei obriga a guardar (registros de compra).
        </p>

        <H2>5. Seus direitos</H2>
        <p>
          Você pode pedir confirmação, acesso, correção, portabilidade, anonimização ou exclusão dos seus dados, e retirar
          consentimentos (art. 18). A exclusão é imediata em{' '}
          <Link to="/excluir-conta" className="text-primary underline">gtorei.com.br/excluir-conta</Link>. Os demais
          pedidos, por {contato()}; respondemos em até 15 dias. Você também pode reclamar à ANPD.
        </p>

        <H2>6. Menores de idade</H2>
        <p>O GTORei é para maiores de 18 anos. Se soubermos de uma conta de menor, ela será excluída.</p>
      </>
    ),
  },

  termos: {
    titulo: 'Termos de Uso',
    descricao: 'Regras de uso do GTORei: conta, conduta, PRO, conteúdo e limites de responsabilidade.',
    corpo: () => (
      <>
        <p>Ao criar uma conta no GTORei você aceita estes termos e a <Link to="/privacidade" className="text-primary underline">Política de Privacidade</Link>. Responsável: {quem()}.</p>
        <H2>1. O que é o GTORei</H2>
        <p>
          Uma ferramenta de estudo de poker. As ranges são calculadas pelo motor do próprio GTORei, por valor esperado
          (EV), e servem como referência educacional. O GTORei não é casa de apostas, não envolve dinheiro real em jogo
          e não garante resultado em mesas reais.
        </p>
        <p className="mt-2">
          A dificuldade do treino aparece na tela e pode ser escolhida. Ela muda só quais mãos são sorteadas (mais ou
          menos decisões apertadas) e o multiplicador de XP ganho, mostrado junto. A resposta certa de cada mão é a mesma
          em qualquer dificuldade, e nada fora do seu acerto no treino influencia o modo automático.
        </p>
        <H2>2. Conta</H2>
        <p>Você precisa ter 18 anos ou mais, usar dados verdadeiros e cuidar da sua senha. Uma pessoa, uma conta.</p>
        <H2>3. Conduta</H2>
        <p>
          É proibido: burlar o sistema de pontuação, ranking, desafios ou indicação (incluindo contas falsas), publicar
          conteúdo ilegal, ofensivo ou de terceiros sem direito, e sobrecarregar o serviço. Podemos remover conteúdo,
          anular XP ou indicações obtidos por fraude e suspender contas que violem estas regras.
        </p>
        <H2>4. Grátis, apoio e PRO</H2>
        <p>
          O treino principal é grátis. Alguns modos são liberados para apoiadores (apoio por Pix no site) e para quem
          compra o PRO no app Android (compra única pelo Google Play, sem renovação automática). O preço aparece antes da
          compra. O app grátis mostra anúncios; o PRO os remove. Reembolsos seguem a{' '}
          <Link to="/reembolso" className="text-primary underline">Política de Reembolso</Link>.
        </p>
        <H2>5. Programa de indicação</H2>
        <p>
          Indicações valem quando a conta convidada é nova e treina 50 mãos em até 30 dias. Os níveis dão XP e
          conquistas. Qualquer prêmio em dinheiro só existirá com regulamento próprio, publicado à parte.
        </p>
        <H2>6. Responsabilidade</H2>
        <p>
          O serviço é oferecido como está, e pode ter interrupções. Decisões em mesas reais são de responsabilidade de
          quem joga. Nada aqui afasta direitos do Código de Defesa do Consumidor.
        </p>
        <H2>7. Mudanças</H2>
        <p>Mudanças relevantes nestes termos serão avisadas no site. Dúvidas: {contato()}.</p>
      </>
    ),
  },

  reembolso: {
    titulo: 'Política de Reembolso',
    descricao: 'Como pedir reembolso do PRO comprado no Google Play e do apoio por Pix.',
    corpo: () => (
      <>
        <H2>PRO comprado no app (Google Play)</H2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Até 48 horas depois da compra: peça direto ao Google em play.google.com, em Pedidos.</li>
          <li>Até 7 dias depois da compra (direito de arrependimento, art. 49 do CDC): peça por {contato()} com o número do pedido (GPA.…). Reembolsamos o valor integral.</li>
          <li>Depois de 7 dias: analisamos caso a caso, por exemplo se o PRO não funcionar.</li>
        </ul>
        <p className="mt-2">Com o reembolso, o acesso PRO é retirado da conta.</p>
        <H2>Apoio por Pix (site)</H2>
        <p>
          O apoio é voluntário. Mesmo assim, se você pedir em até 7 dias por {contato()}, devolvemos o valor pelo mesmo
          Pix e o acesso de apoiador é retirado.
        </p>
        <H2>O que não é cobrado</H2>
        <p>Não há assinatura, renovação automática, taxa escondida nem cobrança para cancelar ou excluir a conta.</p>
      </>
    ),
  },

  cookies: {
    titulo: 'Política de Cookies',
    descricao: 'O que o GTORei guarda no seu navegador e no app, e como escolher.',
    corpo: () => (
      <>
        <p>
          O site do GTORei <strong>não usa cookies de publicidade, de análise ou de rastreamento</strong>. Ele guarda no
          navegador (armazenamento local) só o necessário para funcionar:
        </p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li><strong>Sessão de login</strong> (Supabase): mantém você conectado.</li>
          <li><strong>Preferências</strong>: tema, idioma, seções do menu, avisos já fechados, tutorial visto e a dificuldade do treino (com o acerto das últimas 20 mãos, usado só pelo modo automático).</li>
          <li><strong>Convite</strong>: o código do link de indicação, por até 30 dias, até a conta ser criada.</li>
          <li><strong>Sua escolha sobre esta política.</strong></li>
        </ul>
        <p className="mt-2">Por serem necessários, esses itens não pedem consentimento (LGPD, art. 7º, V). Você pode apagá-los limpando os dados do site no navegador; isso desconecta a conta.</p>
        <H2>No app Android grátis</H2>
        <p>
          O Google AdMob usa o ID de publicidade do aparelho. Anúncios <strong>personalizados</strong> só com o seu
          consentimento; sem ele, os anúncios continuam, mas não personalizados. Você muda a escolha quando quiser.
        </p>
        <button
          type="button"
          onClick={abrirPreferenciasDePrivacidade}
          className="mt-3 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Abrir preferências de privacidade
        </button>
      </>
    ),
  },
};

export default function LegalPage({ doc }: { doc: DocLegal }) {
  const d = DOCS[doc];
  return (
    <div className="min-h-screen bg-background">
      <SEO title={`${d.titulo} — GTORei`} description={d.descricao} path={`/${doc}`} />
      <main className="mx-auto max-w-2xl px-5 py-10 text-sm leading-relaxed text-foreground/90">
        <Link to="/" className="mb-6 inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Início
        </Link>
        <h1 className="text-2xl font-bold text-foreground">{d.titulo}</h1>
        <p className="mt-1 text-muted-foreground">Em vigor desde {VIGENCIA}.</p>
        <div className="mt-6">{d.corpo()}</div>
        <nav aria-label="Outras políticas" className="mt-10 flex flex-wrap gap-x-4 gap-y-2 border-t border-border pt-4 text-muted-foreground">
          {(Object.keys(DOCS) as DocLegal[])
            .filter((k) => k !== doc)
            .map((k) => (
              <Link key={k} to={`/${k}`} className="hover:text-foreground underline-offset-4 hover:underline">
                {DOCS[k].titulo}
              </Link>
            ))}
          <Link to="/excluir-conta" className="hover:text-foreground underline-offset-4 hover:underline">Excluir conta</Link>
        </nav>
      </main>
    </div>
  );
}
