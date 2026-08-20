class Boss extends Entity {
    constructor(x, y) {
        super(x, y, CONSTANTS.TILE_SIZE * 2.2, CONSTANTS.TILE_SIZE * 2.2);
        this.color = '#8a2be2';
        this.hp = 18;
        this.maxHp = 18;
        this.phase = 1; // 1 (Normal), 2 (Chuva de Meteoros), 3 (Fúria & Laser de Plasma)
        this.state = 'idle'; // 'idle', 'moving', 'charging', 'meteor_rain', 'plasma_laser', 'damage', 'dead'
        this.stateTimer = 1800;
        this.speed = 1.0;
        
        this.animFrame = 0;
        this.animTimer = 0;
        this.deathTimer = 0;
        
        this.x = x - this.width / 2;
        this.y = y - this.height / 2;

        // Telegrafia de ataques
        this.telegraph = {
            active: false,
            type: null, // 'charge', 'meteors', 'laser'
            timer: 0,
            duration: 0,
            targets: [], // [{col, row, x, y}]
            laserLines: [] // [{row, col}]
        };

        // Ataques ativos no ar
        this.activeMeteors = [];
        this.activeLasers = [];
    }

    update(dt, map, player, bombsArray, enemiesArray, particleSystem) {
        if (!this.isAlive) {
            this.deathTimer += dt;
            return;
        }

        // Determina a Fase atual com base no HP
        const hpPercent = this.hp / this.maxHp;
        if (hpPercent > 0.6) {
            this.phase = 1;
            this.speed = 1.0;
        } else if (hpPercent > 0.3) {
            this.phase = 2;
            this.speed = 1.25;
        } else {
            this.phase = 3;
            this.speed = 1.45;
        }

        this.animTimer += dt;
        if (this.animTimer > (this.phase === 3 ? 120 : 180)) {
            this.animFrame = (this.animFrame + 1) % 3;
            this.animTimer = 0;
        }

        // Atualiza Telegrafia de Ataques Especiais
        if (this.telegraph.active) {
            this.telegraph.timer -= dt;
            if (this.telegraph.timer <= 0) {
                this.executeTelegraphedAttack(map, player, bombsArray, enemiesArray, particleSystem);
            }
            return; // Fica parado carregando durante a telegrafia
        }

        // Atualiza Meteoros em Voo
        for (let i = this.activeMeteors.length - 1; i >= 0; i--) {
            const m = this.activeMeteors[i];
            m.y += m.vy * (dt / 16.6667);
            if (m.y >= m.targetY) {
                // Impacto do Meteoro no chão!
                this.triggerMeteorImpact(m, map, player, particleSystem);
                this.activeMeteors.splice(i, 1);
            }
        }

        // Atualiza Duração do Laser de Plasma
        for (let i = this.activeLasers.length - 1; i >= 0; i--) {
            const l = this.activeLasers[i];
            l.timer -= dt;
            if (l.timer <= 0) {
                this.activeLasers.splice(i, 1);
            }
        }

        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
            this.chooseNextAction(player, bombsArray, enemiesArray);
        }

        if (this.state === 'moving') {
            this.moveTowards(player, map, dt);
        }
    }

    chooseNextAction(player, bombsArray, enemiesArray) {
        if (this.state === 'dead' || this.telegraph.active) return;

        const rand = Math.random();

        if (this.phase === 1) {
            if (rand < 0.45) {
                this.state = 'moving';
                this.stateTimer = 2600;
            } else if (rand < 0.75) {
                this.startTelegraphCharge(player);
            } else {
                this.dropBossBombs(bombsArray, 2);
                this.state = 'idle';
                this.stateTimer = 1400;
            }
        } else if (this.phase === 2) {
            if (rand < 0.35) {
                this.state = 'moving';
                this.stateTimer = 2200;
            } else if (rand < 0.70) {
                this.startTelegraphMeteors();
            } else {
                this.summonMinions(enemiesArray);
                this.dropBossBombs(bombsArray, 3);
                this.state = 'idle';
                this.stateTimer = 1200;
            }
        } else {
            // Fase 3: Fúria Total
            if (rand < 0.30) {
                this.state = 'moving';
                this.stateTimer = 1800;
            } else if (rand < 0.65) {
                this.startTelegraphPlasmaLaser();
            } else {
                this.startTelegraphMeteors();
            }
        }
    }

    startTelegraphCharge(player) {
        this.state = 'charging';
        this.telegraph.active = true;
        this.telegraph.type = 'charge';
        this.telegraph.duration = 1200;
        this.telegraph.timer = 1200;
        
        const targetX = player ? player.x : this.x;
        const targetY = player ? player.y : this.y;
        this.telegraph.targets = [{ x: targetX, y: targetY }];

        if (window.soundManager) window.soundManager.playSelect();
    }

    startTelegraphMeteors() {
        this.state = 'meteor_rain';
        this.telegraph.active = true;
        this.telegraph.type = 'meteors';
        this.telegraph.duration = 1500;
        this.telegraph.timer = 1500;

        const count = this.phase === 3 ? 5 : 3;
        this.telegraph.targets = [];

        for (let i = 0; i < count; i++) {
            const col = 1 + Math.floor(Math.random() * (CONSTANTS.GRID_WIDTH - 2));
            const row = 1 + Math.floor(Math.random() * (CONSTANTS.GRID_HEIGHT - 2));
            this.telegraph.targets.push({
                col,
                row,
                x: col * CONSTANTS.TILE_SIZE + CONSTANTS.TILE_SIZE / 2,
                y: row * CONSTANTS.TILE_SIZE + CONSTANTS.TILE_SIZE / 2
            });
        }

        if (window.soundManager) window.soundManager.playMeteorWhoosh();
    }

    startTelegraphPlasmaLaser() {
        this.state = 'plasma_laser';
        this.telegraph.active = true;
        this.telegraph.type = 'laser';
        this.telegraph.duration = 1300;
        this.telegraph.timer = 1300;

        const grid = this.getGridPos();
        this.telegraph.laserLines = [{ row: grid.row, col: grid.col }];

        if (window.soundManager) window.soundManager.playChidoriLaunch();
    }

    executeTelegraphedAttack(map, player, bombsArray, enemiesArray, particleSystem) {
        this.telegraph.active = false;

        if (this.telegraph.type === 'charge') {
            // Arrancada rápida em direção ao alvo
            const target = this.telegraph.targets[0];
            if (target) {
                const dx = target.x - this.x;
                const dy = target.y - this.y;
                const dist = Math.sqrt(dx*dx + dy*dy) || 1;
                this.vx = (dx / dist) * 7.5;
                this.vy = (dy / dist) * 7.5;
                this.x += this.vx * 12;
                this.y += this.vy * 12;
                if (particleSystem) particleSystem.addScreenShake(8, 250);
            }
            this.state = 'idle';
            this.stateTimer = 1000;

        } else if (this.telegraph.type === 'meteors') {
            for (let t of this.telegraph.targets) {
                this.activeMeteors.push({
                    col: t.col,
                    row: t.row,
                    x: t.x,
                    y: t.y - 450, // Começa caindo do alto da tela
                    targetY: t.y,
                    vy: 18.0
                });
            }
            this.state = 'idle';
            this.stateTimer = 1400;

        } else if (this.telegraph.type === 'laser') {
            const line = this.telegraph.laserLines[0];
            if (line) {
                this.activeLasers.push({
                    row: line.row,
                    col: line.col,
                    timer: 800
                });
                if (particleSystem) {
                    particleSystem.addScreenShake(12, 400);
                    particleSystem.createExplosionSparks(this.x + this.width/2, this.y + this.height/2, '#00e5ff', 30);
                }
                if (window.soundManager) window.soundManager.playChidoriZap();
            }
            this.state = 'idle';
            this.stateTimer = 1500;
        }
    }

    triggerMeteorImpact(meteor, map, player, particleSystem) {
        if (window.soundManager) window.soundManager.playExplosion();
        if (particleSystem) {
            particleSystem.addScreenShake(10, 300);
            particleSystem.createShockwave(meteor.x, meteor.y, 65, 'rgba(255, 69, 0, 0.9)');
            particleSystem.createExplosionSparks(meteor.x, meteor.y, '#ff3d00', 20);
        }

        // Destrói caixas se houver no tile
        if (map.grid[meteor.row][meteor.col] === CONSTANTS.TILE_SOFT) {
            map.grid[meteor.row][meteor.col] = CONSTANTS.TILE_EMPTY;
            if (particleSystem) {
                particleSystem.createBrickDebris(meteor.col * CONSTANTS.TILE_SIZE, meteor.row * CONSTANTS.TILE_SIZE, 2);
            }
        }

        // Checa dano no jogador se estiver próximo ao impacto
        if (player && player.isAlive && !player.hasShield && player.spawnShieldTimer <= 0) {
            const pGrid = player.getGridPos();
            if (pGrid.col === meteor.col && pGrid.row === meteor.row) {
                player.isAlive = false;
            }
        }
    }

    dropBossBombs(bombsArray, count = 2) {
        if (!bombsArray) return;
        const grid = this.getGridPos();
        for (let i = 0; i < count; i++) {
            const c = Math.max(1, Math.min(CONSTANTS.GRID_WIDTH - 2, grid.col + (i === 0 ? 0 : (i === 1 ? -1 : 1))));
            const r = Math.max(1, Math.min(CONSTANTS.GRID_HEIGHT - 2, grid.row));
            bombsArray.push(new Bomb(c * CONSTANTS.TILE_SIZE, r * CONSTANTS.TILE_SIZE, c, r, 3, null));
        }
        if (window.soundManager) window.soundManager.playBombDrop();
    }

    summonMinions(enemiesArray) {
        if (!enemiesArray) return;
        const aliveMinions = enemiesArray.filter(e => e.isAlive).length;
        if (aliveMinions < 3) {
            const types = [CONSTANTS.ENEMY_TYPES.ONEAL, CONSTANTS.ENEMY_TYPES.MINVO, CONSTANTS.ENEMY_TYPES.DAHL];
            const chosen = types[Math.floor(Math.random() * types.length)];
            enemiesArray.push(new Enemy(this.x, this.y, chosen));
        }
    }

    moveTowards(target, map, dt = 16.6667) {
        if (!target) return;
        const dx = (target.x + target.width/2) - (this.x + this.width/2);
        const dy = (target.y + target.height/2) - (this.y + this.height/2);
        const length = Math.sqrt(dx*dx + dy*dy);
        if (length === 0) return;

        const timeScale = Math.min(dt, 50) / 16.6667;

        this.vx = (dx / length) * this.speed * timeScale;
        this.vy = (dy / length) * this.speed * timeScale;

        this.x += this.vx;
        if (this.checkCollisionWithWalls(map)) this.x -= this.vx;
        
        this.y += this.vy;
        if (this.checkCollisionWithWalls(map)) this.y -= this.vy;
    }

    checkCollisionWithWalls(map) {
        const left = this.x + 8;
        const right = this.x + this.width - 8;
        const top = this.y + 8;
        const bottom = this.y + this.height - 8;

        const points = [
            { x: left, y: top }, { x: right, y: top },
            { x: left, y: bottom }, { x: right, y: bottom }
        ];

        for (let p of points) {
            const col = Math.floor(p.x / CONSTANTS.TILE_SIZE);
            const row = Math.floor(p.y / CONSTANTS.TILE_SIZE);
            if (col < 0 || col >= CONSTANTS.GRID_WIDTH || row < 0 || row >= CONSTANTS.GRID_HEIGHT) return true;
            if (map.grid[row][col] === CONSTANTS.TILE_SOLID) return true;
        }
        return false;
    }

    takeDamage(amount) {
        if (this.state === 'dead') return;
        this.hp -= amount;
        this.state = 'damage';
        this.stateTimer = 400;
        
        if (this.hp <= 0) {
            this.hp = 0;
            this.state = 'dead';
            this.isAlive = false;
        }
    }

    draw(ctx, spriteLoader) {
        const sprite = spriteLoader ? spriteLoader.get('boss') : null;
        
        // 1. Desenha Mira e Telegrafia no chão
        if (this.telegraph.active) {
            ctx.save();
            if (this.telegraph.type === 'meteors') {
                for (let t of this.telegraph.targets) {
                    const pulse = 1 + Math.sin(Date.now() / 60) * 0.15;
                    ctx.strokeStyle = 'rgba(255, 23, 68, 0.9)';
                    ctx.lineWidth = 3;
                    ctx.fillStyle = 'rgba(255, 23, 68, 0.25)';
                    ctx.beginPath();
                    ctx.arc(t.x, t.y, 22 * pulse, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();

                    // Cruz de mira
                    ctx.beginPath();
                    ctx.moveTo(t.x - 14, t.y); ctx.lineTo(t.x + 14, t.y);
                    ctx.moveTo(t.x, t.y - 14); ctx.lineTo(t.x, t.y + 14);
                    ctx.stroke();
                }
            } else if (this.telegraph.type === 'laser') {
                for (let l of this.telegraph.laserLines) {
                    ctx.fillStyle = 'rgba(0, 229, 255, 0.25)';
                    ctx.fillRect(0, l.row * CONSTANTS.TILE_SIZE, CONSTANTS.CANVAS_WIDTH, CONSTANTS.TILE_SIZE);
                    ctx.fillRect(l.col * CONSTANTS.TILE_SIZE, 0, CONSTANTS.TILE_SIZE, CONSTANTS.CANVAS_HEIGHT);
                }
            } else if (this.telegraph.type === 'charge') {
                const t = this.telegraph.targets[0];
                if (t) {
                    ctx.strokeStyle = 'rgba(255, 87, 34, 0.8)';
                    ctx.lineWidth = 4;
                    ctx.setLineDash([8, 6]);
                    ctx.beginPath();
                    ctx.moveTo(this.x + this.width/2, this.y + this.height/2);
                    ctx.lineTo(t.x, t.y);
                    ctx.stroke();
                    ctx.setLineDash([]);
                }
            }
            ctx.restore();
        }

        // 2. Desenha Lasers de Plasma Ativos
        for (let l of this.activeLasers) {
            ctx.save();
            ctx.shadowColor = '#00e5ff';
            ctx.shadowBlur = 20;
            ctx.fillStyle = 'rgba(0, 229, 255, 0.85)';
            ctx.fillRect(0, l.row * CONSTANTS.TILE_SIZE + 8, CONSTANTS.CANVAS_WIDTH, CONSTANTS.TILE_SIZE - 16);
            ctx.fillRect(l.col * CONSTANTS.TILE_SIZE + 8, 0, CONSTANTS.TILE_SIZE - 16, CONSTANTS.CANVAS_HEIGHT);

            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, l.row * CONSTANTS.TILE_SIZE + 18, CONSTANTS.CANVAS_WIDTH, CONSTANTS.TILE_SIZE - 36);
            ctx.fillRect(l.col * CONSTANTS.TILE_SIZE + 18, 0, CONSTANTS.TILE_SIZE - 36, CONSTANTS.CANVAS_HEIGHT);
            ctx.restore();
        }

        // 3. Desenha Meteoros em Queda
        for (let m of this.activeMeteors) {
            ctx.save();
            ctx.shadowColor = '#ff3d00';
            ctx.shadowBlur = 25;
            ctx.fillStyle = '#ff6d00';
            ctx.beginPath();
            ctx.arc(m.x, m.y, 16, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffeb3b';
            ctx.beginPath();
            ctx.arc(m.x, m.y, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // 4. Desenha o Sprite do Boss
        if (sprite) {
            const frameW = sprite.width / 3;
            const frameH = sprite.height / 3;
            let row = 0;
            let col = this.animFrame;

            if (this.state === 'idle' || this.state === 'moving') {
                row = 0;
            } else if (this.state === 'charging' || this.state === 'meteor_rain' || this.state === 'plasma_laser') {
                row = 1;
            } else if (this.state === 'damage' || this.state === 'dead') {
                row = 2;
                col = this.state === 'dead' ? 2 : (Math.floor(Date.now() / 100) % 2 === 0 ? 0 : 1);
            }

            const drawWidth = CONSTANTS.TILE_SIZE * 3;
            const drawHeight = CONSTANTS.TILE_SIZE * 3;
            const drawX = this.x - (drawWidth - this.width) / 2;
            const drawY = this.y - (drawHeight - this.height) / 2;

            ctx.save();
            // Aura de Fúria nas fases 2 e 3
            if (this.isAlive && this.phase >= 2) {
                const auraGlow = this.phase === 3 ? '#ff1744' : '#ff9100';
                ctx.shadowColor = auraGlow;
                ctx.shadowBlur = 18;
            }

            ctx.drawImage(
                sprite,
                col * frameW, row * frameH, frameW, frameH,
                drawX, drawY,
                drawWidth, drawHeight
            );
            ctx.restore();
        } else {
            if (!this.isAlive) return;
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }

        // Barra de Vida Superior do Boss
        if (this.isAlive) {
            const barW = this.width;
            const barH = 8;
            ctx.fillStyle = 'rgba(0,0,0,0.75)';
            ctx.fillRect(this.x, this.y - 14, barW, barH);
            ctx.fillStyle = this.phase === 3 ? '#ff1744' : (this.phase === 2 ? '#ff9800' : '#4caf50');
            ctx.fillRect(this.x + 1, this.y - 13, (barW - 2) * (this.hp / this.maxHp), barH - 2);
            ctx.strokeStyle = '#fff';
            ctx.strokeRect(this.x, this.y - 14, barW, barH);
        }
    }
}
