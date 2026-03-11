import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import HomePage from "./pages/HomePage";
import DonatePage from "./pages/DonatePage";
import TrainPage from "./pages/TrainPage";
import TablesPage from "./pages/TablesPage";
import AnalysisPage from "./pages/AnalysisPage";
import AutoAnalysisPage from "./pages/AutoAnalysisPage";
import FavoritesPage from "./pages/FavoritesPage";
import AccessibilityPage from "./pages/AccessibilityPage";
import UpdatesPage from "./pages/UpdatesPage";
import AuthPage from "./pages/AuthPage";
import RankingPage from "./pages/RankingPage";
import AchievementsPage from "./pages/AchievementsPage";
import ProfilePage from "./pages/ProfilePage";
import SearchPage from "./pages/SearchPage";
import CommunityPage from "./pages/CommunityPage";
import BeginnerGuidePage from "./pages/BeginnerGuidePage";
import AdminPage from "./pages/AdminPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
           <LanguageProvider>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/apoiar" element={<DonatePage />} />
            <Route path="/treinar" element={<ProtectedRoute><TrainPage /></ProtectedRoute>} />
            <Route path="/tabelas" element={<ProtectedRoute><TablesPage /></ProtectedRoute>} />
            <Route path="/analise" element={<ProtectedRoute><AnalysisPage /></ProtectedRoute>} />
            <Route path="/autoanalise" element={<ProtectedRoute><AutoAnalysisPage /></ProtectedRoute>} />
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
          </LanguageProvider>
        </AuthProvider>
      </BrowserRouter>
  </QueryClientProvider>
);

export default App;
