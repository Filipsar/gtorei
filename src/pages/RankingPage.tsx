 import { useState, useEffect } from 'react';
 import { MainLayout } from '@/components/layout/MainLayout';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
 import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
 import { Badge } from '@/components/ui/badge';
 import { supabase } from '@/integrations/supabase/client';
 import { useAuth } from '@/contexts/AuthContext';
 import { Trophy, Medal, Award, TrendingUp, Calendar, CalendarDays, CalendarRange } from 'lucide-react';
 import { cn } from '@/lib/utils';
 import { getLevelName } from '@/data/localStorage';
 
 interface RankingEntry {
   id: string;
   user_id: string;
   xp_earned: number;
   hands_played: number;
   accuracy: number;
   profile: {
     username: string;
     avatar_url: string | null;
     level: number;
     total_xp: number;
   };
 }
 
 type PeriodType = 'daily' | 'weekly' | 'monthly';
 
 export default function RankingPage() {
   const { user } = useAuth();
   const [period, setPeriod] = useState<PeriodType>('daily');
   const [rankings, setRankings] = useState<RankingEntry[]>([]);
   const [loading, setLoading] = useState(true);
 
   useEffect(() => {
     fetchRankings();
   }, [period]);
 
   const fetchRankings = async () => {
     setLoading(true);
     try {
       // Get period start date
       const now = new Date();
       let periodStart: Date;
       
       switch (period) {
         case 'daily':
           periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
           break;
         case 'weekly':
           const dayOfWeek = now.getDay();
           periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
           break;
         case 'monthly':
           periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
           break;
       }
 
       const { data, error } = await supabase
         .from('rankings')
         .select(`
           id,
           user_id,
           xp_earned,
           hands_played,
           accuracy,
           profiles!rankings_user_id_fkey (
             username,
             avatar_url,
             level,
             total_xp
           )
         `)
         .eq('period_type', period)
         .eq('period_start', periodStart.toISOString().split('T')[0])
         .order('xp_earned', { ascending: false })
         .limit(100);
 
       if (error) throw error;
 
       const formattedData = (data || []).map((entry: any) => ({
         ...entry,
         profile: entry.profiles || { username: 'Anônimo', avatar_url: null, level: 1, total_xp: 0 },
       }));
 
       setRankings(formattedData);
     } catch (error) {
       console.error('Error fetching rankings:', error);
     } finally {
       setLoading(false);
     }
   };
 
   const getRankIcon = (position: number) => {
     switch (position) {
       case 1:
         return <Trophy className="h-6 w-6 text-yellow-500" />;
       case 2:
         return <Medal className="h-6 w-6 text-gray-400" />;
       case 3:
         return <Award className="h-6 w-6 text-amber-600" />;
       default:
         return <span className="w-6 text-center font-bold text-muted-foreground">{position}</span>;
     }
   };
 
   const getPeriodIcon = (p: PeriodType) => {
     switch (p) {
       case 'daily':
         return <Calendar className="h-4 w-4" />;
       case 'weekly':
         return <CalendarDays className="h-4 w-4" />;
       case 'monthly':
         return <CalendarRange className="h-4 w-4" />;
     }
   };
 
   return (
     <MainLayout>
       <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
         {/* Header */}
         <div className="mb-6">
           <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-3">
             <Trophy className="h-8 w-8 text-primary" />
             Ranking
           </h1>
           <p className="text-muted-foreground mt-1">
             Veja os melhores jogadores do período
           </p>
         </div>
 
         {/* Period Tabs */}
         <Tabs value={period} onValueChange={(v) => setPeriod(v as PeriodType)} className="mb-6">
           <TabsList className="grid w-full grid-cols-3">
             <TabsTrigger value="daily" className="flex items-center gap-2">
               <Calendar className="h-4 w-4" />
               <span className="hidden sm:inline">Diário</span>
             </TabsTrigger>
             <TabsTrigger value="weekly" className="flex items-center gap-2">
               <CalendarDays className="h-4 w-4" />
               <span className="hidden sm:inline">Semanal</span>
             </TabsTrigger>
             <TabsTrigger value="monthly" className="flex items-center gap-2">
               <CalendarRange className="h-4 w-4" />
               <span className="hidden sm:inline">Mensal</span>
             </TabsTrigger>
           </TabsList>
         </Tabs>
 
         {/* Rankings List */}
         <Card>
           <CardHeader className="pb-2">
             <CardTitle className="text-lg flex items-center gap-2">
               {getPeriodIcon(period)}
               Top Jogadores - {period === 'daily' ? 'Hoje' : period === 'weekly' ? 'Esta Semana' : 'Este Mês'}
             </CardTitle>
           </CardHeader>
           <CardContent>
             {loading ? (
               <div className="py-8 text-center text-muted-foreground">
                 Carregando ranking...
               </div>
             ) : rankings.length === 0 ? (
               <div className="py-8 text-center text-muted-foreground">
                 <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                 <p>Nenhum jogador no ranking ainda.</p>
                 <p className="text-sm mt-2">Seja o primeiro a treinar!</p>
               </div>
             ) : (
               <div className="space-y-2">
                 {rankings.map((entry, index) => (
                   <div
                     key={entry.id}
                     className={cn(
                       'flex items-center gap-4 p-3 rounded-lg transition-colors',
                       index < 3 ? 'bg-primary/5' : 'bg-muted/50',
                       user?.id === entry.user_id && 'ring-2 ring-primary/50'
                     )}
                   >
                     {/* Position */}
                     <div className="w-8 flex justify-center">
                       {getRankIcon(index + 1)}
                     </div>
 
                     {/* Avatar */}
                     <Avatar className="h-10 w-10">
                       <AvatarImage src={entry.profile.avatar_url || undefined} />
                       <AvatarFallback className="bg-primary/20 text-primary">
                         {entry.profile.username.charAt(0).toUpperCase()}
                       </AvatarFallback>
                     </Avatar>
 
                     {/* User Info */}
                     <div className="flex-1 min-w-0">
                       <div className="flex items-center gap-2">
                         <p className="font-medium truncate">{entry.profile.username}</p>
                         {user?.id === entry.user_id && (
                           <Badge variant="outline" className="text-xs">Você</Badge>
                         )}
                       </div>
                       <p className="text-xs text-muted-foreground">
                         {getLevelName(entry.profile.level)} • {entry.hands_played} mãos • {entry.accuracy}% precisão
                       </p>
                     </div>
 
                     {/* XP */}
                     <div className="text-right">
                       <p className="font-bold text-primary flex items-center gap-1">
                         <TrendingUp className="h-4 w-4" />
                         {entry.xp_earned}
                       </p>
                       <p className="text-xs text-muted-foreground">XP</p>
                     </div>
                   </div>
                 ))}
               </div>
             )}
           </CardContent>
         </Card>
 
         {/* Level Info Card */}
         <Card className="mt-6">
           <CardHeader className="pb-2">
             <CardTitle className="text-lg">Níveis de XP</CardTitle>
           </CardHeader>
           <CardContent>
             <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
               {[
                 { name: 'Iniciante', xp: '0', color: 'bg-gray-500' },
                 { name: 'Amador', xp: '150', color: 'bg-blue-500' },
                 { name: 'Intermediário', xp: '450', color: 'bg-green-500' },
                 { name: 'Avançado', xp: '1000', color: 'bg-yellow-500' },
                 { name: 'Expert', xp: '2000', color: 'bg-orange-500' },
                 { name: 'Mestre', xp: '4000', color: 'bg-red-500' },
                 { name: 'Lenda', xp: '8000', color: 'bg-purple-500' },
               ].map((level) => (
                 <div key={level.name} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                   <div className={cn('w-3 h-3 rounded-full', level.color)} />
                   <div>
                     <p className="text-sm font-medium">{level.name}</p>
                     <p className="text-xs text-muted-foreground">{level.xp}+ XP</p>
                   </div>
                 </div>
               ))}
             </div>
           </CardContent>
         </Card>
       </div>
     </MainLayout>
   );
 }