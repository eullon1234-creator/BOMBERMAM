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
            this.spawnEnemies(3, 1);
        } else if (levelNum === 2) {
            this.spawnEnemies(4, 2);
        } else if (levelNum === 3) {
            const centerX = Math.floor(CONSTANTS.GRID_WIDTH / 2) * CONSTANTS.TILE_SIZE;
            const centerY = Math.floor(CONSTANTS.GRID_HEIGHT / 2) * CONSTANTS.TILE_SIZE;
            this.boss = new Boss(centerX, centerY);
        }
        
        this.updateUI();
    }

    spawnEnemies(count, enemyLevel) {
        let spawned = 0;
        let attempts = 0;
        while (spawned < count && attempts < 100) {
            attempts++;
            let col = Math.floor(Math.random() * CONSTANTS.GRID_WIDTH);
            let row = Math.floor(Math.random() * CONSTANTS.GRID_HEIGHT);
            
            if (col > 3 && row > 3 && this.map.grid[row][col] === CONSTANTS.TILE_EMPTY) {
                this.enemies.push(new Enemy(col * CONSTANTS.TILE_SIZE, row * CONSTANTS.TILE_SIZE, enemyLevel));
                spawned++;
            }
        }
    }

    updateUI() {
        const scoreEl = document.getElementById('score-display');
        const levelEl = document.getElementById('level-display');
        const livesEl = document.getElementById('lives-display');
        
        if (scoreEl) scoreEl.innerText = `Score: ${this.score}`;
        if (levelEl) levelEl.innerText = `Fase: ${this.level}${this.level === 3 ? ' (BOSS)' : ''}`;
        if (livesEl) livesEl.innerText = `Vidas: ${this.lives}`;
    }

    checkPowerUpCollection() {
        if (!this.player || !this.player.isAlive) return;

        const playerGrid = this.player.getGridPos();

        for (let i = this.map.powerUps.length - 1; i >= 0; i--) {
            const p = this.map.powerUps[i];
            if (p.col === playerGrid.col && p.row === playerGrid.row) {
                // Aplica efeito
                if (p.type === 'bomb') this.player.bombCapacity++;
                else if (p.type === 'fire') this.player.bombRadius++;
                else if (p.type === 'speed') this.player.speed = Math.min(5, this.player.speed + 0.5);
                else if (p.type === 'heart') { this.lives++; this.updateUI(); }

                this.score += 50;
                this.updateUI();
                this.map.powerUps.splice(i, 1);
            }
        }
    }

    checkCollisions() {
        if (!this.player || !this.player.isAlive) return;

        // Player vs Enemy
        for (let enemy of this.enemies) {
            if (enemy.isAlive && this.player.checkCollision(enemy)) {
                this.killPlayer();
                return;
            }
        }
        
        // Player vs Boss
        if (this.boss && this.boss.isAlive && this.player.checkCollision(this.boss)) {
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

                    // Destrói power-ups atingidos
                    for (let pIdx = this.map.powerUps.length - 1; pIdx >= 0; pIdx--) {
                        const p = this.map.powerUps[pIdx];
                        if (p.col === blast.col && p.row === blast.row) {
                            this.map.powerUps.splice(pIdx, 1);
                        }
                    }

                    // Player Hit
                    if (this.player.checkCollision(blastHitbox)) {
                        this.killPlayer();
                    }

                    // Enemy Hit
                    for (let enemy of this.enemies) {
                        if (enemy.isAlive && enemy.checkCollision(blastHitbox)) {
                            enemy.isAlive = false;
                            this.score += 150 * enemy.level;
                            this.updateUI();
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
            const enemiesAlive = this.enemies.filter(e => e.isAlive).length;
            if (enemiesAlive === 0) {
                this.level++;
                this.initLevel(this.level);
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
        if (this.player) {
            this.player.update(dt, this.map, this.bombs);
        }

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            this.enemies[i].update(dt, this.map, this.player);
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
        
        if (this.player && this.player.isAlive) {
            this.checkLevelClear();
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, CONSTANTS.CANVAS_WIDTH, CONSTANTS.CANVAS_HEIGHT);

        // Cenário e Tiles
        this.map.draw(this.ctx, this.spriteLoader, this.level);

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
