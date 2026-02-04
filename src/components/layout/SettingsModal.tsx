import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Sun, Moon, Monitor, User, Palette, Save } from 'lucide-react';
import { getUserProfile, updateUserProfile } from '@/data/localStorage';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Theme = 'light' | 'dark' | 'system';

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const [nickname, setNickname] = useState('');
  const [theme, setTheme] = useState<Theme>('dark');
  const [screenReaderEnabled, setScreenReaderEnabled] = useState(false);

  useEffect(() => {
    const profile = getUserProfile();
    if (profile) {
      setNickname(profile.username);
    }

    // Load theme from localStorage
    const savedTheme = localStorage.getItem('gtorei_theme') as Theme | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }

    // Load screen reader preference
    const screenReader = localStorage.getItem('gtorei_screen_reader') === 'true';
    setScreenReaderEnabled(screenReader);
  }, [open]);

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

  const handleSaveProfile = () => {
    if (nickname.trim().length < 2) {
      toast({
        title: 'Nome muito curto',
        description: 'O nickname deve ter pelo menos 2 caracteres.',
        variant: 'destructive',
      });
      return;
    }

    updateUserProfile({ username: nickname.trim() });
    toast({
      title: 'Perfil atualizado!',
      description: 'Suas alterações foram salvas.',
    });
  };

  const profile = getUserProfile();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
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
                <AvatarImage src={profile?.avatar} />
                <AvatarFallback className="text-2xl bg-primary/20 text-primary">
                  {nickname.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <p className="text-xs text-muted-foreground">
                Avatar gerado automaticamente
              </p>
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

            <Button onClick={handleSaveProfile} className="w-full gap-2">
              <Save className="h-4 w-4" />
              Salvar Alterações
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
