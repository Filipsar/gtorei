import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Sun, Moon, Monitor, User, Palette, Save, Upload, Check } from 'lucide-react';
import { getUserProfile, updateUserProfile, UserProfile } from '@/data/localStorage';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Predefined avatar icons (emoji-based avatars)
const PREDEFINED_AVATARS = [
  '🃏', '♠️', '♥️', '♦️', '♣️', '👑', '🎰', '🎲', 
  '🦁', '🐺', '🦅', '🐉', '🔥', '⚡', '💎', '🌟'
];

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Theme = 'light' | 'dark' | 'system';

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const { user, refreshProfile } = useAuth();
  const [nickname, setNickname] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>('dark');
  const [screenReaderEnabled, setScreenReaderEnabled] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const profile = getUserProfile();
    if (profile) {
      setNickname(profile.username);
      if (profile.avatar) {
        // Check if it's an emoji or URL
        if (PREDEFINED_AVATARS.includes(profile.avatar)) {
          setSelectedEmoji(profile.avatar);
          setAvatarUrl(null);
        } else {
          setAvatarUrl(profile.avatar);
          setSelectedEmoji(null);
        }
      }
    }

    // Also fetch from Supabase if logged in
    if (user) {
      fetchProfile();
    }

    // Load theme from localStorage
    const savedTheme = localStorage.getItem('gtorei_theme') as Theme | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }

    // Load screen reader preference
    const screenReader = localStorage.getItem('gtorei_screen_reader') === 'true';
    setScreenReaderEnabled(screenReader);
  }, [open, user]);

  const fetchProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (data) {
      setNickname(data.username || '');
      if (data.avatar_url) {
        if (PREDEFINED_AVATARS.includes(data.avatar_url)) {
          setSelectedEmoji(data.avatar_url);
          setAvatarUrl(null);
        } else {
          setAvatarUrl(data.avatar_url);
          setSelectedEmoji(null);
        }
      }
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Arquivo inválido',
        description: 'Por favor, selecione uma imagem.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'A imagem deve ter no máximo 2MB.',
        variant: 'destructive',
      });
      return;
    }

    // Validate image dimensions (max 512x512)
    const img = new Image();
    img.src = URL.createObjectURL(file);
    const dimensionsValid = await new Promise<boolean>((resolve) => {
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        if (img.width > 512 || img.height > 512) {
          toast({
            title: 'Imagem muito grande',
            description: 'A largura e altura máximas são 512x512 pixels.',
            variant: 'destructive',
          });
          resolve(false);
        } else {
          resolve(true);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        resolve(false);
      };
    });
    if (!dimensionsValid) return;

    // Convert to base64 for local storage (simpler approach without storage bucket)
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        setAvatarUrl(base64);
        setSelectedEmoji(null);
        setUploading(false);
      };
      reader.onerror = () => {
        toast({
          title: 'Erro ao carregar imagem',
          description: 'Tente novamente.',
          variant: 'destructive',
        });
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      setUploading(false);
      toast({
        title: 'Erro ao carregar imagem',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const handleSelectEmoji = (emoji: string) => {
    setSelectedEmoji(emoji);
    setAvatarUrl(null);
  };

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('gtorei_theme', newTheme);

    const root = document.documentElement;
    root.classList.remove('light', 'dark');

    if (newTheme === 'system') {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.add(systemPrefersDark ? 'dark' : 'light');
    } else {
      root.classList.add(newTheme);
    }
  };

  const handleScreenReaderToggle = (enabled: boolean) => {
    setScreenReaderEnabled(enabled);
    localStorage.setItem('gtorei_screen_reader', enabled.toString());
    
    if (enabled) {
      toast({
        title: 'Leitor de tela ativado',
        description: 'Recursos de acessibilidade foram habilitados.',
      });
    }
  };

  const handleSaveProfile = async () => {
    if (nickname.trim().length < 2) {
      toast({
        title: 'Nome muito curto',
        description: 'O nickname deve ter pelo menos 2 caracteres.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    const newAvatar = selectedEmoji || avatarUrl || null;

    try {
      // Update local storage
      updateUserProfile({ username: nickname.trim(), avatar: newAvatar || undefined });

      // Update Supabase if logged in
      if (user) {
        const { error } = await supabase
          .from('profiles')
          .update({ 
            username: nickname.trim(),
            avatar_url: newAvatar
          })
          .eq('user_id', user.id);

        if (error) throw error;

        // Refresh the profile in AuthContext
        await refreshProfile();
      }

      toast({
        title: 'Perfil atualizado!',
        description: 'Suas alterações foram salvas.',
      });
      
      // Close modal after successful save
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const profile = getUserProfile();
  const displayAvatar = selectedEmoji || avatarUrl || profile?.avatar;
  const isEmojiAvatar = selectedEmoji || (displayAvatar && PREDEFINED_AVATARS.includes(displayAvatar));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurações</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="profile" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              Perfil
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-2">
              <Palette className="h-4 w-4" />
              Aparência
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4 mt-4">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-4">
              <Avatar className="h-20 w-20">
                {isEmojiAvatar ? (
                  <AvatarFallback className="text-3xl bg-primary/20">
                    {selectedEmoji || displayAvatar}
                  </AvatarFallback>
                ) : (
                  <>
                    <AvatarImage src={displayAvatar || undefined} />
                    <AvatarFallback className="text-2xl bg-primary/20 text-primary">
                      {nickname.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </>
                )}
              </Avatar>
              
              {/* Upload button */}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild disabled={uploading}>
                  <label className="cursor-pointer">
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? 'Carregando...' : 'Enviar foto'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={uploading}
                    />
                  </label>
                </Button>
              </div>
            </div>

            {/* Predefined avatars */}
            <div className="space-y-2">
              <Label>Ou escolha um ícone</Label>
              <div className="grid grid-cols-8 gap-2">
                {PREDEFINED_AVATARS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleSelectEmoji(emoji)}
                    className={cn(
                      'h-10 w-10 rounded-lg flex items-center justify-center text-xl transition-all',
                      'hover:bg-primary/20 hover:scale-110',
                      selectedEmoji === emoji && 'bg-primary/30 ring-2 ring-primary'
                    )}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Nickname */}
            <div className="space-y-2">
              <Label htmlFor="nickname">Nickname</Label>
              <Input
                id="nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Seu nome de jogador"
                maxLength={20}
              />
            </div>

            <Button onClick={handleSaveProfile} className="w-full gap-2" disabled={saving}>
              {saving ? (
                <>Salvando...</>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="appearance" className="space-y-4 mt-4">
            {/* Theme */}
            <div className="space-y-3">
              <Label>Tema</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={theme === 'light' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleThemeChange('light')}
                  className={cn('flex-col h-auto py-3 gap-1', theme === 'light' && 'bg-primary text-primary-foreground')}
                >
                  <Sun className="h-5 w-5" />
                  <span className="text-xs">Claro</span>
                </Button>
                <Button
                  variant={theme === 'dark' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleThemeChange('dark')}
                  className={cn('flex-col h-auto py-3 gap-1', theme === 'dark' && 'bg-primary text-primary-foreground')}
                >
                  <Moon className="h-5 w-5" />
                  <span className="text-xs">Escuro</span>
                </Button>
                <Button
                  variant={theme === 'system' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleThemeChange('system')}
                  className={cn('flex-col h-auto py-3 gap-1', theme === 'system' && 'bg-primary text-primary-foreground')}
                >
                  <Monitor className="h-5 w-5" />
                  <span className="text-xs">Sistema</span>
                </Button>
              </div>
            </div>

            {/* Screen Reader */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div>
                <p className="font-medium text-sm">Leitor de Tela</p>
                <p className="text-xs text-muted-foreground">
                  Ativar recursos de acessibilidade
                </p>
              </div>
              <Switch
                checked={screenReaderEnabled}
                onCheckedChange={handleScreenReaderToggle}
              />
            </div>

            <p className="text-xs text-muted-foreground text-center pt-2">
              O GTORei usa por padrão o tema escuro otimizado para longas sessões de estudo.
            </p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
