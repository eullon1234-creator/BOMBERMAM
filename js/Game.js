class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.spriteLoader = new SpriteLoader();
        this.map = new Map();
        
        this.player = null;
        this.enemies = [];
        this.boss = null;
        this.bombs = [];
        this.rasengans = [];
        this.chidoris = [];
        
        this.level = 1;
        this.score = 0;
        this.lives = 3;
        this.highScore = parseInt(localStorage.getItem('bm_high_score') || '0', 10);
        this.selectedCharacter = localStorage.getItem('bm_selected_char') || 'hero';
        
        this.state = CONSTANTS.STATE_MENU;
        this.lastTime = 0;
        this.isLoaded = false;
        
        this.updateHighScoreDisplay();
        this.bindEvents();
        this.init();
    }

    async init() {
        // Carrega e processa todos os spritesheets com Chroma Key
        await this.spriteLoader.preloadAll();
        this.isLoaded = true;
        this.updateSoundButtonUI();
        this.updateCharacterSelectionUI();
        requestAnimationFrame((t) => this.loop(t));
    }

    selectCharacter(charKey) {
        this.selectedCharacter = charKey;
        localStorage.setItem('bm_selected_char', charKey);
        this.updateCharacterSelectionUI();
        window.soundManager?.playSelect();
    }

    updateCharacterSelectionUI() {
        document.querySelectorAll('.char-card').forEach(card => {
            const char = card.getAttribute('data-char');
            if (char === this.selectedCharacter) {
                card.classList.add('active');
            } else {
                card.classList.remove('active');
            }
        });
    }

    updateHighScoreDisplay() {
        const hsMenu = document.getElementById('menu-high-score');
        if (hsMenu) hsMenu.innerText = this.highScore;
    }

    saveHighScore() {
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('bm_high_score', this.highScore.toString());
            this.updateHighScoreDisplay();
        }
    }

    bindEvents() {
        window.addEventListener('keydown', (e) => this.handleKey(e, true));
        window.addEventListener('keyup', (e) => this.handleKey(e, false));
        
        // Botão Iniciar Jogo no Menu
        const startBtn = document.getElementById('btn-start-game');
        if (startBtn) {
            startBtn.addEventListener('click', () => this.startGame());
            startBtn.addEventListener('mouseenter', () => window.soundManager?.playHover());
        }

        // Botões de Como Jogar & Guia (Modais)
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

        // Botões para fechar Modais
        document.querySelectorAll('.modal-close-btn, .close-modal-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetId = e.currentTarget.getAttribute('data-close');
                if (targetId) {
                    window.soundManager?.playHover();
                    this.closeModal(targetId);
                }
            });
        });

        // Fechar modal ao clicar no fundo
        document.querySelectorAll('.modal-backdrop').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.add('hidden');
                }
            });
        });

        // Alternar Som (Menu e In-Game)
        const menuSoundBtn = document.getElementById('btn-sound-toggle');
        if (menuSoundBtn) {
            menuSoundBtn.addEventListener('click', () => this.toggleSound());
        }

        const inGameSoundBtn = document.getElementById('in-game-sound-btn');
        if (inGameSoundBtn) {
            inGameSoundBtn.addEventListener('click', () => this.toggleSound());
        }

        // Seletor de Personagem (Bomberman / Naruto)
        document.querySelectorAll('.char-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const char = card.getAttribute('data-char');
                if (char) {
                    this.selectCharacter(char);
                }
            });
            card.addEventListener('mouseenter', () => window.soundManager?.playHover());
        });

        // Botão de Retornar ao Menu (HUD e Game Over)
        const inGameMenuBtn = document.getElementById('in-game-menu-btn');
        if (inGameMenuBtn) {
            inGameMenuBtn.addEventListener('click', () => this.returnToMenu());
        }

        const returnMenuBtn = document.getElementById('btn-return-menu');
        if (returnMenuBtn) {
            returnMenuBtn.addEventListener('click', () => this.returnToMenu());
        }

        // Botão de Reiniciar após Game Over / Vitória
        const restartBtn = document.getElementById('restart-btn');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => {
                window.soundManager?.playSelect();
                document.getElementById('game-over-screen').classList.add('hidden');
                this.startGame();
            });
            restartBtn.addEventListener('mouseenter', () => window.soundManager?.playHover());
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

    toggleSound() {
        if (window.soundManager) {
            const isEnabled = window.soundManager.toggle();
            this.updateSoundButtonUI();
        }
    }

    updateSoundButtonUI() {
        const isEnabled = window.soundManager ? window.soundManager.enabled : true;
        
        const soundIcon = document.getElementById('sound-icon');
        const soundLabel = document.getElementById('sound-label');
        const inGameSoundBtn = document.getElementById('in-game-sound-btn');

        if (soundIcon) soundIcon.innerText = isEnabled ? '🔊' : '🔇';
        if (soundLabel) soundLabel.innerText = isEnabled ? 'SOM: LIGADO' : 'SOM: MUDO';
        if (inGameSoundBtn) inGameSoundBtn.innerText = isEnabled ? '🔊' : '🔇';
    }

    startGame() {
        window.soundManager?.playGameStart();
        
        this.lives = 3;
        this.score = 0;
        this.level = 1;

        // Inicializa os atributos acumulados para a jornada (persistem entre fases)
        const baseSpeed = (this.selectedCharacter === 'hero_sasuke') ? 2.9 
                        : (this.selectedCharacter === 'hero_naruto') ? 2.8 
                        : (this.selectedCharacter === 'hero_warrior') ? 3.0
                        : 2.6;
        this.playerStats = {
            bombCapacity: 1,
            bombRadius: 2,
            speed: baseSpeed,
            speedLevel: 1,
            rasenganAmmo: 0
        };
        
        // Esconde menu inicial e tela de game over
        const menuScreen = document.getElementById('start-menu-screen');
        if (menuScreen) menuScreen.classList.add('hidden');
        
        const gameOverScreen = document.getElementById('game-over-screen');
        if (gameOverScreen) gameOverScreen.classList.add('hidden');
        
        const uiLayer = document.getElementById('ui-layer');
        if (uiLayer) uiLayer.classList.remove('hidden');
        
        this.initLevel(this.level);
        this.state = CONSTANTS.STATE_PLAYING;
    }

    returnToMenu() {
        window.soundManager?.playSelect();
        this.saveHighScore();
        
        this.state = CONSTANTS.STATE_MENU;
        
        const menuScreen = document.getElementById('start-menu-screen');
        if (menuScreen) menuScreen.classList.remove('hidden');
        
        const gameOverScreen = document.getElementById('game-over-screen');
        if (gameOverScreen) gameOverScreen.classList.add('hidden');
        
        const uiLayer = document.getElementById('ui-layer');
        if (uiLayer) uiLayer.classList.add('hidden');
    }

    handleKey(e, isDown) {
        // Se estiver no menu e pressionar Enter ou Espaço, inicia o jogo
        if (this.state === CONSTANTS.STATE_MENU && isDown) {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
                const anyModalOpen = !document.getElementById('modal-how-to-play')?.classList.contains('hidden') ||
                                     !document.getElementById('modal-guide')?.classList.contains('hidden');
                if (!anyModalOpen) {
                    this.startGame();
                    return;
                }
            }
        }

        // Tecla ESC para fechar modais abertos
        if (e.key === 'Escape' && isDown) {
            this.closeModal('modal-how-to-play');
            this.closeModal('modal-guide');
            return;
        }

        if (!this.player) return;
        
        switch(e.key.toLowerCase()) {
            case 'arrowup':
            case 'w': this.player.keys.up = isDown; break;
            case 'arrowdown':
            case 's': this.player.keys.down = isDown; break;
            case 'arrowleft':
            case 'a': this.player.keys.left = isDown; break;
            case 'arrowright':
            case 'd': this.player.keys.right = isDown; break;
            case ' ':
            case 'space': this.player.keys.action = isDown; break;
            case 'z': this.player.keys.special = isDown; break;
        }
    }

    initLevel(levelNum) {
        this.map.generate(levelNum);
        this.player = new Player(CONSTANTS.TILE_SIZE, CONSTANTS.TILE_SIZE, this.selectedCharacter);
        
        // Aplica os poderes acumulados que continuam para as próximas fases
        if (this.playerStats) {
            this.player.bombCapacity = this.playerStats.bombCapacity;
            this.player.bombRadius = this.playerStats.bombRadius;
            this.player.speed = this.playerStats.speed;
            this.player.speedLevel = this.playerStats.speedLevel;
            this.player.rasenganAmmo = this.playerStats.rasenganAmmo || 0;
        }
        
        this.enemies = [];
        this.bombs = [];
        this.rasengans = [];
        this.chidoris = [];
        this.boss = null;
        
        if (levelNum === 1) {
            // Fase 1: Introdução com Balloms e 1 Oneal esperto
            this.spawnEnemyList([
                CONSTANTS.ENEMY_TYPES.BALLOM,
                CONSTANTS.ENEMY_TYPES.BALLOM,
                CONSTANTS.ENEMY_TYPES.ONEAL
            ]);
        } else if (levelNum === 2) {
            // Fase 2: Desafio com variedade tática completa
            this.spawnEnemyList([
                CONSTANTS.ENEMY_TYPES.BALLOM,
                CONSTANTS.ENEMY_TYPES.ONEAL,
                CONSTANTS.ENEMY_TYPES.ONEAL,
                CONSTANTS.ENEMY_TYPES.DAHL,
                CONSTANTS.ENEMY_TYPES.MINVO
            ]);
        } else if (levelNum === 3) {
            const centerX = Math.floor(CONSTANTS.GRID_WIDTH / 2) * CONSTANTS.TILE_SIZE;
            const centerY = Math.floor(CONSTANTS.GRID_HEIGHT / 2) * CONSTANTS.TILE_SIZE;
            this.boss = new Boss(centerX, centerY);
        }

        // Se a chave não estiver escondida numa caixa, atribui a um dos inimigos
        if (levelNum < 3 && !this.map.keyInCrate && this.enemies.length > 0) {
            const chosenEnemy = this.enemies[Math.floor(Math.random() * this.enemies.length)];
            chosenEnemy.hasKey = true;
        }
        
        this.updateUI();
    }

    spawnEnemyList(typeList) {
        for (let type of typeList) {
            let spawned = false;
            let attempts = 0;
            while (!spawned && attempts < 100) {
                attempts++;
                let col = Math.floor(Math.random() * CONSTANTS.GRID_WIDTH);
                let row = Math.floor(Math.random() * CONSTANTS.GRID_HEIGHT);
                
                // Garante que não nasça muito perto do jogador (área inicial 3x3)
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
        
        // Contadores da Faixa de Poderes
        const powerBombsEl = document.getElementById('hud-power-bombs');
        const powerFireEl = document.getElementById('hud-power-fire');
        const powerSpeedEl = document.getElementById('hud-power-speed');
        const powerRasenganEl = document.getElementById('hud-power-rasengan');
        const statRasenganBox = document.getElementById('hud-stat-rasengan');
        const statShieldEl = document.getElementById('hud-stat-shield');
        const powerShieldEl = document.getElementById('hud-power-shield');
        
        if (charEl) {
            if (this.selectedCharacter === 'hero_sasuke') {
                charEl.innerText = '⚡ Sasuke';
            } else if (this.selectedCharacter === 'hero_naruto') {
                charEl.innerText = '🍥 Naruto';
            } else if (this.selectedCharacter === 'hero_warrior') {
                charEl.innerText = '⚔️ Guerreiro';
            } else {
                charEl.innerText = '💣 Bomberman';
            }
        }

        // Atualiza rótulo e ícone dinâmico do jutsu no HUD
        const isSasuke = (this.selectedCharacter === 'hero_sasuke');
        const specialTextEl = document.querySelector('#hud-stat-rasengan .power-text');
        const specialIconEl = document.querySelector('#hud-stat-rasengan .power-icon');
        if (specialTextEl) {
            specialTextEl.innerText = isSasuke ? 'Chidori:' : 'Rasengan:';
        }
        if (specialIconEl) {
            specialIconEl.innerText = isSasuke ? '⚡' : '🌀';
        }

        if (scoreEl) scoreEl.innerText = `Score: ${this.score}`;
        if (levelEl) levelEl.innerText = `Fase: ${this.level}${this.level === 3 ? ' (BOSS)' : ''}`;
        if (livesEl) livesEl.innerText = `❤️ ${this.lives}`;

        // Atualiza quantidades dos poderes acumulados
        const currentBombs = this.player ? this.player.bombCapacity : (this.playerStats?.bombCapacity || 1);
        const currentFire = this.player ? this.player.bombRadius : (this.playerStats?.bombRadius || 2);
        const currentSpeedLevel = this.player ? (this.player.speedLevel || 1) : (this.playerStats?.speedLevel || 1);
        const currentRasengan = this.player ? (this.player.rasenganAmmo || 0) : (this.playerStats?.rasenganAmmo || 0);

        if (powerBombsEl) powerBombsEl.innerText = `${currentBombs}`;
        if (powerFireEl) powerFireEl.innerText = `${currentFire}`;
        if (powerSpeedEl) powerSpeedEl.innerText = `Nv.${currentSpeedLevel}`;
        if (powerRasenganEl) powerRasenganEl.innerText = `${currentRasengan}`;

        if (statRasenganBox) {
            if (currentRasengan > 0) {
                statRasenganBox.classList.add('active-ready');
            } else {
                statRasenganBox.classList.remove('active-ready');
            }
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
            if (this.level === 3) {
                keyEl.innerText = "👑 Derrote o Chefe!";
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

    checkPowerUpCollection() {
        if (!this.player || !this.player.isAlive) return;

        const playerGrid = this.player.getGridPos();

        for (let i = this.map.powerUps.length - 1; i >= 0; i--) {
            const p = this.map.powerUps[i];
            if (p.col === playerGrid.col && p.row === playerGrid.row) {
                // Aplica efeito do item coletado e salva nos stats acumulados
                if (p.type === 'rasengan') {
                    this.player.rasenganAmmo = (this.player.rasenganAmmo || 0) + 1;
                    if (this.playerStats) this.playerStats.rasenganAmmo = this.player.rasenganAmmo;
                    this.score += 250;
                    if (this.selectedCharacter === 'hero_sasuke') {
                        window.soundManager?.playChidoriZap();
                    } else {
                        window.soundManager?.playRasenganCollect();
                    }
                } else {
                    window.soundManager?.playPowerUp();
                    if (p.type === 'bomb') {
                        this.player.bombCapacity++;
                        if (this.playerStats) this.playerStats.bombCapacity = this.player.bombCapacity;
                        this.score += 100;
                    } else if (p.type === 'fire') {
                        this.player.bombRadius++;
                        if (this.playerStats) this.playerStats.bombRadius = this.player.bombRadius;
                        this.score += 100;
                    } else if (p.type === 'speed') {
                        this.player.speed = Math.min(4.0, +(this.player.speed + 0.25).toFixed(2));
                        this.player.speedLevel = (this.player.speedLevel || 1) + 1;
                        if (this.playerStats) {
                            this.playerStats.speed = this.player.speed;
                            this.playerStats.speedLevel = this.player.speedLevel;
                        }
                        this.score += 100;
                    } else if (p.type === 'heart') {
                        this.lives++;
                        this.score += 200;
                    } else if (p.type === 'shield') {
                        this.player.hasShield = true;
                        this.player.shieldTimer = 10000; // 10s de proteção
                        this.score += 150;
                    } else if (p.type === 'key') {
                        this.player.hasKey = true;
                        this.score += 300;
                    }
                }

                this.updateUI();
                this.map.powerUps.splice(i, 1);
            }
        }
    }

    checkCollisions() {
        if (!this.player || !this.player.isAlive) return;

        const isPlayerInvulnerable = this.player.hasShield || this.player.spawnShieldTimer > 0;

        // Player vs Enemy
        if (!isPlayerInvulnerable) {
            for (let enemy of this.enemies) {
                if (enemy.isAlive && this.player.checkCollision(enemy)) {
                    this.killPlayer();
                    return;
                }
            }
        }
        
        // Player vs Boss
        if (!isPlayerInvulnerable && this.boss && this.boss.isAlive && this.player.checkCollision(this.boss)) {
            this.killPlayer();
            return;
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

                    // Destrói power-ups atingidos (apenas se não estiverem com imunidade de spawn e não forem chaves)
                    for (let pIdx = this.map.powerUps.length - 1; pIdx >= 0; pIdx--) {
                        const p = this.map.powerUps[pIdx];
                        if (p.col === blast.col && p.row === blast.row) {
                            if (p.immunityTimer <= 0 && p.type !== 'key') {
                                this.map.powerUps.splice(pIdx, 1);
                            }
                        }
                    }

                    // Player Hit
                    if (!isPlayerInvulnerable && this.player.checkCollision(blastHitbox)) {
                        this.killPlayer();
                    }

                    // Enemy Hit
                    for (let enemy of this.enemies) {
                        if (enemy.isAlive && enemy.checkCollision(blastHitbox)) {
                            const isDead = enemy.takeDamage(1, this.map);
                            if (isDead) {
                                this.score += enemy.scoreValue || (150 * enemy.level);
                                this.updateUI();
                            }
                        }
                    }
                    
                    // Boss Hit
                    if (this.boss && this.boss.isAlive && this.boss.checkCollision(blastHitbox)) {
                        if (this.boss.state !== 'damage') {
                            this.boss.takeDamage(1);
                            this.score += 100;
                            this.updateUI();
                            
                            if (!this.boss.isAlive) {
                                this.score += 2500;
                                this.updateUI();
                            }
                        }
                    }
                }
            }
        }
    }

    killPlayer() {
        this.player.isAlive = false;
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
                document.getElementById('game-over-screen').classList.remove('hidden');
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
        if (this.level < 3) {
            // Em fases 1 e 2, para avançar precisa pegar a chave e entrar na porta revelada!
            if (this.map.door && (this.map.door.isRevealed || this.map.grid[this.map.door.row][this.map.door.col] === CONSTANTS.TILE_EMPTY)) {
                const playerGrid = this.player.getGridPos();
                if (playerGrid.col === this.map.door.col && playerGrid.row === this.map.door.row) {
                    if (this.player.hasKey) {
                        window.soundManager?.playVictory();
                        this.score += 500;
                        this.level++;
                        this.initLevel(this.level);
                    }
                }
            }
        } else if (this.level === 3) {
            if (this.boss && !this.boss.isAlive && this.boss.deathTimer > 1500) {
                this.saveHighScore();
                window.soundManager?.playVictory();
                this.state = CONSTANTS.STATE_VICTORY;
                
                const titleEl = document.getElementById('game-over-title');
                const scoreValEl = document.getElementById('final-score-val');
                
                if (titleEl) {
                    titleEl.innerText = "👑 VITÓRIA!";
                    titleEl.style.color = "#4CAF50";
                }
                if (scoreValEl) {
                    scoreValEl.innerText = this.score;
                }
                document.getElementById('game-over-screen').classList.remove('hidden');
            }
        }
    }

    loop(timestamp) {
        if (!this.lastTime) this.lastTime = timestamp;
        const dt = Math.min(timestamp - this.lastTime, 50);
        this.lastTime = timestamp;

        if (this.state === CONSTANTS.STATE_PLAYING && this.isLoaded) {
            this.update(dt);
            this.draw();
        }
        
        requestAnimationFrame((t) => this.loop(t));
    }

    update(dt) {
        this.map.update(dt);

        if (this.player) {
            this.player.update(dt, this.map, this.bombs, this);
        }

        // Atualiza Projéteis do Rasengan
        for (let i = this.rasengans.length - 1; i >= 0; i--) {
            this.rasengans[i].update(dt, this.map, this.enemies, this.boss, this);
            if (this.rasengans[i].toBeRemoved) {
                this.rasengans.splice(i, 1);
            }
        }

        // Atualiza Projéteis do Chidori
        if (this.chidoris) {
            for (let i = this.chidoris.length - 1; i >= 0; i--) {
                this.chidoris[i].update(dt, this.map, this.enemies, this.boss, this);
                if (this.chidoris[i].toBeRemoved) {
                    this.chidoris.splice(i, 1);
                }
            }
        }

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            this.enemies[i].update(dt, this.map, this.player, this.bombs);
            if (this.enemies[i].toBeRemoved) {
                this.enemies.splice(i, 1);
            }
        }
        
        if (this.boss) {
            this.boss.update(dt, this.map, this.player, this.bombs, this.enemies);
        }

        for (let i = this.bombs.length - 1; i >= 0; i--) {
            this.bombs[i].update(dt, this.map, this.bombs, this.enemies, this.boss);
            if (this.bombs[i].toBeRemoved) {
                this.bombs.splice(i, 1);
            }
        }

        this.checkCollisions();
        this.checkPowerUpCollection();
        this.updateUI();
        
        if (this.player && this.player.isAlive) {
            this.checkLevelClear();
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, CONSTANTS.CANVAS_WIDTH, CONSTANTS.CANVAS_HEIGHT);

        // Cenário, Porta e Tiles
        this.map.draw(this.ctx, this.spriteLoader, this.level, this.player);

        // Bombas e Explosões
        for (let bomb of this.bombs) {
            bomb.draw(this.ctx, this.spriteLoader);
        }

        // Projéteis Rasengan em voo
        for (let rasengan of this.rasengans) {
            rasengan.draw(this.ctx, this.spriteLoader);
        }

        // Projéteis Chidori em voo
        if (this.chidoris) {
            for (let chidori of this.chidoris) {
                chidori.draw(this.ctx);
            }
        }

        // Inimigos
        for (let enemy of this.enemies) {
            enemy.draw(this.ctx, this.spriteLoader);
        }
        
        // Boss
        if (this.boss) {
            this.boss.draw(this.ctx, this.spriteLoader);
        }

        // Jogador
        if (this.player) {
            this.player.draw(this.ctx, this.spriteLoader);
        }
    }
}

window.onload = () => {
    window.gameInstance = new Game();
};
