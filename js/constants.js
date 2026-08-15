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

    // Tipos de Inimigos
    ENEMY_TYPES: {
        BALLOM: 'ballom',   // Balão Vermelho: Patrulha clássica e rápida
        ONEAL: 'oneal',     // Slime Azul: Perseguidor com BFS e esquiva de bombas
        DAHL: 'dahl',       // Golem Laranja: Tanque com 2 HP e investida
        MINVO: 'minvo'      // Morcego Roxo: Flutua e atravessa blocos de tijolo
    }
};
