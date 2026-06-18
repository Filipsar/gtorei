import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
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
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const screenshotInputRef = useRef<HTMLInputElement>(null);

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
      if (bannerInputRef.current) bannerInputRef.current.value = '';
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
      if (screenshotInputRef.current) screenshotInputRef.current.value = '';
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

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto pb-8">
        {/* Banner */}
        <div className="relative h-48 sm:h-64 bg-muted overflow-hidden rounded-b-2xl">
          {profileData.banner_url ? (
            <img
              src={profileData.banner_url}
              alt="Banner"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20" />
          )}
          {isOwnProfile && (
            <>
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleBannerUpload}
              />
              <Button
                size="sm"
                variant="secondary"
                className="absolute bottom-3 right-3 gap-2"
                onClick={() => bannerInputRef.current?.click()}
                disabled={uploading}
              >
                <Camera className="h-4 w-4" />
                {profileData.banner_url ? 'Trocar Banner' : 'Adicionar Banner'}
              </Button>
            </>
          )}
        </div>

        {/* Profile Info */}
        <div className="px-4 sm:px-6 -mt-16 relative z-10">
          <div className="flex items-end gap-4">
            <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-background">
              <AvatarImage src={profileData.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/20 text-primary text-3xl">
                {profileData.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="pb-2">
              <div className="flex items-center gap-2">
                <h1 className="text-heading-md text-foreground">{profileData.username}</h1>
                {isOwnProfile && <Badge variant="outline">Você</Badge>}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <img src={levelImg} alt="" className="w-6 h-6 object-contain" />
                <span className="text-muted-foreground">{getLevelName(profileData.level)}</span>
                <span className="text-muted-foreground">•</span>
                <span className="text-primary font-semibold">{profileData.total_xp} XP</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-primary">{profileData.hands_played}</p>
                <p className="text-body-xs text-muted-foreground">Mãos Jogadas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-primary">{profileData.total_xp}</p>
                <p className="text-body-xs text-muted-foreground">XP Total</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-primary">{profileData.level}</p>
                <p className="text-body-xs text-muted-foreground">Nível</p>
              </CardContent>
            </Card>
          </div>

          {/* Screenshots */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-heading-xs text-foreground">Resultados</h2>
              {isOwnProfile && (profileData.screenshot_urls || []).length < 4 && (
                <>
                  <input
                    ref={screenshotInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleScreenshotUpload}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    onClick={() => screenshotInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <ImagePlus className="h-4 w-4" />
                    Adicionar ({(profileData.screenshot_urls || []).length}/4)
                  </Button>
                </>
              )}
            </div>

            {(profileData.screenshot_urls || []).length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <ImagePlus className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">
                    {isOwnProfile
                      ? 'Adicione screenshots dos seus resultados de poker!'
                      : 'Nenhum resultado compartilhado ainda.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(profileData.screenshot_urls || []).map((url, i) => (
                  <div key={i} className="relative group rounded-xl overflow-hidden border border-border">
                    <img
                      src={url}
                      alt={`Resultado ${i + 1}`}
                      className="w-full h-48 object-cover"
                    />
                    {isOwnProfile && (
                      <Button
                        size="icon"
                        variant="destructive"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                        onClick={() => removeScreenshot(i)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
