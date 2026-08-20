const CONSTANTS = {
    TILE_SIZE: 48,
    GRID_WIDTH: 15, // 15 tiles * 48px = 720px
    GRID_HEIGHT: 15,
    CANVAS_WIDTH: 720,
    CANVAS_HEIGHT: 720,
    
    // Identificadores de blocos no mapa
    TILE_EMPTY: 0,
    TILE_SOLID: 1, // Indestrutível
    TILE_SOFT: 2,  // Destrutível (Tijolo)
    TILE_BOMB: 3,  // Bomba plantada
    
    // Cores fallback (quando não há imagem)
    COLORS: {
        BACKGROUND: '#3b8b3b',
        SOLID_WALL: '#555555',
        SOFT_WALL: '#b35d24',
        PLAYER: '#ffffff',
        ENEMY: '#ff0000',
        BOMB: '#000000',
        EXPLOSION: '#ffaa00'
    },
    
    // Estados do Jogo
    STATE_MENU: 0,
    STATE_PLAYING: 1,
    STATE_GAME_OVER: 2,
    STATE_LEVEL_CLEAR: 3,
    STATE_VICTORY: 4,
    STATE_PAUSED: 5,

    // Modos de Jogo
    GAME_MODES: {
        CAMPAIGN: 'campaign',   // 3 Fases com História e Boss
        ENDLESS: 'endless',     // Hordas infinitas com ondas crescentes
        PVP: 'pvp'              // 2 Jogadores local no mesmo teclado
    },

    // Tipos de Inimigos
    ENEMY_TYPES: {
        BALLOM: 'ballom',   // Balão Vermelho: Patrulha clássica e rápida
        ONEAL: 'oneal',     // Slime Azul: Perseguidor com BFS e esquiva de bombas
        DAHL: 'dahl',       // Golem Laranja: Tanque com 2 HP e investida
        MINVO: 'minvo'      // Morcego Roxo: Flutua e atravessa blocos de tijolo
    },

    // Tipos de Itens / Power-Ups
    POWERUP_TYPES: {
        BOMB: 'bomb',
        FIRE: 'fire',
        SPEED: 'speed',
        HEART: 'heart',
        SHIELD: 'shield',
        KEY: 'key',
        RASENGAN: 'rasengan',
        REMOTE: 'remote',   // Detonador manual com tecla [X]
        SKULL: 'skull',     // Maldição temporária caótica
        ICE: 'ice'          // Bomba congelante
    },

    // Efeitos da Maldição da Caveira (Skull Curse)
    CURSE_TYPES: {
        DIARRHEA: 'diarrhea',       // Planta bombas incontrolavelmente
        INVERTED: 'inverted',       // Controles invertidos
        SLOW: 'slow',               // Lentidão extrema
        FAST: 'fast'                // Hipervelocidade descontrolada
    }
};
