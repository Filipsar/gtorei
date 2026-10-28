import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { passosDoTour, tour, usePassoDoTour } from '@/lib/tour';
import { cn } from '@/lib/utils';

/**
 * Cartão do tour, montado uma vez no App (o MainLayout remonta a cada página).
 * Não cobre a tela: a ideia é ver a página que o rei está explicando. Fica
 * embaixo, à direita no computador e acima das abas no app.
 */
export function TourGuiado() {
  const indice = usePassoDoTour();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const tituloRef = useRef<HTMLHeadingElement>(null);
  const passos = passosDoTour();
  const passo = indice !== null ? passos[indice] : null;

  // Leva até a página do passo
  useEffect(() => {
    if (passo && location.pathname !== passo.rota) navigate(passo.rota);
    // só quando o passo muda: se a pessoa clicar em outra página, o tour não a puxa de volta
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indice]);

  // Leitor de tela anuncia o passo novo
  useEffect(() => {
    if (passo) tituloRef.current?.focus();
  }, [passo]);

  useEffect(() => {
    if (!passo) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') tour.encerrar();
    };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [passo]);

  // Saiu da conta no meio: o tour acaba
  useEffect(() => {
    if (indice !== null && !user) tour.encerrar();
  }, [indice, user]);

  if (!passo || indice === null || !user) return null;
  const ultimo = indice === passos.length - 1;

  return (
    <section
      aria-label="Tour do GTORei"
      // pointer-events-auto: pop-up do Radix aberto deixa o body sem clique
      className={cn(
        'pointer-events-auto fixed z-[95] right-3 left-3 sm:left-auto sm:right-6 sm:w-[380px]',
        'animate-in fade-in slide-in-from-bottom-4 duration-300',
      )}
      style={{ bottom: 'calc(var(--altura-abas, 0px) + var(--altura-anuncio, 0px) + 12px)' }}
    >
      <div className="relative rounded-2xl border border-primary/40 bg-card/95 p-4 pt-5 pl-[108px] shadow-2xl backdrop-blur">
        <img
          key={passo.rei}
          src={`/mascote/${passo.rei}.webp`}
          alt=""
          aria-hidden="true"
          className="absolute -top-8 left-2 h-[118px] w-[96px] object-contain object-bottom drop-shadow-xl motion-safe:animate-rei-sobe"
        />
        <button
          onClick={tour.encerrar}
          aria-label="Sair do tour"
          className="absolute right-2 top-2 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <p className="text-xs font-medium text-primary">
          Tour · {indice + 1} de {passos.length}
        </p>
        <h2 ref={tituloRef} tabIndex={-1} className="mt-0.5 pr-6 text-base font-bold text-foreground focus:outline-none">
          {passo.titulo}
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{passo.texto}</p>

        <div className="mt-3 flex items-center justify-end gap-2 sm:justify-between">
          {/* No celular não cabem junto dos botões; o "3 de 7" já diz o mesmo */}
          <div className="hidden gap-1 sm:flex" aria-hidden="true">
            {passos.map((_, i) => (
              <span
                key={i}
                className={cn('h-1.5 rounded-full transition-all', i === indice ? 'w-4 bg-primary' : 'w-1.5 bg-muted-foreground/30')}
              />
            ))}
          </div>
          <div className="flex gap-1.5">
            {indice > 0 && (
              <Button variant="ghost" size="sm" onClick={tour.voltar} className="gap-1 px-2">
                <ChevronLeft className="h-4 w-4" />
                Voltar
              </Button>
            )}
            <Button size="sm" onClick={tour.avancar} className="gap-1">
              {ultimo ? 'Concluir' : 'Próximo'}
              {!ultimo && <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
