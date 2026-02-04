import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import DonatePage from "./pages/DonatePage";
import TrainPage from "./pages/TrainPage";
import TablesPage from "./pages/TablesPage";
import AnalysisPage from "./pages/AnalysisPage";
import AutoAnalysisPage from "./pages/AutoAnalysisPage";
import FavoritesPage from "./pages/FavoritesPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/apoiar" element={<DonatePage />} />
          <Route path="/treinar" element={<TrainPage />} />
          <Route path="/tabelas" element={<TablesPage />} />
          <Route path="/analise" element={<AnalysisPage />} />
          <Route path="/autoanalise" element={<AutoAnalysisPage />} />
          <Route path="/favoritos" element={<FavoritesPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
