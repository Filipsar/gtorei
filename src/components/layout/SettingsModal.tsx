import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Sun, Moon, Monitor, User, Palette, Save, Upload, Lock, BookOpen, Globe } from 'lucide-react';
import { getUserProfile, updateUserProfile } from '@/data/localStorage';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage, type Language } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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
  const { t, language, setLanguage } = useLanguage();
  const [nickname, setNickname] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>('dark');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const profile = getUserProfile();
    if (profile) {
      setNickname(profile.username);
      if (profile.avatar) {
        if (PREDEFINED_AVATARS.includes(profile.avatar)) {
          setSelectedEmoji(profile.avatar);
          setAvatarUrl(null);
        } else {
          setAvatarUrl(profile.avatar);
          setSelectedEmoji(null);
        }
      }
    }
    if (user) fetchProfile();

    const savedTheme = localStorage.getItem('gtorei_theme') as Theme | null;
    if (savedTheme) setTheme(savedTheme);
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
    if (!file.type.startsWith('image/')) {
      toast({ title: t.settings.invalidFile, description: t.settings.selectImage, variant: 'destructive' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: t.settings.fileTooLarge, description: t.settings.maxFileSize, variant: 'destructive' });
      return;
    }
    const img = new Image();
    img.src = URL.createObjectURL(file);
    const dimensionsValid = await new Promise<boolean>((resolve) => {
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        if (img.width > 512 || img.height > 512) {
          toast({ title: t.settings.imageTooLarge, description: t.settings.maxDimensions, variant: 'destructive' });
          resolve(false);
        } else resolve(true);
      };
      img.onerror = () => { URL.revokeObjectURL(img.src); resolve(false); };
    });
    if (!dimensionsValid) return;

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = (e) => { setAvatarUrl(e.target?.result as string); setSelectedEmoji(null); setUploading(false); };
      reader.onerror = () => { toast({ title: t.settings.uploadError, description: t.settings.tryAgain, variant: 'destructive' }); setUploading(false); };
      reader.readAsDataURL(file);
    } catch {
      setUploading(false);
      toast({ title: t.settings.uploadError, description: t.settings.tryAgain, variant: 'destructive' });
    }
  };

  const handleSelectEmoji = (emoji: string) => { setSelectedEmoji(emoji); setAvatarUrl(null); };

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('gtorei_theme', newTheme);
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    if (newTheme === 'system') {
      root.classList.add(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    } else root.classList.add(newTheme);
  };

  const handleSaveProfile = async () => {
    if (nickname.trim().length < 2) {
      toast({ title: t.settings.nameTooShort, description: t.settings.minChars, variant: 'destructive' });
      return;
    }
    setSaving(true);
    const newAvatar = selectedEmoji || avatarUrl || null;
    try {
      updateUserProfile({ username: nickname.trim(), avatar: newAvatar || undefined });
      if (user) {
        const { error } = await supabase.from('profiles').update({ username: nickname.trim(), avatar_url: newAvatar }).eq('user_id', user.id);
        if (error) throw error;
        await refreshProfile();
      }
      toast({ title: t.settings.profileUpdated, description: t.settings.changesSaved });
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({ title: t.settings.saveError, description: t.settings.tryAgain, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const profile = getUserProfile();
  const displayAvatar = selectedEmoji || avatarUrl || profile?.avatar;
  const isEmojiAvatar = selectedEmoji || (displayAvatar && PREDEFINED_AVATARS.includes(displayAvatar));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.settings.title}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="profile" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              {t.settings.profileTab}
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-2">
              <Palette className="h-4 w-4" />
              {t.settings.appearanceTab}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4 mt-4">
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
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild disabled={uploading}>
                  <label className="cursor-pointer">
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? t.settings.uploading : t.settings.uploadPhoto}
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                  </label>
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t.settings.orChooseIcon}</Label>
              <div className="grid grid-cols-8 gap-2">
                {PREDEFINED_AVATARS.map((emoji) => (
                  <button key={emoji} type="button" onClick={() => handleSelectEmoji(emoji)}
                    className={cn('h-10 w-10 rounded-lg flex items-center justify-center text-xl transition-all hover:bg-primary/20 hover:scale-110', selectedEmoji === emoji && 'bg-primary/30 ring-2 ring-primary')}>
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nickname">{t.settings.nickname}</Label>
              <Input id="nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder={t.settings.nicknamePlaceholder} maxLength={20} />
            </div>

            <Button onClick={handleSaveProfile} className="w-full gap-2" disabled={saving}>
              {saving ? t.settings.saving : <><Save className="h-4 w-4" />{t.settings.saveChanges}</>}
            </Button>
          </TabsContent>

          <TabsContent value="appearance" className="space-y-4 mt-4">
            {/* Theme */}
            <div className="space-y-3">
              <Label>{t.settings.theme}</Label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { key: 'light' as Theme, icon: Sun, label: t.settings.light },
                  { key: 'dark' as Theme, icon: Moon, label: t.settings.dark },
                  { key: 'system' as Theme, icon: Monitor, label: t.settings.system },
                ]).map(({ key, icon: Icon, label }) => (
                  <Button key={key} variant={theme === key ? 'default' : 'outline'} size="sm" onClick={() => handleThemeChange(key)}
                    className={cn('flex-col h-auto py-3 gap-1', theme === key && 'bg-primary text-primary-foreground')}>
                    <Icon className="h-5 w-5" />
                    <span className="text-xs">{label}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Language selector */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                {t.settings.language}
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Button variant={language === 'pt' ? 'default' : 'outline'} size="sm" onClick={() => setLanguage('pt')}
                  className={cn('flex items-center gap-2 h-auto py-3', language === 'pt' && 'bg-primary text-primary-foreground')}>
                  <span className="text-lg">🇧🇷</span>
                  <span className="text-xs">{t.settings.portuguese}</span>
                </Button>
                <Button variant={language === 'en' ? 'default' : 'outline'} size="sm" onClick={() => setLanguage('en')}
                  className={cn('flex items-center gap-2 h-auto py-3', language === 'en' && 'bg-primary text-primary-foreground')}>
                  <span className="text-lg">🇺🇸</span>
                  <span className="text-xs">{t.settings.english}</span>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{t.settings.languageNote}</p>
            </div>

            {/* Screen Reader - locked */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 opacity-60">
              <div>
                <p className="font-medium text-sm flex items-center gap-2">
                  {t.settings.screenReader}
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                </p>
                <p className="text-xs text-muted-foreground">{t.settings.underMaintenance}</p>
              </div>
              <Switch checked={false} disabled />
            </div>

            {/* Replay onboarding */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div>
                <p className="font-medium text-sm flex items-center gap-2">
                  <BookOpen className="h-3.5 w-3.5 text-primary" />
                  {t.settings.onboardingTutorial}
                </p>
                <p className="text-xs text-muted-foreground">{t.settings.onboardingDesc}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => {
                localStorage.removeItem('gtorei_onboarding_completed_v2');
                onOpenChange(false);
                window.location.href = '/treinar';
              }}>
                {t.settings.review}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center pt-2">{t.settings.themeNote}</p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
