export const pt = {
  // HomePage
  home: {
    instagramBanner: 'Siga o GTORei no Instagram — @gtorei',
    title: 'Rei',
    description: 'Treinador de Poker GTO gratuito para jogadores que querem evoluir no poker.',
    play: 'Jogar',
    followUs: 'Siga-nos',
    supportProject: 'Ajude o projeto a se manter',
    accessibility: 'Acessibilidade',
    accessibilityDesc: 'O GTORei apoia projetos para deficientes e promove a inclusão no poker.',
    learnMore: 'Saiba mais',
  },

  // Sidebar
  sidebar: {
    train: 'Treinar',
    tables: 'Tabelas',
    analysis: 'Análise',
    ranking: 'Ranking',
    achievements: 'Conquistas',
    community: 'Comunidade',
    favorites: 'Favoritos',
    profile: 'Perfil',
    search: 'Buscar',
    beginner: 'Iniciante',
    classes: 'Aulas',
    updates: 'Atualizações',
    support: 'Apoie',
    feedback: 'Feedback',
    settings: 'Configurações',
    logout: 'Sair',
    collapse: 'Recolher',
    giveOpinion: 'Dê sua opinião',
    player: 'Jogador',
  },

  // Settings
  settings: {
    title: 'Configurações',
    profileTab: 'Perfil',
    appearanceTab: 'Aparência',
    orChooseIcon: 'Ou escolha um ícone',
    nickname: 'Nickname',
    nicknamePlaceholder: 'Seu nome de jogador',
    saveChanges: 'Salvar Alterações',
    saving: 'Salvando...',
    theme: 'Tema',
    light: 'Claro',
    dark: 'Escuro',
    system: 'Sistema',
    screenReader: 'Leitor de Tela',
    underMaintenance: 'Em manutenção',
    onboardingTutorial: 'Tutorial de Onboarding',
    onboardingDesc: 'Reveja o passo a passo das funcionalidades',
    review: 'Rever',
    themeNote: 'O GTORei usa por padrão o tema escuro otimizado para longas sessões de estudo.',
    uploadPhoto: 'Enviar foto',
    uploading: 'Carregando...',
    language: 'Idioma',
    portuguese: 'Português',
    english: 'Inglês',
    languageNote: 'O idioma é detectado automaticamente pelo seu país, mas pode ser alterado aqui.',
    // Toasts
    invalidFile: 'Arquivo inválido',
    selectImage: 'Por favor, selecione uma imagem.',
    fileTooLarge: 'Arquivo muito grande',
    maxFileSize: 'A imagem deve ter no máximo 2MB.',
    imageTooLarge: 'Imagem muito grande',
    maxDimensions: 'A largura e altura máximas são 512x512 pixels.',
    uploadError: 'Erro ao carregar imagem',
    tryAgain: 'Tente novamente.',
    nameTooShort: 'Nome muito curto',
    minChars: 'O nickname deve ter pelo menos 2 caracteres.',
    profileUpdated: 'Perfil atualizado!',
    changesSaved: 'Suas alterações foram salvas.',
    saveError: 'Erro ao salvar',
    screenReaderEnabled: 'Leitor de tela ativado',
    screenReaderEnabledDesc: 'Recursos de acessibilidade foram habilitados.',
  },
};

// Use string type for all values to allow different translations
type DeepStringify<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepStringify<T[K]>;
};

export type Translations = DeepStringify<typeof pt>;
