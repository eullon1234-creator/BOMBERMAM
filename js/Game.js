class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.spriteLoader = new SpriteLoader();
        this.map = new LevelMap();
        this.particleSystem = new ParticleSystem();
        this.lightingSystem = new LightingSystem();
        
        this.player = null;   // Player 1
        this.player2 = null;  // Player 2 (Modo PvP)
        this.enemies = [];
        this.boss = null;
        this.bombs = [];
        this.rasengans = [];
        this.chidoris = [];
        
        // Modos e Níveis
        this.mode = CONSTANTS.GAME_MODES.CAMPAIGN;
        this.level = 1;
        this.wave = 1;
        this.score = 0;
        this.lives = 3;
        this.p1Wins = 0;
        this.p2Wins = 0;

        // Temporizador de Sudden Death para PvP (60s)
        this.pvpMatchTimer = 60000;
        this.suddenDeathDropTimer = 0;
        this.suddenDeathStarted = false;

        // Recordes
        this.highScore = parseInt(localStorage.getItem('bm_high_score') || '0', 10);
        this.endlessHighScore = parseInt(localStorage.getItem('bm_endless_wave') || '1', 10);
        this.selectedCharacter = localStorage.getItem('bm_selected_char') || 'hero';
        this.selectedCharacterP2 = localStorage.getItem('bm_selected_char_p2') || 'hero_sasuke';
        
        this.state = CONSTANTS.STATE_MENU;
        this.lastTime = 0;
        this.isLoaded = false;
        this.isPaused = false;
        
        // Combos
        this.comboCount = 0;
        this.comboTimer = 0;

        this.levelEditor = new LevelEditor(this);

        this.updateHighScoreDisplay();
        this.bindEvents();
        this.init();
    }

    async init() {
        await this.spriteLoader.preloadAll();
        this.isLoaded = true;
        this.updateSoundButtonUI();
        this.updateCharacterSelectionUI();
        this.updateModeSelectionUI();
        
        if (window.soundManager) {
            window.soundManager.startBGM('menu');
        }
        
        requestAnimationFrame((t) => this.loop(t));
    }

    selectMode(modeKey) {
        this.mode = modeKey;
        this.updateModeSelectionUI();
        window.soundManager?.playSelect();
        if (modeKey === CONSTANTS.GAME_MODES.BUILDER) {
            this.openLevelEditor();
        }
    }

    updateModeSelectionUI() {
        document.querySelectorAll('.mode-card').forEach(card => {
            const m = card.getAttribute('data-mode');
            if (m === this.mode) {
                card.classList.add('active');
            } else {
                card.classList.remove('active');
            }
        });

        const p2Container = document.getElementById('p2-select-container');
        if (p2Container) {
            if (this.mode === CONSTANTS.GAME_MODES.PVP) {
                p2Container.classList.remove('hidden');
            } else {
                p2Container.classList.add('hidden');
            }
        }
    }

    selectCharacter(charKey, playerIdx = 1) {
        if (playerIdx === 1) {
            this.selectedCharacter = charKey;
            localStorage.setItem('bm_selected_char', charKey);
        } else {
            this.selectedCharacterP2 = charKey;
            localStorage.setItem('bm_selected_char_p2', charKey);
        }
        this.updateCharacterSelectionUI();
        window.soundManager?.playSelect();
    }

    updateCharacterSelectionUI() {
        document.querySelectorAll('.char-card-p1').forEach(card => {
            const char = card.getAttribute('data-char');
            if (char === this.selectedCharacter) card.classList.add('active');
            else card.classList.remove('active');
        });

        document.querySelectorAll('.char-card-p2').forEach(card => {
            const char = card.getAttribute('data-char');
            if (char === this.selectedCharacterP2) card.classList.add('active');
            else card.classList.remove('active');
        });
    }

    updateHighScoreDisplay() {
        const hsMenu = document.getElementById('menu-high-score');
        if (hsMenu) hsMenu.innerText = this.highScore;
        const hsEndless = document.getElementById('menu-endless-record');
        if (hsEndless) hsEndless.innerText = `Onda ${this.endlessHighScore}`;
    }

    saveHighScore() {
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('bm_high_score', this.highScore.toString());
        }
        if (this.wave > this.endlessHighScore) {
            this.endlessHighScore = this.wave;
            localStorage.setItem('bm_endless_wave', this.endlessHighScore.toString());
        }
        this.updateHighScoreDisplay();
    }

    bindEvents() {
        window.addEventListener('keydown', (e) => this.handleKey(e, true));
        window.addEventListener('keyup', (e) => this.handleKey(e, false));
        
        const startBtn = document.getElementById('btn-start-game');
        if (startBtn) {
            startBtn.addEventListener('click', () => this.startGame());
            startBtn.addEventListener('mouseenter', () => window.soundManager?.playHover());
        }

        document.querySelectorAll('.mode-card').forEach(card => {
            card.addEventListener('click', () => {
                const m = card.getAttribute('data-mode');
                if (m) this.selectMode(m);
            });
            card.addEventListener('mouseenter', () => window.soundManager?.playHover());
        });

        const howToBtn = document.getElementById('btn-how-to-play');
        if (howToBtn) {
            howToBtn.addEventListener('click', () => {
                window.soundManager?.playSelect();
                this.openModal('modal-how-to-play');
            });
            howToBtn.addEventListener('mouseenter', () => window.soundManager?.playHover());
        }

        const guideBtn = document.getElementById('btn-guide');
        if (guideBtn) {
            guideBtn.addEventListener('click', () => {
                window.soundManager?.playSelect();
                this.openModal('modal-guide');
            });
            guideBtn.addEventListener('mouseenter', () => window.soundManager?.playHover());
        }

        document.querySelectorAll('.modal-close-btn, .close-modal-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetId = e.currentTarget.getAttribute('data-close');
                if (targetId) {
                    window.soundManager?.playHover();
                    this.closeModal(targetId);
                }
            });
        });

        document.querySelectorAll('.modal-backdrop').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.add('hidden');
                }
            });
        });

        const menuSoundBtn = document.getElementById('btn-sound-toggle');
        if (menuSoundBtn) menuSoundBtn.addEventListener('click', () => this.toggleSound());

        const inGameSoundBtn = document.getElementById('in-game-sound-btn');
        if (inGameSoundBtn) inGameSoundBtn.addEventListener('click', () => this.toggleSound());

        document.querySelectorAll('.char-card-p1').forEach(card => {
            card.addEventListener('click', () => {
                const char = card.getAttribute('data-char');
                if (char) this.selectCharacter(char, 1);
            });
            card.addEventListener('mouseenter', () => window.soundManager?.playHover());
        });

        document.querySelectorAll('.char-card-p2').forEach(card => {
            card.addEventListener('click', () => {
                const char = card.getAttribute('data-char');
                if (char) this.selectCharacter(char, 2);
            });
            card.addEventListener('mouseenter', () => window.soundManager?.playHover());
        });

        const inGamePauseBtn = document.getElementById('in-game-pause-btn');
        if (inGamePauseBtn) inGamePauseBtn.addEventListener('click', () => this.togglePause());

        const resumeBtn = document.getElementById('btn-resume-game');
        if (resumeBtn) resumeBtn.addEventListener('click', () => this.togglePause());

        const restartPauseBtn = document.getElementById('btn-restart-pause');
        if (restartPauseBtn) {
            restartPauseBtn.addEventListener('click', () => {
                this.closeModal('modal-pause');
                this.isPaused = false;
                this.startGame();
            });
        }

        const menuPauseBtn = document.getElementById('btn-menu-pause');
        if (menuPauseBtn) {
            menuPauseBtn.addEventListener('click', () => {
                this.closeModal('modal-pause');
                this.isPaused = false;
                this.returnToMenu();
            });
        }

        const inGameMenuBtn = document.getElementById('in-game-menu-btn');
        if (inGameMenuBtn) inGameMenuBtn.addEventListener('click', () => this.returnToMenu());

        const returnMenuBtn = document.getElementById('btn-return-menu');
        if (returnMenuBtn) returnMenuBtn.addEventListener('click', () => this.returnToMenu());

        const restartBtn = document.getElementById('restart-btn');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => {
                window.soundManager?.playSelect();
                document.getElementById('game-over-screen')?.classList.add('hidden');
                if (this.mode === CONSTANTS.GAME_MODES.CUSTOM && this.lastCustomLevelData) {
                    this.startCustomLevel(this.lastCustomLevelData);
                } else {
                    this.startGame();
                }
            });
        }

        const openBuilderBtn = document.getElementById('btn-open-builder');
        if (openBuilderBtn) {
            openBuilderBtn.addEventListener('click', () => {
                window.soundManager?.playSelect();
                this.openLevelEditor();
            });
            openBuilderBtn.addEventListener('mouseenter', () => window.soundManager?.playHover());
        }

        const customBackEditorBtn = document.getElementById('btn-custom-back-editor');
        if (customBackEditorBtn) {
            customBackEditorBtn.addEventListener('click', () => {
                window.soundManager?.playSelect();
                this.openLevelEditor();
            });
        }
    }

    openModal(id) {
        const modal = document.getElementById(id);
        if (modal) modal.classList.remove('hidden');
    }

    closeModal(id) {
        const modal = document.getElementById(id);
        if (modal) modal.classList.add('hidden');
    }

    openLevelEditor() {
        this.state = CONSTANTS.STATE_BUILDER;
        this.mode = CONSTANTS.GAME_MODES.BUILDER;
        this.isPaused = false;

        document.getElementById('start-menu-screen')?.classList.add('hidden');
        document.getElementById('ui-layer')?.classList.add('hidden');
        document.getElementById('game-over-screen')?.classList.add('hidden');
        document.getElementById('modal-pause')?.classList.add('hidden');
        document.getElementById('dialogue-overlay')?.classList.add('hidden');
        document.getElementById('builder-ui-layer')?.classList.remove('hidden');

        window.soundManager?.startBGM('menu');
    }

    startCustomLevel(levelData) {
        if (!levelData) return;
        this.lastCustomLevelData = levelData;
        this.mode = CONSTANTS.GAME_MODES.CUSTOM;
        this.state = CONSTANTS.STATE_PLAYING;
        this.isPaused = false;
        this.lives = 3;
        this.score = 0;

        document.getElementById('start-menu-screen')?.classList.add('hidden');
        document.getElementById('builder-ui-layer')?.classList.add('hidden');
        document.getElementById('game-over-screen')?.classList.add('hidden');
        document.getElementById('modal-pause')?.classList.add('hidden');
        document.getElementById('ui-layer')?.classList.remove('hidden');

        // Inicializa Mapa Customizado
        this.particleSystem.clear();
        this.map.loadCustomLevel(levelData);

        // Instancia Jogador 1
        const p1Col = levelData.playerSpawn ? levelData.playerSpawn.col : 1;
        const p1Row = levelData.playerSpawn ? levelData.playerSpawn.row : 1;
        this.player = new Player(p1Col * CONSTANTS.TILE_SIZE, p1Row * CONSTANTS.TILE_SIZE, this.selectedCharacter, 1);

        // Instancia Jogador 2 se houver spawn P2 configurado
        if (levelData.player2Spawn && (levelData.player2Spawn.col !== p1Col || levelData.player2Spawn.row !== p1Row)) {
            this.player2 = new Player(levelData.player2Spawn.col * CONSTANTS.TILE_SIZE, levelData.player2Spawn.row * CONSTANTS.TILE_SIZE, this.selectedCharacterP2, 2);
        } else {
            this.player2 = null;
        }

        // Instancia Inimigos customizados
        this.enemies = [];
        if (levelData.enemies && Array.isArray(levelData.enemies)) {
            for (let e of levelData.enemies) {
                this.enemies.push(new Enemy(e.col * CONSTANTS.TILE_SIZE, e.row * CONSTANTS.TILE_SIZE, e.type));
            }
        }

        // Instancia Boss se configurado
        if (levelData.boss) {
            this.boss = new Boss(levelData.boss.col * CONSTANTS.TILE_SIZE, levelData.boss.row * CONSTANTS.TILE_SIZE);
        } else {
            this.boss = null;
        }

        this.bombs = [];
        this.rasengans = [];
        this.chidoris = [];

        window.soundManager?.playGameStart();
        window.soundManager?.startBGM('stage');
        this.updateUI();
    }

    togglePause() {
        if (this.state !== CONSTANTS.STATE_PLAYING && this.state !== CONSTANTS.STATE_CUTSCENE) return;
        this.isPaused = !this.isPaused;
        if (this.isPaused) {
            window.soundManager?.playPause();
            this.openModal('modal-pause');
        } else {
            this.closeModal('modal-pause');
        }
    }

    toggleSound() {
        if (window.soundManager) {
            window.soundManager.toggle();
            this.updateSoundButtonUI();
        }
    }

    updateSoundButtonUI() {
        const isEnabled = window.soundManager ? window.soundManager.enabled : true;
        const soundIcon = document.getElementById('sound-icon');
        const soundLabel = document.getElementById('sound-label');
        const inGameSoundBtn = document.getElementById('in-game-sound-btn');

        if (soundIcon) soundIcon.innerText = isEnabled ? '🔊' : '🔇';
        if (soundLabel) soundLabel.innerText = isEnabled ? 'SOM: ON' : 'SOM: OFF';
        if (inGameSoundBtn) inGameSoundBtn.innerText = isEnabled ? '🔊' : '🔇';
    }

    startGame() {
        if (this.mode === CONSTANTS.GAME_MODES.BUILDER) {
            this.openLevelEditor();
            return;
        }

        window.soundManager?.playGameStart();
        
        this.lives = 3;
        this.score = 0;
        this.level = 1;
        this.wave = 1;
        this.isPaused = false;
        this.pvpMatchTimer = 60000;
        this.suddenDeathStarted = false;

        const baseSpeed = (this.selectedCharacter === 'hero_sasuke') ? 2.5 
                        : (this.selectedCharacter === 'hero_naruto') ? 2.4 
                        : (this.selectedCharacter === 'hero_warrior') ? 2.6
                        : 2.2;
        this.playerStats = {
            bombCapacity: 1,
            bombRadius: 2,
            speed: baseSpeed,
            speedLevel: 1,
            rasenganAmmo: 0
        };
        
        document.getElementById('start-menu-screen')?.classList.add('hidden');
        document.getElementById('builder-ui-layer')?.classList.add('hidden');
        document.getElementById('game-over-screen')?.classList.add('hidden');
        document.getElementById('modal-pause')?.classList.add('hidden');
        document.getElementById('ui-layer')?.classList.remove('hidden');
        
        this.initLevel(this.level);
    }

    openMenu() {
        this.returnToMenu();
    }

    returnToMenu() {
        window.soundManager?.playSelect();
        this.saveHighScore();
        
        this.state = CONSTANTS.STATE_MENU;
        this.isPaused = false;
        
        document.getElementById('dialogue-overlay')?.classList.add('hidden');
        document.getElementById('builder-ui-layer')?.classList.add('hidden');
        document.getElementById('start-menu-screen')?.classList.remove('hidden');
        document.getElementById('game-over-screen')?.classList.add('hidden');
        document.getElementById('modal-pause')?.classList.add('hidden');
        document.getElementById('ui-layer')?.classList.add('hidden');

        window.soundManager?.startBGM('menu');
    }

    handleKey(e, isDown) {
        // Ignora digitação em caixas de texto (ex: modal JSON)
        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
            return;
        }

        const keyLower = e.key ? e.key.toLowerCase() : '';
        const gameKeyList = [' ', 'space', 'enter', 'escape', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', 'z', 'x', 'l', 'k', 'b', 'p'];
        if (gameKeyList.includes(keyLower) || e.key === ' ') {
            e.preventDefault();
        }

        // Se houver diálogo ativo, teclas Espaço/Enter avançam e ESC pula
        const dialogueOverlay = document.getElementById('dialogue-overlay');
        const isDialogueOpen = dialogueOverlay && !dialogueOverlay.classList.contains('hidden');

        if (isDialogueOpen) {
            if (isDown) {
                if (e.key === ' ' || keyLower === 'space' || e.key === 'Enter') {
                    window.dialogueSystem?.advance();
                } else if (e.key === 'Escape') {
                    window.dialogueSystem?.skip();
                }
            }
            return;
        }

        if (this.state === CONSTANTS.STATE_MENU && isDown) {
            if (e.key === 'Enter' || e.key === ' ' || keyLower === 'space') {
                const anyModalOpen = !document.getElementById('modal-how-to-play')?.classList.contains('hidden') ||
                                     !document.getElementById('modal-guide')?.classList.contains('hidden') ||
                                     !document.getElementById('modal-builder-json')?.classList.contains('hidden');
                if (!anyModalOpen) {
                    this.startGame();
                    return;
                }
            }
        }

        if (e.key === 'Escape' || keyLower === 'p') {
            if (isDown) {
                if (this.state === CONSTANTS.STATE_PLAYING) {
                    this.togglePause();
                    return;
                } else if (this.state === CONSTANTS.STATE_MENU) {
                    this.closeModal('modal-how-to-play');
                    this.closeModal('modal-guide');
                    this.closeModal('modal-builder-json');
                }
            }
            return;
        }

        // Tecla [B] para voltar ao editor durante o Playtest Customizado
        if (isDown && (keyLower === 'b') && this.mode === CONSTANTS.GAME_MODES.CUSTOM) {
            this.openLevelEditor();
            return;
        }

        if (this.state === CONSTANTS.STATE_CUTSCENE) return;

        // Controles Jogador 1 (WASD + Espaço + Z + X)
        if (this.player) {
            switch(keyLower) {
                case 'w': this.player.keys.up = isDown; break;
                case 's': this.player.keys.down = isDown; break;
                case 'a': this.player.keys.left = isDown; break;
                case 'd': this.player.keys.right = isDown; break;
                case ' ':
                case 'space': this.player.keys.action = isDown; break;
                case 'z': this.player.keys.special = isDown; break;
                case 'x': this.player.keys.remote = isDown; break;
                case 'arrowup': if (this.mode !== CONSTANTS.GAME_MODES.PVP) this.player.keys.up = isDown; break;
                case 'arrowdown': if (this.mode !== CONSTANTS.GAME_MODES.PVP) this.player.keys.down = isDown; break;
                case 'arrowleft': if (this.mode !== CONSTANTS.GAME_MODES.PVP) this.player.keys.left = isDown; break;
                case 'arrowright': if (this.mode !== CONSTANTS.GAME_MODES.PVP) this.player.keys.right = isDown; break;
            }
        }

        // Controles Jogador 2 (Setas + Enter/Numpad0 + L + K)
        if (this.player2 && this.mode === CONSTANTS.GAME_MODES.PVP) {
            switch(keyLower) {
                case 'arrowup': this.player2.keys.up = isDown; break;
                case 'arrowdown': this.player2.keys.down = isDown; break;
                case 'arrowleft': this.player2.keys.left = isDown; break;
                case 'arrowright': this.player2.keys.right = isDown; break;
                case 'enter':
                case 'numpad0': this.player2.keys.action = isDown; break;
                case 'l':
                case 'shift': this.player2.keys.special = isDown; break;
                case 'k': this.player2.keys.remote = isDown; break;
            }
        }
    }

    initLevel(levelNum) {
        this.particleSystem.clear();
        this.map.generate(this.mode, levelNum);
        
        this.player = new Player(CONSTANTS.TILE_SIZE, CONSTANTS.TILE_SIZE, this.selectedCharacter, 1);
        
        if (this.playerStats && this.mode !== CONSTANTS.GAME_MODES.PVP) {
            this.player.bombCapacity = this.playerStats.bombCapacity;
            this.player.bombRadius = this.playerStats.bombRadius;
            this.player.speed = this.playerStats.speed;
            this.player.speedLevel = this.playerStats.speedLevel;
            this.player.rasenganAmmo = this.playerStats.rasenganAmmo || 0;
        }
        
        if (this.mode === CONSTANTS.GAME_MODES.PVP) {
            const p2X = (CONSTANTS.GRID_WIDTH - 2) * CONSTANTS.TILE_SIZE;
            const p2Y = (CONSTANTS.GRID_HEIGHT - 2) * CONSTANTS.TILE_SIZE;
            this.player2 = new Player(p2X, p2Y, this.selectedCharacterP2, 2);
            this.pvpMatchTimer = 60000;
            this.suddenDeathStarted = false;
        } else {
            this.player2 = null;
        }
        
        this.enemies = [];
        this.bombs = [];
        this.rasengans = [];
        this.chidoris = [];
        this.boss = null;
        
        if (this.mode === CONSTANTS.GAME_MODES.CAMPAIGN) {
            if (levelNum === 1) {
                // Capítulo 1: Floresta
                this.spawnEnemyList([CONSTANTS.ENEMY_TYPES.BALLOM, CONSTANTS.ENEMY_TYPES.BALLOM, CONSTANTS.ENEMY_TYPES.ONEAL]);
            } else if (levelNum === 2) {
                // Capítulo 2: Caverna de Cristais
                this.spawnEnemyList([CONSTANTS.ENEMY_TYPES.BALLOM, CONSTANTS.ENEMY_TYPES.ONEAL, CONSTANTS.ENEMY_TYPES.ONEAL, CONSTANTS.ENEMY_TYPES.DAHL]);
            } else if (levelNum === 3) {
                // Capítulo 3: Forja Vulcânica
                this.spawnEnemyList([CONSTANTS.ENEMY_TYPES.BALLOM, CONSTANTS.ENEMY_TYPES.ONEAL, CONSTANTS.ENEMY_TYPES.DAHL, CONSTANTS.ENEMY_TYPES.DAHL, CONSTANTS.ENEMY_TYPES.MINVO]);
            } else if (levelNum === 4) {
                // Capítulo 4: Laboratório Cibernético
                this.spawnEnemyList([CONSTANTS.ENEMY_TYPES.ONEAL, CONSTANTS.ENEMY_TYPES.ONEAL, CONSTANTS.ENEMY_TYPES.DAHL, CONSTANTS.ENEMY_TYPES.MINVO, CONSTANTS.ENEMY_TYPES.MINVO]);
            } else if (levelNum === 5) {
                // Capítulo 5: O Trono do Titã Mecânico (Boss Final)
                const centerX = Math.floor(CONSTANTS.GRID_WIDTH / 2) * CONSTANTS.TILE_SIZE;
                const centerY = Math.floor(CONSTANTS.GRID_HEIGHT / 2) * CONSTANTS.TILE_SIZE;
                this.boss = new Boss(centerX, centerY);
            }

            if (levelNum < CONSTANTS.MAX_CAMPAIGN_LEVELS && !this.map.keyInCrate && this.enemies.length > 0) {
                const chosenEnemy = this.enemies[Math.floor(Math.random() * this.enemies.length)];
                chosenEnemy.hasKey = true;
            }
        } else if (this.mode === CONSTANTS.GAME_MODES.ENDLESS) {
            this.spawnEndlessWave(this.wave);
        }
        
        this.updateUI();

        // Inicia Diálogo Narrativo se for Modo História
        if (this.mode === CONSTANTS.GAME_MODES.CAMPAIGN) {
            const dialogueKey = `ch${levelNum}_${levelNum === 5 ? 'boss_intro' : 'intro'}`;
            this.state = CONSTANTS.STATE_CUTSCENE;
            window.dialogueSystem?.startDialogue(dialogueKey, this.selectedCharacter, () => {
                this.state = CONSTANTS.STATE_PLAYING;
                if (this.player) {
                    this.player.keys.action = false;
                    this.player.keys.up = false;
                    this.player.keys.down = false;
                    this.player.keys.left = false;
                    this.player.keys.right = false;
                    this.player.actionPressed = false;
                }
                if (levelNum === 5) {
                    window.soundManager?.startBGM('boss');
                } else {
                    window.soundManager?.startBGM('stage');
                }
            });
        } else if (this.mode === CONSTANTS.GAME_MODES.PVP) {
            this.state = CONSTANTS.STATE_PLAYING;
            window.soundManager?.startBGM('pvp');
        } else {
            this.state = CONSTANTS.STATE_PLAYING;
            window.soundManager?.startBGM('stage');
        }
    }

    spawnEndlessWave(waveNum) {
        this.enemies = [];
        const enemyList = [];
        const count = 3 + waveNum * 2;
        
        for (let i = 0; i < count; i++) {
            if (i % 4 === 0 && waveNum >= 3) enemyList.push(CONSTANTS.ENEMY_TYPES.MINVO);
            else if (i % 3 === 0 && waveNum >= 2) enemyList.push(CONSTANTS.ENEMY_TYPES.DAHL);
            else if (i % 2 === 0) enemyList.push(CONSTANTS.ENEMY_TYPES.ONEAL);
            else enemyList.push(CONSTANTS.ENEMY_TYPES.BALLOM);
        }

        this.spawnEnemyList(enemyList);
        this.particleSystem.addFloatingText(CONSTANTS.CANVAS_WIDTH / 2, 200, `ONDA ${waveNum}!`, '#00e5ff', 24, true);
    }

    spawnEnemyList(typeList) {
        for (let type of typeList) {
            let spawned = false;
            let attempts = 0;
            while (!spawned && attempts < 100) {
                attempts++;
                let col = Math.floor(Math.random() * CONSTANTS.GRID_WIDTH);
                let row = Math.floor(Math.random() * CONSTANTS.GRID_HEIGHT);
                
                if ((col > 3 || row > 3) && this.map.grid[row][col] === CONSTANTS.TILE_EMPTY) {
                    this.enemies.push(new Enemy(col * CONSTANTS.TILE_SIZE, row * CONSTANTS.TILE_SIZE, type));
                    spawned = true;
                }
            }
        }
    }

    updateUI() {
        const charEl = document.getElementById('char-display');
        const scoreEl = document.getElementById('score-display');
        const levelEl = document.getElementById('level-display');
        const livesEl = document.getElementById('lives-display');
        const keyEl = document.getElementById('key-display');
        
        const powerBombsEl = document.getElementById('hud-power-bombs');
        const powerFireEl = document.getElementById('hud-power-fire');
        const powerSpeedEl = document.getElementById('hud-power-speed');
        const powerRasenganEl = document.getElementById('hud-power-rasengan');
        const statRasenganBox = document.getElementById('hud-stat-rasengan');
        const statShieldEl = document.getElementById('hud-stat-shield');
        const powerShieldEl = document.getElementById('hud-power-shield');
        
        if (charEl) {
            if (this.mode === CONSTANTS.GAME_MODES.CUSTOM) {
                charEl.innerText = `🛠️ ${this.lastCustomLevelData?.name || 'Playtest Custom'}`;
            } else if (this.mode === CONSTANTS.GAME_MODES.PVP) {
                charEl.innerText = `⚔️ PvP: P1 (${this.p1Wins}) x (${this.p2Wins}) P2`;
            } else if (this.selectedCharacter === 'hero_sasuke') {
                charEl.innerText = '⚡ Sasuke';
            } else if (this.selectedCharacter === 'hero_naruto') {
                charEl.innerText = '🍥 Naruto';
            } else if (this.selectedCharacter === 'hero_warrior') {
                charEl.innerText = '⚔️ Guerreiro';
            } else {
                charEl.innerText = '💣 Bomberman';
            }
        }

        const isSasuke = (this.selectedCharacter === 'hero_sasuke');
        const isWarrior = (this.selectedCharacter === 'hero_warrior');
        const specialTextEl = document.querySelector('#hud-stat-rasengan .power-text');
        const specialIconEl = document.querySelector('#hud-stat-rasengan .power-icon');
        if (specialTextEl) {
            specialTextEl.innerText = isSasuke ? 'Chidori:' : (isWarrior ? 'Ciclone:' : 'Rasengan:');
        }
        if (specialIconEl) {
            specialIconEl.innerText = isSasuke ? '⚡' : (isWarrior ? '🔥' : '🌀');
        }

        if (scoreEl) scoreEl.innerText = `Score: ${this.score}`;
        
        if (levelEl) {
            if (this.mode === CONSTANTS.GAME_MODES.CUSTOM) {
                levelEl.innerText = "Fase: Criada [B: Editor]";
            } else if (this.mode === CONSTANTS.GAME_MODES.ENDLESS) {
                levelEl.innerText = `Onda: ${this.wave}`;
            } else if (this.mode === CONSTANTS.GAME_MODES.PVP) {
                const secs = Math.max(0, Math.ceil(this.pvpMatchTimer / 1000));
                levelEl.innerText = this.suddenDeathStarted ? "🔥 SUDDEN DEATH!" : `⏱️ ${secs}s`;
            } else {
                const chapterNames = ['Floresta', 'Cristais', 'Vulcão', 'Cyber Lab', 'BOSS TITÃ'];
                levelEl.innerText = `Capítulo ${this.level}: ${chapterNames[this.level - 1] || ''}`;
            }
        }

        if (livesEl) {
            livesEl.innerText = (this.mode === CONSTANTS.GAME_MODES.PVP) ? `❤️ P1:${this.player?.isAlive?1:0} P2:${this.player2?.isAlive?1:0}` : `❤️ ${this.lives}`;
        }

        const currentBombs = this.player ? this.player.bombCapacity : 1;
        const currentFire = this.player ? this.player.bombRadius : 2;
        const currentSpeedLevel = this.player ? (this.player.speedLevel || 1) : 1;
        const currentRasengan = this.player ? (this.player.rasenganAmmo || 0) : 0;

        if (powerBombsEl) powerBombsEl.innerText = `${currentBombs}`;
        if (powerFireEl) powerFireEl.innerText = `${currentFire}`;
        if (powerSpeedEl) powerSpeedEl.innerText = `Nv.${currentSpeedLevel}`;
        if (powerRasenganEl) powerRasenganEl.innerText = `${currentRasengan}`;

        if (statRasenganBox) {
            if (currentRasengan > 0) statRasenganBox.classList.add('active-ready');
            else statRasenganBox.classList.remove('active-ready');
        }

        const statSpikeEl = document.getElementById('hud-stat-spike');
        if (statSpikeEl && this.player) {
            if (this.player.hasSpikeBomb) statSpikeEl.classList.remove('hidden');
            else statSpikeEl.classList.add('hidden');
        }

        if (statShieldEl && powerShieldEl && this.player) {
            if (this.player.hasShield) {
                statShieldEl.classList.remove('hidden');
                powerShieldEl.innerText = `${Math.ceil(this.player.shieldTimer / 1000)}s`;
            } else if (this.player.spawnShieldTimer > 0) {
                statShieldEl.classList.remove('hidden');
                powerShieldEl.innerText = "Imune!";
            } else {
                statShieldEl.classList.add('hidden');
            }
        }

        if (keyEl) {
            if (this.mode === CONSTANTS.GAME_MODES.CUSTOM) {
                if (this.map.door && this.map.door.isRevealed) {
                    keyEl.innerText = this.player?.hasKey ? "🔑 Porta Aberta!" : "🚪 Portal Revelado!";
                } else {
                    keyEl.innerText = `👾 Monstros: ${this.enemies.filter(e => e.isAlive).length}`;
                }
            } else if (this.mode === CONSTANTS.GAME_MODES.ENDLESS) {
                keyEl.innerText = `🌊 Monstros: ${this.enemies.filter(e => e.isAlive).length}`;
            } else if (this.mode === CONSTANTS.GAME_MODES.PVP) {
                keyEl.innerText = "⚔️ Batalha 1v1";
            } else if (this.level === CONSTANTS.MAX_CAMPAIGN_LEVELS) {
                keyEl.innerText = "👑 Derrote o Titã!";
                keyEl.classList.remove("key-found");
            } else if (this.player && this.player.hasKey) {
                keyEl.innerText = "🔑 Chave: ✅ PORTAL ABERTO!";
                keyEl.classList.add("key-found");
            } else {
                keyEl.innerText = "🔑 Chave: ❌ Procure!";
                keyEl.classList.remove("key-found");
            }
        }
    }

    checkPowerUpCollection(pEntity) {
        if (!pEntity || !pEntity.isAlive) return;
        const playerGrid = pEntity.getGridPos();

        for (let i = this.map.powerUps.length - 1; i >= 0; i--) {
            const p = this.map.powerUps[i];
            if (p.col === playerGrid.col && p.row === playerGrid.row) {
                const itemX = p.col * CONSTANTS.TILE_SIZE + 24;
                const itemY = p.row * CONSTANTS.TILE_SIZE + 24;

                if (p.type === 'rasengan') {
                    pEntity.rasenganAmmo = (pEntity.rasenganAmmo || 0) + 1;
                    if (this.playerStats && pEntity.playerIndex === 1) this.playerStats.rasenganAmmo = pEntity.rasenganAmmo;
                    this.score += 250;
                    this.particleSystem.addFloatingText(itemX, itemY - 15, "+CHAKRA!", "#00e5ff", 12, true);
                    if (pEntity.character === 'hero_sasuke') window.soundManager?.playChidoriZap();
                    else window.soundManager?.playRasenganCollect();

                } else if (p.type === 'remote') {
                    pEntity.hasRemoteTrigger = true;
                    this.score += 200;
                    this.particleSystem.addFloatingText(itemX, itemY - 15, "DETONADOR [X]!", "#e91e63", 12, true);
                    window.soundManager?.playPowerUp();

                } else if (p.type === 'spike') {
                    pEntity.hasSpikeBomb = true;
                    this.score += 200;
                    this.particleSystem.addFloatingText(itemX, itemY - 15, "📌 SPIKE BOMB!", "#ff1744", 12, true);
                    window.soundManager?.playPowerUp();

                } else if (p.type === 'skull') {
                    const curses = [CONSTANTS.CURSE_TYPES.DIARRHEA, CONSTANTS.CURSE_TYPES.INVERTED, CONSTANTS.CURSE_TYPES.SLOW, CONSTANTS.CURSE_TYPES.FAST];
                    const chosen = curses[Math.floor(Math.random() * curses.length)];
                    pEntity.applyCurse(chosen);
                    this.particleSystem.addFloatingText(itemX, itemY - 15, `MALDIÇÃO: ${chosen.toUpperCase()}!`, "#ab47bc", 12, true);

                } else if (p.type === 'ice') {
                    pEntity.hasIceBomb = true;
                    this.score += 150;
                    this.particleSystem.addFloatingText(itemX, itemY - 15, "BOMBA DE GELO!", "#00e5ff", 12, true);
                    window.soundManager?.playFreeze();

                } else {
                    window.soundManager?.playPowerUp();
                    if (p.type === 'bomb') {
                        pEntity.bombCapacity++;
                        if (this.playerStats && pEntity.playerIndex === 1) this.playerStats.bombCapacity = pEntity.bombCapacity;
                        this.score += 100;
                        this.particleSystem.addFloatingText(itemX, itemY - 15, "+1 BOMBA", "#ffd54f", 11);
                    } else if (p.type === 'fire') {
                        pEntity.bombRadius++;
                        if (this.playerStats && pEntity.playerIndex === 1) this.playerStats.bombRadius = pEntity.bombRadius;
                        this.score += 100;
                        this.particleSystem.addFloatingText(itemX, itemY - 15, "+FOGO", "#ff5722", 11);
                    } else if (p.type === 'speed') {
                        pEntity.speed = Math.min(4.0, +(pEntity.speed + 0.25).toFixed(2));
                        pEntity.speedLevel = (pEntity.speedLevel || 1) + 1;
                        if (this.playerStats && pEntity.playerIndex === 1) {
                            this.playerStats.speed = pEntity.speed;
                            this.playerStats.speedLevel = pEntity.speedLevel;
                        }
                        this.score += 100;
                        this.particleSystem.addFloatingText(itemX, itemY - 15, "+VELOCIDADE", "#29b6f6", 11);
                    } else if (p.type === 'heart') {
                        this.lives++;
                        this.score += 200;
                        this.particleSystem.addFloatingText(itemX, itemY - 15, "+1 VIDA ❤️", "#ff5252", 12, true);
                    } else if (p.type === 'shield') {
                        pEntity.hasShield = true;
                        pEntity.shieldTimer = 10000;
                        this.score += 150;
                        this.particleSystem.addFloatingText(itemX, itemY - 15, "ESCUDO!", "#00e676", 12, true);
                    } else if (p.type === 'key') {
                        pEntity.hasKey = true;
                        this.score += 300;
                        this.particleSystem.addFloatingText(itemX, itemY - 15, "🔑 CHAVE OBTIDA!", "#ffd54f", 13, true);
                    }
                }

                this.updateUI();
                this.map.powerUps.splice(i, 1);
            }
        }
    }

    checkCollisions() {
        const checkPlayerKill = (p) => {
            if (!p || !p.isAlive) return;
            const isInvulnerable = p.hasShield || p.spawnShieldTimer > 0;
            if (isInvulnerable) return;

            for (let enemy of this.enemies) {
                if (enemy.isAlive && p.checkCollision(enemy)) {
                    this.killPlayer(p);
                    return;
                }
            }

            if (this.boss && this.boss.isAlive && p.checkCollision(this.boss)) {
                this.killPlayer(p);
                return;
            }
        };

        checkPlayerKill(this.player);
        if (this.mode === CONSTANTS.GAME_MODES.PVP) {
            checkPlayerKill(this.player2);
        }

        // Explosão vs Entidades
        for (let bomb of this.bombs) {
            if (bomb.exploded && !bomb.toBeRemoved) {
                for (let blast of bomb.blasts) {
                    const blastHitbox = {
                        x: blast.col * CONSTANTS.TILE_SIZE,
                        y: blast.row * CONSTANTS.TILE_SIZE,
                        width: CONSTANTS.TILE_SIZE,
                        height: CONSTANTS.TILE_SIZE
                    };

                    for (let pIdx = this.map.powerUps.length - 1; pIdx >= 0; pIdx--) {
                        const p = this.map.powerUps[pIdx];
                        if (p.col === blast.col && p.row === blast.row) {
                            if (p.immunityTimer <= 0 && p.type !== 'key') {
                                this.map.powerUps.splice(pIdx, 1);
                            }
                        }
                    }

                    const damagePlayer = (p) => {
                        if (!p || !p.isAlive) return;
                        if (p.hasShield || p.spawnShieldTimer > 0) return;
                        if (p.checkCollision(blastHitbox)) {
                            this.killPlayer(p);
                        }
                    };

                    damagePlayer(this.player);
                    if (this.mode === CONSTANTS.GAME_MODES.PVP) {
                        damagePlayer(this.player2);
                    }

                    for (let enemy of this.enemies) {
                        if (enemy.isAlive && enemy.checkCollision(blastHitbox)) {
                            if (bomb.isIce) {
                                enemy.freeze(4000);
                            }
                            const isDead = enemy.takeDamage(1, this.map);
                            if (isDead) {
                                this.comboCount++;
                                const comboBonus = (this.comboCount > 1) ? this.comboCount * 150 : 0;
                                this.score += (enemy.scoreValue || 150) + comboBonus;
                                
                                if (this.comboCount > 1) {
                                    this.particleSystem.addFloatingText(enemy.x + 24, enemy.y - 10, `COMBO x${this.comboCount}! +${comboBonus}`, "#00e5ff", 14, true);
                                }
                                this.updateUI();
                            }
                        }
                    }
                    
                    if (this.boss && this.boss.isAlive && this.boss.checkCollision(blastHitbox)) {
                        if (this.boss.state !== 'damage') {
                            this.boss.takeDamage(1);
                            this.score += 100;
                            this.particleSystem.addFloatingText(this.boss.x + this.boss.width/2, this.boss.y - 15, "-1 HP BOSS!", "#ff1744", 13, true);
                            this.updateUI();
                            
                            if (!this.boss.isAlive) {
                                this.score += 5000;
                                this.updateUI();
                            }
                        }
                    }
                }
            }
        }
    }

    killPlayer(deadPlayer) {
        if (!deadPlayer || !deadPlayer.isAlive) return;
        deadPlayer.isAlive = false;
        
        this.particleSystem.addScreenShake(12, 350);
        this.particleSystem.createExplosionSparks(deadPlayer.x + deadPlayer.width/2, deadPlayer.y + deadPlayer.height/2, '#ff1744', 25);

        if (this.mode === CONSTANTS.GAME_MODES.PVP) {
            const winnerIdx = deadPlayer.playerIndex === 1 ? 2 : 1;
            if (winnerIdx === 1) this.p1Wins++;
            else this.p2Wins++;

            this.updateUI();
            window.soundManager?.playVictory();

            setTimeout(() => {
                this.initLevel(1);
            }, 1800);
            return;
        }

        this.lives--;
        this.updateUI();
        
        if (this.lives <= 0) {
            this.saveHighScore();
            window.soundManager?.playGameOver();
            
            setTimeout(() => {
                this.state = CONSTANTS.STATE_GAME_OVER;
                const titleEl = document.getElementById('game-over-title');
                const scoreValEl = document.getElementById('final-score-val');
                
                if (titleEl) {
                    titleEl.innerText = "GAME OVER";
                    titleEl.style.color = "#ff3333";
                }
                if (scoreValEl) {
                    scoreValEl.innerText = this.score;
                }
                document.getElementById('game-over-screen')?.classList.remove('hidden');
            }, 700);
        } else {
            setTimeout(() => {
                if (this.state !== CONSTANTS.STATE_GAME_OVER && this.state !== CONSTANTS.STATE_MENU) {
                    this.initLevel(this.level);
                }
            }, 1000);
        }
    }

    checkLevelClear() {
        if (this.mode === CONSTANTS.GAME_MODES.CAMPAIGN) {
            if (this.level < CONSTANTS.MAX_CAMPAIGN_LEVELS) {
                if (this.map.door && (this.map.door.isRevealed || this.map.grid[this.map.door.row][this.map.door.col] === CONSTANTS.TILE_EMPTY)) {
                    const playerGrid = this.player.getGridPos();
                    if (playerGrid.col === this.map.door.col && playerGrid.row === this.map.door.row) {
                        if (this.player.hasKey) {
                            window.soundManager?.playVictory();
                            this.score += 500;
                            this.level++;
                            this.particleSystem.addFloatingText(CONSTANTS.CANVAS_WIDTH/2, CONSTANTS.CANVAS_HEIGHT/2, `CAPÍTULO ${this.level}!`, "#00e676", 24, true);
                            setTimeout(() => this.initLevel(this.level), 800);
                        }
                    }
                }
            } else if (this.level === CONSTANTS.MAX_CAMPAIGN_LEVELS) {
                if (this.boss && !this.boss.isAlive && this.boss.deathTimer > 1500) {
                    this.saveHighScore();
                    window.soundManager?.playVictory();
                    
                    // Dispara Epílogo da História
                    this.state = CONSTANTS.STATE_CUTSCENE;
                    window.dialogueSystem?.startDialogue('victory_epilogue', this.selectedCharacter, () => {
                        this.state = CONSTANTS.STATE_VICTORY;
                        const titleEl = document.getElementById('game-over-title');
                        const scoreValEl = document.getElementById('final-score-val');
                        
                        if (titleEl) {
                            titleEl.innerText = "👑 VITÓRIA TOTAL!";
                            titleEl.style.color = "#4CAF50";
                        }
                        if (scoreValEl) scoreValEl.innerText = this.score;
                        document.getElementById('game-over-screen')?.classList.remove('hidden');
                    });
                }
            }
        } else if (this.mode === CONSTANTS.GAME_MODES.ENDLESS) {
            if (this.enemies.length > 0 && this.enemies.every(e => !e.isAlive)) {
                window.soundManager?.playVictory();
                this.wave++;
                this.score += this.wave * 300;
                this.saveHighScore();
                setTimeout(() => this.initLevel(1), 1200);
            }
        } else if (this.mode === CONSTANTS.GAME_MODES.CUSTOM) {
            let customCleared = false;
            if (this.map.door && (this.map.door.isRevealed || this.map.grid[this.map.door.row][this.map.door.col] === CONSTANTS.TILE_EMPTY)) {
                const playerGrid = this.player?.getGridPos();
                if (playerGrid && playerGrid.col === this.map.door.col && playerGrid.row === this.map.door.row) {
                    if (this.player.hasKey) customCleared = true;
                }
            } else if (this.enemies.length > 0 && this.enemies.every(e => !e.isAlive) && (!this.boss || !this.boss.isAlive)) {
                customCleared = true;
            }

            if (customCleared) {
                window.soundManager?.playVictory();
                this.particleSystem.addFloatingText(CONSTANTS.CANVAS_WIDTH/2, CONSTANTS.CANVAS_HEIGHT/2, "FASE CONCLUÍDA!", "#00e676", 26, true);
                setTimeout(() => {
                    alert("🎉 Parabéns! Você concluiu a fase personalizada!");
                    this.openLevelEditor();
                }, 1200);
            }
        }
    }

    loop(timestamp) {
        if (!this.lastTime) this.lastTime = timestamp;
        const dt = Math.min(timestamp - this.lastTime, 50);
        this.lastTime = timestamp;

        if (this.state === CONSTANTS.STATE_BUILDER) {
            this.levelEditor.render(this.spriteLoader);
        } else if ((this.state === CONSTANTS.STATE_PLAYING || this.state === CONSTANTS.STATE_CUTSCENE) && this.isLoaded && !this.isPaused) {
            this.update(dt);
            this.draw();
        }
        
        requestAnimationFrame((t) => this.loop(t));
    }

    update(dt) {
        this.map.update(dt);
        this.particleSystem.update(dt);

        if (this.mode === CONSTANTS.GAME_MODES.PVP) {
            if (this.pvpMatchTimer > 0) {
                this.pvpMatchTimer -= dt;
                if (this.pvpMatchTimer <= 0) {
                    this.suddenDeathStarted = true;
                    window.soundManager?.playSuddenDeath();
                    this.particleSystem.addFloatingText(CONSTANTS.CANVAS_WIDTH/2, 200, "🔥 SUDDEN DEATH!", "#ff1744", 26, true);
                }
            } else if (this.suddenDeathStarted) {
                this.suddenDeathDropTimer += dt;
                if (this.suddenDeathDropTimer > 400) {
                    this.map.spawnNextSuddenDeathBlock(this.particleSystem);
                    this.suddenDeathDropTimer = 0;
                }
            }
        }

        if (this.lightingSystem) {
            this.lightingSystem.clear();
            
            // Luz do Jogador 1
            if (this.player && this.player.isAlive) {
                const pPulse = 1 + Math.sin(Date.now() / 300) * 0.05;
                const pColor = (this.player.character === 'hero_sasuke') ? 'rgba(0, 229, 255, 0.4)' 
                             : (this.player.character === 'hero_naruto') ? 'rgba(255, 152, 0, 0.4)'
                             : (this.player.character === 'hero_warrior') ? 'rgba(255, 87, 34, 0.45)'
                             : 'rgba(255, 213, 79, 0.35)';
                this.lightingSystem.addLight(this.player.x + this.player.width/2, this.player.y + this.player.height/2, 140 * pPulse, pColor, 0.9);
            }

            // Luz do Jogador 2 (PvP)
            if (this.player2 && this.player2.isAlive && this.mode === CONSTANTS.GAME_MODES.PVP) {
                this.lightingSystem.addLight(this.player2.x + this.player2.width/2, this.player2.y + this.player2.height/2, 140, 'rgba(0, 229, 255, 0.4)', 0.9);
            }

            // Luz do Boss
            if (this.boss && this.boss.isAlive) {
                const bossPulse = 1 + Math.sin(Date.now() / 150) * 0.1;
                this.lightingSystem.addLight(this.boss.x + this.boss.width/2, this.boss.y + this.boss.height/2, 180 * bossPulse, 'rgba(255, 23, 68, 0.5)', 0.95);
            }

            // Brilho dos Itens / Power-ups
            if (this.map && this.map.powerUps) {
                for (let p of this.map.powerUps) {
                    this.lightingSystem.addLight(p.col * CONSTANTS.TILE_SIZE + 24, p.row * CONSTANTS.TILE_SIZE + 24, 50, 'rgba(255, 213, 79, 0.3)', 0.7);
                }
            }
        }

        if (this.state !== CONSTANTS.STATE_CUTSCENE) {
            if (this.player) {
                this.player.update(dt, this.map, this.bombs, this);
                this.checkPowerUpCollection(this.player);
            }

            if (this.player2 && this.mode === CONSTANTS.GAME_MODES.PVP) {
                this.player2.update(dt, this.map, this.bombs, this);
                this.checkPowerUpCollection(this.player2);
            }

            for (let i = this.rasengans.length - 1; i >= 0; i--) {
                this.rasengans[i].update(dt, this.map, this.enemies, this.boss, this);
                if (this.rasengans[i].toBeRemoved) this.rasengans.splice(i, 1);
            }

            if (this.chidoris) {
                for (let i = this.chidoris.length - 1; i >= 0; i--) {
                    this.chidoris[i].update(dt, this.map, this.enemies, this.boss, this);
                    if (this.chidoris[i].toBeRemoved) this.chidoris.splice(i, 1);
                }
            }

            for (let i = this.enemies.length - 1; i >= 0; i--) {
                this.enemies[i].update(dt, this.map, this.player, this.bombs);
                if (this.enemies[i].toBeRemoved) this.enemies.splice(i, 1);
            }
            
            if (this.boss) {
                this.boss.update(dt, this.map, this.player, this.bombs, this.enemies, this.particleSystem);
            }

            for (let i = this.bombs.length - 1; i >= 0; i--) {
                this.bombs[i].update(dt, this.map, this.bombs, this.enemies, this.boss, this.particleSystem, this.lightingSystem);
                if (this.bombs[i].toBeRemoved) this.bombs.splice(i, 1);
            }

            this.checkCollisions();
            this.updateUI();
            
            if (this.player && this.player.isAlive) {
                this.checkLevelClear();
            }
        }
    }

    draw() {
        this.ctx.save();
        this.ctx.translate(this.particleSystem.shakeOffsetX, this.particleSystem.shakeOffsetY);
        this.ctx.clearRect(-20, -20, CONSTANTS.CANVAS_WIDTH + 40, CONSTANTS.CANVAS_HEIGHT + 40);

        // 1. Chão e Mapa
        this.map.draw(this.ctx, this.spriteLoader, this.level, this.player);

        // 2. Sombras Suaves Projetadas (Drop Shadows)
        if (this.lightingSystem) {
            this.lightingSystem.drawDropShadows(this.ctx, this.map, [this.player, this.player2], this.enemies, this.boss, this.bombs);
        }

        // 3. Entidades e Itens
        for (let bomb of this.bombs) {
            bomb.draw(this.ctx, this.spriteLoader);
        }

        for (let rasengan of this.rasengans) {
            rasengan.draw(this.ctx, this.spriteLoader);
        }
        if (this.chidoris) {
            for (let chidori of this.chidoris) {
                chidori.draw(this.ctx);
            }
        }

        for (let enemy of this.enemies) {
            enemy.draw(this.ctx, this.spriteLoader);
        }
        
        if (this.boss) {
            this.boss.draw(this.ctx, this.spriteLoader);
        }

        if (this.player) {
            this.player.draw(this.ctx, this.spriteLoader);
        }
        if (this.player2 && this.mode === CONSTANTS.GAME_MODES.PVP) {
            this.player2.draw(this.ctx, this.spriteLoader);
        }

        this.particleSystem.draw(this.ctx);

        // 4. Camada de Iluminação Dinâmica 2D & Vinheta de Pós-processamento
        if (this.lightingSystem) {
            this.lightingSystem.render(this.ctx, this.map.currentLevelBiome);
        }

        this.ctx.restore();
    }
}

window.onload = () => {
    window.gameInstance = new Game();
};
