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
        
        this.level = 1;
        this.score = 0;
        this.lives = 3;
        
        this.state = CONSTANTS.STATE_PLAYING;
        this.lastTime = 0;
        this.isLoaded = false;
        
        this.bindEvents();
        this.init();
    }

    async init() {
        // Carrega e processa todos os spritesheets com Chroma Key
        await this.spriteLoader.preloadAll();
        this.isLoaded = true;
        this.initLevel(this.level);
        requestAnimationFrame((t) => this.loop(t));
    }

    bindEvents() {
        window.addEventListener('keydown', (e) => this.handleKey(e, true));
        window.addEventListener('keyup', (e) => this.handleKey(e, false));
        
        const restartBtn = document.getElementById('restart-btn');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => {
                this.lives = 3;
                this.score = 0;
                this.level = 1;
                document.getElementById('game-over-screen').classList.add('hidden');
                this.initLevel(this.level);
                this.state = CONSTANTS.STATE_PLAYING;
            });
        }
    }

    handleKey(e, isDown) {
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
        }
    }

    initLevel(levelNum) {
        this.map.generate(levelNum);
        this.player = new Player(CONSTANTS.TILE_SIZE, CONSTANTS.TILE_SIZE);
        this.enemies = [];
        this.bombs = [];
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
        const scoreEl = document.getElementById('score-display');
        const levelEl = document.getElementById('level-display');
        const livesEl = document.getElementById('lives-display');
        const keyEl = document.getElementById('key-display');
        const shieldEl = document.getElementById('shield-display');
        
        if (scoreEl) scoreEl.innerText = `Score: ${this.score}`;
        if (levelEl) levelEl.innerText = `Fase: ${this.level}${this.level === 3 ? ' (BOSS)' : ''}`;
        if (livesEl) livesEl.innerText = `Vidas: ${this.lives}`;

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

        if (shieldEl && this.player) {
            if (this.player.hasShield) {
                shieldEl.classList.remove("hidden");
                shieldEl.innerText = `🛡️ Escudo (${Math.ceil(this.player.shieldTimer / 1000)}s)`;
            } else if (this.player.spawnShieldTimer > 0) {
                shieldEl.classList.remove("hidden");
                shieldEl.innerText = "🛡️ Imunidade!";
            } else {
                shieldEl.classList.add("hidden");
            }
        }
    }

    checkPowerUpCollection() {
        if (!this.player || !this.player.isAlive) return;

        const playerGrid = this.player.getGridPos();

        for (let i = this.map.powerUps.length - 1; i >= 0; i--) {
            const p = this.map.powerUps[i];
            if (p.col === playerGrid.col && p.row === playerGrid.row) {
                // Aplica efeito do item coletado
                if (p.type === 'bomb') {
                    this.player.bombCapacity++;
                    this.score += 100;
                } else if (p.type === 'fire') {
                    this.player.bombRadius++;
                    this.score += 100;
                } else if (p.type === 'speed') {
                    this.player.speed = Math.min(5.2, this.player.speed + 0.45);
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
            setTimeout(() => {
                this.state = CONSTANTS.STATE_GAME_OVER;
                const titleEl = document.getElementById('game-over-title');
                if (titleEl) {
                    titleEl.innerText = "Game Over";
                    titleEl.style.color = "#ff3333";
                }
                document.getElementById('game-over-screen').classList.remove('hidden');
            }, 700);
        } else {
            setTimeout(() => {
                if (this.state !== CONSTANTS.STATE_GAME_OVER) {
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
                        this.score += 500;
                        this.level++;
                        this.initLevel(this.level);
                    }
                }
            }
        } else if (this.level === 3) {
            if (this.boss && !this.boss.isAlive && this.boss.deathTimer > 1500) {
                this.state = CONSTANTS.STATE_VICTORY;
                const titleEl = document.getElementById('game-over-title');
                if (titleEl) {
                    titleEl.innerText = "VITÓRIA!";
                    titleEl.style.color = "#4CAF50";
                }
                document.getElementById('game-over-screen').classList.remove('hidden');
            }
        }
    }

    loop(timestamp) {
        if (!this.lastTime) this.lastTime = timestamp;
        const dt = timestamp - this.lastTime;
        this.lastTime = timestamp;

        if (this.state === CONSTANTS.STATE_PLAYING && this.isLoaded) {
            this.update(dt);
        }
        
        this.draw();
        
        requestAnimationFrame((t) => this.loop(t));
    }

    update(dt) {
        this.map.update(dt);

        if (this.player) {
            this.player.update(dt, this.map, this.bombs);
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
            this.bombs[i].update(dt, this.map);
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
