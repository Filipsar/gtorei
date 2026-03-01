import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { ThumbsUp, Heart, Trophy, MessageCircle, Send, Trash2, MoreHorizontal } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface PostProfile {
  username: string;
  avatar_url: string | null;
  level: number;
}

interface Reaction {
  id: string;
  reaction_type: string;
  user_id: string;
}

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: PostProfile;
}

interface Post {
  id: string;
  user_id: string;
  content: string;
  hand_context: any;
  created_at: string;
  profile?: PostProfile;
  reactions: Reaction[];
  comments: Comment[];
}

const REACTION_TYPES = [
  { type: 'like', icon: ThumbsUp, label: 'Curtir', color: 'text-blue-400' },
  { type: 'love', icon: Heart, label: 'Amei', color: 'text-red-400' },
  { type: 'gg', icon: Trophy, label: 'GG', color: 'text-yellow-400' },
];

export default function CommunityPage() {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());

  const fetchPosts = useCallback(async () => {
    try {
      // Fetch posts
      const { data: postsData, error: postsError } = await supabase
        .from('community_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (postsError) throw postsError;
      if (!postsData) { setPosts([]); return; }

      // Fetch profiles for post authors
      const userIds = [...new Set(postsData.map(p => p.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url, level')
        .in('user_id', userIds);

      const profileMap = new Map<string, PostProfile>();
      profiles?.forEach(p => profileMap.set(p.user_id, p));

      // Fetch reactions for all posts
      const postIds = postsData.map(p => p.id);
      const { data: reactions } = await supabase
        .from('post_reactions')
        .select('*')
        .in('post_id', postIds);

      // Fetch comments for all posts
      const { data: comments } = await supabase
        .from('post_comments')
        .select('*')
        .in('post_id', postIds)
        .order('created_at', { ascending: true });

      // Fetch profiles for commenters
      const commentUserIds = [...new Set((comments || []).map(c => c.user_id))];
      if (commentUserIds.length > 0) {
        const { data: commentProfiles } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url, level')
          .in('user_id', commentUserIds);
        commentProfiles?.forEach(p => profileMap.set(p.user_id, p));
      }

      const enrichedPosts: Post[] = postsData.map(post => ({
        ...post,
        profile: profileMap.get(post.user_id),
        reactions: (reactions || []).filter(r => r.post_id === post.id),
        comments: (comments || []).filter(c => c.post_id === post.id).map(c => ({
          ...c,
          profile: profileMap.get(c.user_id),
        })),
      }));

      setPosts(enrichedPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleCreatePost = async () => {
    if (!newPostContent.trim() || !user) return;
    setPosting(true);
    try {
      const { error } = await supabase.from('community_posts').insert({
        user_id: user.id,
        content: newPostContent.trim(),
      });
      if (error) throw error;
      setNewPostContent('');
      toast({ title: 'Post publicado!' });
      fetchPosts();
    } catch (error) {
      toast({ title: 'Erro ao publicar', variant: 'destructive' });
    } finally {
      setPosting(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      const { error } = await supabase.from('community_posts').delete().eq('id', postId);
      if (error) throw error;
      setPosts(prev => prev.filter(p => p.id !== postId));
      toast({ title: 'Post removido' });
    } catch {
      toast({ title: 'Erro ao remover', variant: 'destructive' });
    }
  };

  const handleReaction = async (postId: string, reactionType: string) => {
    if (!user) return;
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const existing = post.reactions.find(r => r.user_id === user.id && r.reaction_type === reactionType);
    if (existing) {
      // Remove reaction
      await supabase.from('post_reactions').delete().eq('id', existing.id);
      setPosts(prev => prev.map(p => p.id === postId
        ? { ...p, reactions: p.reactions.filter(r => r.id !== existing.id) }
        : p
      ));
    } else {
      // Add reaction
      const { data, error } = await supabase.from('post_reactions').insert({
        post_id: postId,
        user_id: user.id,
        reaction_type: reactionType,
      }).select().single();
      if (!error && data) {
        setPosts(prev => prev.map(p => p.id === postId
          ? { ...p, reactions: [...p.reactions, data] }
          : p
        ));
      }
    }
  };

  const handleAddComment = async (postId: string) => {
    const text = commentTexts[postId]?.trim();
    if (!text || !user) return;

    try {
      const { data, error } = await supabase.from('post_comments').insert({
        post_id: postId,
        user_id: user.id,
        content: text,
      }).select().single();

      if (error) throw error;
      if (data) {
        const commentWithProfile = {
          ...data,
          profile: profile ? { username: profile.username, avatar_url: profile.avatar_url, level: profile.level } : undefined,
        };
        setPosts(prev => prev.map(p => p.id === postId
          ? { ...p, comments: [...p.comments, commentWithProfile] }
          : p
        ));
        setCommentTexts(prev => ({ ...prev, [postId]: '' }));
      }
    } catch {
      toast({ title: 'Erro ao comentar', variant: 'destructive' });
    }
  };

  const handleDeleteComment = async (postId: string, commentId: string) => {
    try {
      await supabase.from('post_comments').delete().eq('id', commentId);
      setPosts(prev => prev.map(p => p.id === postId
        ? { ...p, comments: p.comments.filter(c => c.id !== commentId) }
        : p
      ));
    } catch {
      toast({ title: 'Erro ao remover comentário', variant: 'destructive' });
    }
  };

  const toggleComments = (postId: string) => {
    setExpandedComments(prev => {
      const next = new Set(prev);
      next.has(postId) ? next.delete(postId) : next.add(postId);
      return next;
    });
  };

  const getInitial = (name?: string) => (name || 'U').charAt(0).toUpperCase();

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        <div className="text-center mb-2">
          <h1 className="text-heading-lg">Comunidade</h1>
          <p className="text-muted-foreground text-sm">Discuta mãos, compartilhe jogadas e aprenda com outros jogadores</p>
        </div>

        {/* Create Post */}
        <Card className="border-primary/20">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Avatar className="h-10 w-10">
                {profile?.avatar_url && profile.avatar_url.length > 4 ? (
                  <AvatarImage src={profile.avatar_url} />
                ) : null}
                <AvatarFallback className="bg-primary/20 text-primary">
                  {profile?.avatar_url && profile.avatar_url.length <= 4
                    ? profile.avatar_url
                    : getInitial(profile?.username)}
                </AvatarFallback>
              </Avatar>
              <Textarea
                placeholder="Compartilhe uma mão, análise ou discussão..."
                value={newPostContent}
                onChange={e => setNewPostContent(e.target.value)}
                className="min-h-[80px] resize-none bg-muted/30 border-muted"
              />
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleCreatePost}
                disabled={!newPostContent.trim() || posting}
                size="sm"
                className="gap-2"
              >
                <Send className="h-4 w-4" />
                Publicar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Posts Feed */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum post ainda. Seja o primeiro!</p>
          </div>
        ) : (
          posts.map(post => (
            <Card key={post.id} className="overflow-hidden">
              <CardContent className="p-4 space-y-3">
                {/* Post Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      {post.profile?.avatar_url && post.profile.avatar_url.length > 4 ? (
                        <AvatarImage src={post.profile.avatar_url} />
                      ) : null}
                      <AvatarFallback className="bg-primary/20 text-primary text-sm">
                        {post.profile?.avatar_url && post.profile.avatar_url.length <= 4
                          ? post.profile.avatar_url
                          : getInitial(post.profile?.username)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold">{post.profile?.username || 'Jogador'}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ptBR })}
                        {post.profile?.level ? ` · Nível ${post.profile.level}` : ''}
                      </p>
                    </div>
                  </div>
                  {post.user_id === user?.id && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDeletePost(post.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Excluir post
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                {/* Post Content */}
                <p className="text-sm whitespace-pre-wrap">{post.content}</p>

                {/* Reactions Summary */}
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  {REACTION_TYPES.map(rt => {
                    const count = post.reactions.filter(r => r.reaction_type === rt.type).length;
                    if (count === 0) return null;
                    const Icon = rt.icon;
                    return (
                      <span key={rt.type} className="flex items-center gap-0.5 mr-2">
                        <Icon className={`h-3.5 w-3.5 ${rt.color}`} />
                        {count}
                      </span>
                    );
                  })}
                  {post.comments.length > 0 && (
                    <span className="ml-auto">
                      {post.comments.length} comentário{post.comments.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                <Separator />

                {/* Reaction Buttons */}
                <div className="flex items-center justify-around">
                  {REACTION_TYPES.map(rt => {
                    const Icon = rt.icon;
                    const hasReacted = post.reactions.some(r => r.user_id === user?.id && r.reaction_type === rt.type);
                    return (
                      <Button
                        key={rt.type}
                        variant="ghost"
                        size="sm"
                        className={`flex-1 gap-1.5 text-xs ${hasReacted ? rt.color : 'text-muted-foreground'}`}
                        onClick={() => handleReaction(post.id, rt.type)}
                      >
                        <Icon className="h-4 w-4" />
                        {rt.label}
                      </Button>
                    );
                  })}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 gap-1.5 text-xs text-muted-foreground"
                    onClick={() => toggleComments(post.id)}
                  >
                    <MessageCircle className="h-4 w-4" />
                    Comentar
                  </Button>
                </div>

                {/* Comments Section */}
                {(expandedComments.has(post.id) || post.comments.length > 0) && (
                  <div className="space-y-3 pt-1">
                    <Separator />
                    {post.comments.map(comment => (
                      <div key={comment.id} className="flex gap-2">
                        <Avatar className="h-7 w-7 mt-0.5">
                          {comment.profile?.avatar_url && comment.profile.avatar_url.length > 4 ? (
                            <AvatarImage src={comment.profile.avatar_url} />
                          ) : null}
                          <AvatarFallback className="bg-muted text-xs">
                            {comment.profile?.avatar_url && comment.profile.avatar_url.length <= 4
                              ? comment.profile.avatar_url
                              : getInitial(comment.profile?.username)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 bg-muted/40 rounded-lg px-3 py-2">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold">{comment.profile?.username || 'Jogador'}</p>
                            {comment.user_id === user?.id && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5"
                                onClick={() => handleDeleteComment(post.id, comment.id)}
                              >
                                <Trash2 className="h-3 w-3 text-muted-foreground" />
                              </Button>
                            )}
                          </div>
                          <p className="text-xs mt-0.5">{comment.content}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    ))}

                    {/* Add Comment */}
                    <div className="flex gap-2 items-center">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="bg-primary/20 text-primary text-xs">
                          {getInitial(profile?.username)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 flex gap-1">
                        <input
                          type="text"
                          placeholder="Escreva um comentário..."
                          className="flex-1 bg-muted/40 rounded-full px-3 py-1.5 text-xs border border-border/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                          value={commentTexts[post.id] || ''}
                          onChange={e => setCommentTexts(prev => ({ ...prev, [post.id]: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && handleAddComment(post.id)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleAddComment(post.id)}
                          disabled={!commentTexts[post.id]?.trim()}
                        >
                          <Send className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </MainLayout>
  );
}
