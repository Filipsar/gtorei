export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_analysis_usage: {
        Row: {
          created_at: string
          id: string
          used_on: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          used_on?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          used_on?: string
          user_id?: string
        }
        Relationships: []
      }
      community_posts: {
        Row: {
          content: string
          created_at: string
          hand_context: Json | null
          id: string
          image_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          hand_context?: Json | null
          id?: string
          image_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          hand_context?: Json | null
          id?: string
          image_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_challenge_claims: {
        Row: {
          chave: string
          dia: string
          idx: number
          resgatado_em: string
          user_id: string
          xp: number
        }
        Insert: {
          chave: string
          dia: string
          idx: number
          resgatado_em?: string
          user_id: string
          xp: number
        }
        Update: {
          chave?: string
          dia?: string
          idx?: number
          resgatado_em?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          final_table: boolean
          id: string
          name: string
          position: string
          scenario: string
          stack: string
          user_id: string
        }
        Insert: {
          created_at?: string
          final_table?: boolean
          id?: string
          name: string
          position: string
          scenario: string
          stack: string
          user_id: string
        }
        Update: {
          created_at?: string
          final_table?: boolean
          id?: string
          name?: string
          position?: string
          scenario?: string
          stack?: string
          user_id?: string
        }
        Relationships: []
      }
      play_purchases: {
        Row: {
          criado_em: string
          estado: string
          order_id: string | null
          product_id: string
          purchase_token: string
          user_id: string
        }
        Insert: {
          criado_em?: string
          estado: string
          order_id?: string | null
          product_id: string
          purchase_token: string
          user_id: string
        }
        Update: {
          criado_em?: string
          estado?: string
          order_id?: string | null
          product_id?: string
          purchase_token?: string
          user_id?: string
        }
        Relationships: []
      }
      played_hands: {
        Row: {
          correct_action: string
          effective_stack: number | null
          ev_loss: number
          feedback: string
          game_mode: string | null
          hand: string
          hand_code: string | null
          id: string
          played_at: string
          points: number
          position: string
          scenario: string
          session_id: string
          stack: number
          user_action: string
          user_id: string
          villain_position: string | null
        }
        Insert: {
          correct_action: string
          effective_stack?: number | null
          ev_loss?: number
          feedback: string
          game_mode?: string | null
          hand: string
          hand_code?: string | null
          id?: string
          played_at?: string
          points: number
          position: string
          scenario: string
          session_id: string
          stack: number
          user_action: string
          user_id: string
          villain_position?: string | null
        }
        Update: {
          correct_action?: string
          effective_stack?: number | null
          ev_loss?: number
          feedback?: string
          game_mode?: string | null
          hand?: string
          hand_code?: string | null
          id?: string
          played_at?: string
          points?: number
          position?: string
          scenario?: string
          session_id?: string
          stack?: number
          user_action?: string
          user_id?: string
          villain_position?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "played_hands_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reactions: {
        Row: {
          created_at: string
          id: string
          post_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          reaction_type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          banner_url: string | null
          consecutive_errors: number
          created_at: string
          hands_played: number
          id: string
          level: number
          level_test_completed_at: string | null
          screenshot_urls: string[] | null
          total_xp: number
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          banner_url?: string | null
          consecutive_errors?: number
          created_at?: string
          hands_played?: number
          id?: string
          level?: number
          level_test_completed_at?: string | null
          screenshot_urls?: string[] | null
          total_xp?: number
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          banner_url?: string | null
          consecutive_errors?: number
          created_at?: string
          hands_played?: number
          id?: string
          level?: number
          level_test_completed_at?: string | null
          screenshot_urls?: string[] | null
          total_xp?: number
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      rankings: {
        Row: {
          accuracy: number
          created_at: string
          hands_played: number
          id: string
          period_start: string
          period_type: string
          updated_at: string
          user_id: string
          xp_earned: number
        }
        Insert: {
          accuracy?: number
          created_at?: string
          hands_played?: number
          id?: string
          period_start: string
          period_type: string
          updated_at?: string
          user_id: string
          xp_earned?: number
        }
        Update: {
          accuracy?: number
          created_at?: string
          hands_played?: number
          id?: string
          period_start?: string
          period_type?: string
          updated_at?: string
          user_id?: string
          xp_earned?: number
        }
        Relationships: [
          {
            foreignKeyName: "rankings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      referral_codes: {
        Row: {
          code: string
          criado_em: string
          user_id: string
        }
        Insert: {
          code: string
          criado_em?: string
          user_id: string
        }
        Update: {
          code?: string
          criado_em?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          criado_em: string
          referred_id: string
          referrer_id: string
          validado_em: string | null
        }
        Insert: {
          criado_em?: string
          referred_id: string
          referrer_id: string
          validado_em?: string | null
        }
        Update: {
          criado_em?: string
          referred_id?: string
          referrer_id?: string
          validado_em?: string | null
        }
        Relationships: []
      }
      supporters: {
        Row: {
          granted_at: string
          granted_by: string | null
          note: string | null
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          note?: string | null
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          note?: string | null
          user_id?: string
        }
        Relationships: []
      }
      training_sessions: {
        Row: {
          accuracy: number
          created_at: string
          ended_at: string | null
          hands_played: number
          id: string
          position: string
          scenario: string
          score: number
          stack: number
          started_at: string
          user_id: string
        }
        Insert: {
          accuracy?: number
          created_at?: string
          ended_at?: string | null
          hands_played?: number
          id?: string
          position: string
          scenario: string
          score?: number
          stack: number
          started_at?: string
          user_id: string
        }
        Update: {
          accuracy?: number
          created_at?: string
          ended_at?: string | null
          hands_played?: number
          id?: string
          position?: string
          scenario?: string
          score?: number
          stack?: number
          started_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_key: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_key: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_key?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: []
      }
      liga_jogador: {
        Row: {
          atualizado_em: string
          elo: number
          user_id: string
        }
        Insert: {
          atualizado_em?: string
          elo?: number
          user_id: string
        }
        Update: {
          atualizado_em?: string
          elo?: number
          user_id?: string
        }
        Relationships: []
      }
      noticias: {
        Row: {
          atualizada_em: string | null
          criada_em: string
          fonte: string
          id: string
          link: string
          publicada_em: string | null
          publicada_na_fonte: string | null
          resumo: string | null
          slug: string | null
          status: string
          titulo: string | null
          titulo_fonte: string
          trecho_fonte: string | null
        }
        Insert: {
          atualizada_em?: string | null
          criada_em?: string
          fonte: string
          id?: string
          link: string
          publicada_em?: string | null
          publicada_na_fonte?: string | null
          resumo?: string | null
          slug?: string | null
          status?: string
          titulo?: string | null
          titulo_fonte: string
          trecho_fonte?: string | null
        }
        Update: {
          atualizada_em?: string | null
          criada_em?: string
          fonte?: string
          id?: string
          link?: string
          publicada_em?: string | null
          publicada_na_fonte?: string | null
          resumo?: string | null
          slug?: string | null
          status?: string
          titulo?: string | null
          titulo_fonte?: string
          trecho_fonte?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      xp_bonus: {
        Row: {
          criado_em: string
          id: string
          origem: string
          referencia: string
          user_id: string
          xp: number
        }
        Insert: {
          criado_em?: string
          id?: string
          origem: string
          referencia: string
          user_id: string
          xp: number
        }
        Update: {
          criado_em?: string
          id?: string
          origem?: string
          referencia?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _dar_conquista: { Args: { _key: string; _uid: string }; Returns: boolean }
      _dar_xp_bonus: {
        Args: { _origem: string; _ref: string; _uid: string; _xp: number }
        Returns: boolean
      }
      _desafios_do_dia: {
        Args: { _dia: string }
        Returns: {
          chave: string
          descricao: string
          idx: number
          meta: number
          param: string
          tipo: string
          titulo: string
          xp: number
        }[]
      }
      _hoje_brasilia: { Args: never; Returns: string }
      _progresso_desafios: {
        Args: { _dia: string; _uid: string }
        Returns: {
          chave: string
          concluido: boolean
          descricao: string
          idx: number
          meta: number
          precisao: number
          progresso: number
          titulo: string
          xp: number
        }[]
      }
      _sequencia_desafios: { Args: { _uid: string }; Returns: number }
      _validar_indicacao: { Args: { _referred: string }; Returns: undefined }
      admin_monthly_metrics: {
        Args: { _ate_dia?: number; _meses?: number }
        Returns: {
          ativos: number
          maos: number
          mes: string
          minutos: number
          novos: number
          precisao: number
          sessoes: number
          total_usuarios: number
        }[]
      }
      admin_referral_level5: {
        Args: never
        Returns: {
          email: string
          nivel5_desde: string
          user_id: string
          username: string
          validos: number
        }[]
      }
      apply_ranking_delta: {
        Args: { _correct: number; _hands: number; _uid: string; _xp: number }
        Returns: undefined
      }
      calc_level: { Args: { _xp: number }; Returns: number }
      claim_daily_challenge: { Args: { _idx: number }; Returns: Json }
      claim_period_challenge: { Args: { _periodo: string; _idx: number }; Returns: Json }
      claim_simulado: { Args: { _session_id: string; _dificuldade?: string }; Returns: Json }
      get_period_challenges: { Args: never; Returns: Json }
      get_liga: { Args: never; Returns: Json }
      duelo_atual: { Args: never; Returns: string | null }
      duelo_procurar: { Args: never; Returns: Json }
      duelo_sair_fila: { Args: never; Returns: string | null }
      duelo_estado: { Args: { _duelo: string }; Returns: Json }
      duelo_agir: { Args: { _duelo: string; _mao: number; _acao: string; _acertou?: boolean | null }; Returns: Json }
      duelo_desistir: { Args: { _duelo: string }; Returns: Json }
      claim_referral: { Args: { _code: string }; Returns: string }
      complete_level_test: { Args: { _results: Json }; Returns: Json }
      get_daily_challenges: { Args: never; Returns: Json }
      get_my_referral_code: { Args: never; Returns: string }
      get_my_referrals: { Args: never; Returns: Json }
      get_period_start: { Args: { period_type: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_supporter: { Args: { _uid?: string }; Returns: boolean }
      lookup_hand: {
        Args: { _code: string }
        Returns: {
          correct_action: string
          effective_stack: number
          ev_loss: number
          feedback: string
          game_mode: string
          hand: string
          played_at: string
          points: number
          position: string
          scenario: string
          stack: number
          user_action: string
          villain_position: string
        }[]
      }
      purge_old_hand_codes: { Args: never; Returns: number }
      record_hand_result: {
        Args: {
          _correct_action: string
          _effective_stack?: number
          _ev_loss?: number
          _feedback: string
          _game_mode?: string
          _hand: string
          _hand_code?: string
          _points: number
          _position: string
          _scenario: string
          _session_id: string
          _stack: number
          _user_action: string
          _villain_position?: string
        }
        Returns: Json
      }
      referral_tier: { Args: { _n: number }; Returns: number }
      set_supporter: {
        Args: { _ativo: boolean; _note?: string; _user_id: string }
        Returns: boolean
      }
      unlock_achievement: { Args: { _key: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
