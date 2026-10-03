import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { SEO } from "@/components/seo/SEO";

// O Vercel entrega o mesmo index.html para qualquer endereço, então esta página
// responde com código 200. O noindex é o que avisa o Google de que ela não
// existe; sem ele, cada link quebrado virava uma cópia da home no índice.
const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <SEO
        title="Página não encontrada — GTORei"
        description="Este endereço não existe no GTORei."
        path={location.pathname}
        noindex
      />
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Esta página não existe.</p>
        <div className="flex flex-col items-center gap-2">
          <Link to="/" className="text-primary underline hover:text-primary/90">
            Voltar para a página inicial
          </Link>
          <Link to="/iniciante" className="text-primary underline hover:text-primary/90">
            Guia do iniciante
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
