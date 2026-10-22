import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft, BookOpen } from "lucide-react";
import { SEO } from "@/components/seo/SEO";
import { Button } from "@/components/ui/button";

// O Vercel entrega o mesmo index.html para qualquer endereço, então esta página
// responde com código 200. O noindex é o que avisa o Google de que ela não
// existe; sem ele, cada link quebrado virava uma cópia da home no índice.
const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-6">
      <SEO
        title="Página não encontrada — GTORei"
        description="Este endereço não existe no GTORei."
        path={location.pathname}
        noindex
      />
      {/* Mesmo brilho dourado do topo da home, para a página não parecer de outro site */}
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />
      <div className="relative max-w-md text-center">
        <Link to="/" className="mb-10 inline-flex items-center gap-2" aria-label="GTORei, página inicial">
          <img src="/logo-128.png" alt="" width={128} height={128} className="h-9 w-9 object-contain" />
          <span className="text-heading-sm">
            <span className="text-primary">GTO</span>
            <span>Rei</span>
          </span>
        </Link>
        <p className="text-7xl font-black tracking-tight text-primary sm:text-8xl">404</p>
        <h1 className="mt-4 text-2xl font-bold sm:text-3xl">Esta página não existe</h1>
        <p className="mt-3 text-muted-foreground">
          O endereço pode ter mudado ou foi digitado errado. Daqui dá para voltar ao início
          ou começar pelo guia do iniciante.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Página inicial
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/iniciante">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              Guia do iniciante
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
