import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { lazyPage } from "@/lib/lazyPage";
// A home entra direto no pacote principal: é a primeira tela de quem chega
// pelo Google e a que conta na nota de velocidade. O resto carrega sob demanda.
import HomePage from "./pages/HomePage";
import NotFound from "./pages/NotFound";

const DonatePage = lazyPage(() => import("./pages/DonatePage"));
const TrainPage = lazyPage(() => import("./pages/TrainPage"));
const TablesPage = lazyPage(() => import("./pages/TablesPage"));
const AnalysisPage = lazyPage(() => import("./pages/AnalysisPage"));
const AutoAnalysisPage = lazyPage(() => import("./pages/AutoAnalysisPage"));
const AIAnalysisPage = lazyPage(() => import("./pages/AIAnalysisPage"));
const FavoritesPage = lazyPage(() => import("./pages/FavoritesPage"));
const AccessibilityPage = lazyPage(() => import("./pages/AccessibilityPage"));
const UpdatesPage = lazyPage(() => import("./pages/UpdatesPage"));
const AuthPage = lazyPage(() => import("./pages/AuthPage"));
const RankingPage = lazyPage(() => import("./pages/RankingPage"));
const AchievementsPage = lazyPage(() => import("./pages/AchievementsPage"));
const ProfilePage = lazyPage(() => import("./pages/ProfilePage"));
const SearchPage = lazyPage(() => import("./pages/SearchPage"));
const CommunityPage = lazyPage(() => import("./pages/CommunityPage"));
const BeginnerGuidePage = lazyPage(() => import("./pages/BeginnerGuidePage"));
const AdminPage = lazyPage(() => import("./pages/AdminPage"));

const PageLoading = () => (
  <div className="flex min-h-screen items-center justify-center" role="status" aria-label="Carregando">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
           <LanguageProvider>
          <Suspense fallback={<PageLoading />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/apoiar" element={<DonatePage />} />
            <Route path="/treinar" element={<ProtectedRoute><TrainPage /></ProtectedRoute>} />
            <Route path="/tabelas" element={<ProtectedRoute><TablesPage /></ProtectedRoute>} />
            <Route path="/analise" element={<ProtectedRoute><AnalysisPage /></ProtectedRoute>} />
            <Route path="/autoanalise" element={<ProtectedRoute><AutoAnalysisPage /></ProtectedRoute>} />
            <Route path="/analise-ia" element={<ProtectedRoute><AIAnalysisPage /></ProtectedRoute>} />
            <Route path="/favoritos" element={<ProtectedRoute><FavoritesPage /></ProtectedRoute>} />
            <Route path="/ranking" element={<ProtectedRoute><RankingPage /></ProtectedRoute>} />
            <Route path="/conquistas" element={<ProtectedRoute><AchievementsPage /></ProtectedRoute>} />
            <Route path="/perfil" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/perfil/:userId" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/buscar" element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />
            <Route path="/comunidade" element={<ProtectedRoute><CommunityPage /></ProtectedRoute>} />
            <Route path="/iniciante" element={<BeginnerGuidePage />} />
            <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
            <Route path="/gtoreiacessibilidade" element={<AccessibilityPage />} />
            <Route path="/atualizacoes" element={<UpdatesPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          </LanguageProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
