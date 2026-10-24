import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PerfilApp } from '@/components/app/PerfilApp';
import { usarLayoutDoApp } from '@/lib/nativo/plataforma';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getLevelName } from '@/data/localStorage';
import { Camera, ImagePlus, Trash2, Upload, User } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import levelIniciante from '@/assets/levels/Iniciante.png';
import levelAmador from '@/assets/levels/Amador.png';
import levelIntermediario from '@/assets/levels/Intermediario.png';
import levelAvancado from '@/assets/levels/Avancado.png';
import levelExpert from '@/assets/levels/Expert.png';
import levelMestre from '@/assets/levels/Mestre.png';
import levelLenda from '@/assets/levels/Lenda.png';
import levelGTORei from '@/assets/levels/GTORei.png';

const LEVEL_IMAGES: Record<number, string> = {
  1: levelIniciante, 2: levelAmador, 3: levelIntermediario,
  4: levelAvancado, 5: levelExpert, 6: levelMestre, 7: levelLenda, 8: levelGTORei,
};
const getLevelFxClass = (level: number) =>
  level === 8 ? 'led-pulse' : level === 7 ? 'fire-pulse' : '';

interface ProfileData {
  user_id: string;
  username: string;
  avatar_url: string | null;
  banner_url: string | null;
  screenshot_urls: string[] | null;
  level: number;
  total_xp: number;
  hands_played: number;
  created_at: string;
}

export default function ProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { user, refreshProfile } = useAuth();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const isOwnProfile = !userId || userId === user?.id;
  const targetUserId = userId || user?.id;

  useEffect(() => {
    if (targetUserId) fetchProfile(targetUserId);
  }, [targetUserId]);

  const fetchProfile = async (uid: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url, banner_url, screenshot_urls, level, total_xp, hands_played, created_at')
        .eq('user_id', uid)
        .maybeSingle();

      if (error) throw error;
      setProfileData(data);
    } catch (e) {
      console.error('Error fetching profile:', e);
    } finally {
      setLoading(false);
    }
  };

  const uploadImage = async (file: File, path: string) => {
    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 2MB');
      return null;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Apenas imagens são permitidas');
      return null;
    }

    const ext = file.name.split('.').pop();
    const filePath = `${user!.id}/${path}-${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from('profile-images')
      .upload(filePath, file, { upsert: true });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('profile-images')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const url = await uploadImage(file, 'banner');
      if (!url) return;

      await supabase
        .from('profiles')
        .update({ banner_url: url })
        .eq('user_id', user.id);

      setProfileData(prev => prev ? { ...prev, banner_url: url } : prev);
      toast.success('Banner atualizado!');
    } catch (e) {
      toast.error('Erro ao fazer upload do banner');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !profileData) return;

    const currentScreenshots = profileData.screenshot_urls || [];
    if (currentScreenshots.length >= 4) {
      toast.error('Máximo de 4 screenshots permitido');
      return;
    }

    setUploading(true);
    try {
      const url = await uploadImage(file, `screenshot-${currentScreenshots.length}`);
      if (!url) return;

      const newScreenshots = [...currentScreenshots, url];
      await supabase
        .from('profiles')
        .update({ screenshot_urls: newScreenshots })
        .eq('user_id', user.id);

      setProfileData(prev => prev ? { ...prev, screenshot_urls: newScreenshots } : prev);
      toast.success('Screenshot adicionado!');
    } catch (e) {
      toast.error('Erro ao fazer upload do screenshot');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeScreenshot = async (index: number) => {
    if (!user || !profileData?.screenshot_urls) return;

    const newScreenshots = profileData.screenshot_urls.filter((_, i) => i !== index);

    try {
      await supabase
        .from('profiles')
        .update({ screenshot_urls: newScreenshots })
        .eq('user_id', user.id);

      setProfileData(prev => prev ? { ...prev, screenshot_urls: newScreenshots } : prev);
      toast.success('Screenshot removido');
    } catch {
      toast.error('Erro ao remover screenshot');
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full p-8">
          <p className="text-muted-foreground">Carregando perfil...</p>
        </div>
      </MainLayout>
    );
  }

  if (!profileData) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-full p-8">
          <User className="h-16 w-16 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-lg">Jogador não encontrado</p>
        </div>
      </MainLayout>
    );
  }

  const levelImg = LEVEL_IMAGES[profileData.level] || levelIniciante;

  // O mesmo perfil no app e no site (src/components/app/PerfilApp.tsx): uma
  // coluna no celular, duas na tela larga. O perfil antigo do site saiu em 24/10/2026.
  return (
    <MainLayout>
      <PerfilApp
        dados={profileData}
        proprio={isOwnProfile}
        enviando={uploading}
        imagemDoNivel={levelImg}
        onEnviarCapa={handleBannerUpload}
        onEnviarResultado={handleScreenshotUpload}
        onRemoverResultado={removeScreenshot}
      />
    </MainLayout>
  );
}
