class ChidoriProjectile {
    constructor(x, y, dir, owner) {
        this.x = x;
        this.y = y;
        this.dir = dir; // 'up', 'down', 'left', 'right'
        this.owner = owner;
        this.width = CONSTANTS.TILE_SIZE * 0.9;
        this.height = CONSTANTS.TILE_SIZE * 0.9;
        this.speed = 12.0; // Muito rápido como um relâmpago
        this.toBeRemoved = false;
        
        this.animTimer = 0;
        this.animFrame = 0;
        this.lifetime = 2000; // Tempo máximo de vida
        
        // Trilha de faíscas e arcos elétricos
        this.sparks = [];
        this.hitEntities = new Set();
        
        // Velocidades vetoriais
        this.vx = 0;
        this.vy = 0;
        if (dir === 'left') this.vx = -this.speed;
        else if (dir === 'right') this.vx = this.speed;
        else if (dir === 'up') this.vy = -this.speed;
        else if (dir === 'down') this.vy = this.speed;
    }

    update(dt, map, enemies, boss, game) {
        if (this.toBeRemoved) return;

        this.lifetime -= dt;
        if (this.lifetime <= 0) {
            this.toBeRemoved = true;
            return;
        }

        this.animTimer += dt;
        if (this.animTimer > 40) {
            this.animFrame = (this.animFrame + 1) % 4;
            this.animTimer = 0;
        }

        // Gera faíscas elétricas dinâmicas no rastro
        for (let i = 0; i < 3; i++) {
            const spread = (Math.random() - 0.5) * 24;
            this.sparks.push({
                x: this.x + this.width / 2 + spread,
                y: this.y + this.height / 2 + spread,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                alpha: 1.0,
                color: Math.random() > 0.3 ? '#00e5ff' : '#ffffff',
                size: 2 + Math.random() * 4
            });
        }

        // Atualiza partículas elétricas
        for (let i = this.sparks.length - 1; i >= 0; i--) {
            const s = this.sparks[i];
            s.x += s.vx;
            s.y += s.vy;
            s.alpha -= 0.12;
            if (s.alpha <= 0) {
                this.sparks.splice(i, 1);
            }
        }

        // Move o projétil elétrico
        const timeScale = Math.min(dt || 16.6667, 50) / 16.6667;
        this.x += this.vx * timeScale;
        this.y += this.vy * timeScale;

        // Checa limites do mapa
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        const col = Math.floor(centerX / CONSTANTS.TILE_SIZE);
        const row = Math.floor(centerY / CONSTANTS.TILE_SIZE);

        if (col < 0 || col >= CONSTANTS.GRID_WIDTH || row < 0 || row >= CONSTANTS.GRID_HEIGHT) {
            this.explodeImpact(map, game);
            return;
        }

        const tile = map.grid[row][col];

        // Se bater numa parede de aço indestrutível, descarrega e encerra
        if (tile === CONSTANTS.TILE_SOLID) {
            this.explodeImpact(map, game);
            return;
        }

        // Se passar por uma caixa de tijolo (TILE_SOFT), ELETROCUTA E QUEBRA A CAIXA!
        if (tile === CONSTANTS.TILE_SOFT) {
            map.grid[row][col] = CONSTANTS.TILE_EMPTY;
            game.score += 25;

            // Spawna drop se tiver
            if (map.spawnPowerUp) {
                if (map.keyInCrate && map.keyInCrate.col === col && map.keyInCrate.row === row) {
                    map.spawnPowerUp(col, row, 'key');
                } else if (map.rasenganCrates && map.rasenganCrates.some(c => c.col === col && c.row === row)) {
                    map.spawnPowerUp(col, row, 'rasengan');
                } else if (Math.random() < 0.65) {
                    map.spawnPowerUp(col, row);
                }
            }

            if (window.soundManager) {
                window.soundManager.playChidoriZap();
            }
        }

        // Dano em inimigos (eletrocuta instantaneamente com 3 de dano)
        for (let enemy of enemies) {
            if (enemy.isAlive && !this.hitEntities.has(enemy) && this.checkCollision(enemy)) {
                this.hitEntities.add(enemy);
                const isDead = enemy.takeDamage(3, map);
                if (isDead) {
                    game.score += enemy.scoreValue || 250;
                    game.updateUI();
                }
                if (window.soundManager) {
                    window.soundManager.playChidoriZap();
                }
            }
        }

        // Dano massivo no Boss (4 de dano com corte de Chidori)
        if (boss && boss.isAlive && !this.hitEntities.has(boss) && this.checkCollision(boss)) {
            this.hitEntities.add(boss);
            boss.takeDamage(4);
            game.score += 400;
            game.updateUI();
            if (window.soundManager) {
                window.soundManager.playChidoriZap();
            }
            if (!boss.isAlive) {
                game.score += 3000;
                game.updateUI();
            }
        }
    }

    checkCollision(entity) {
        return (
            this.x < entity.x + entity.width &&
            this.x + this.width > entity.x &&
            this.y < entity.y + entity.height &&
            this.y + this.height > entity.y
        );
    }

    explodeImpact(map, game) {
        this.toBeRemoved = true;
        if (window.soundManager) {
            window.soundManager.playChidoriZap();
        }
    }

    draw(ctx) {
        // Desenha faíscas de eletricidade
        ctx.save();
        for (let s of this.sparks) {
            ctx.fillStyle = s.color;
            ctx.globalAlpha = s.alpha;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;

        ctx.save();
        ctx.translate(cx, cy);

        // Brilho intenso neon de raio elétrico
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 25;

        // Esfera central de descarga
        const pulse = 1 + Math.sin(Date.now() / 30) * 0.2;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, (this.width * 0.35) * pulse, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(0, 229, 255, 0.9)';
        ctx.beginPath();
        ctx.arc(0, 0, (this.width * 0.5) * pulse, 0, Math.PI * 2);
        ctx.fill();

        // Raios elétricos angulares desenhados proceduralmente
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 / 6) * i + (Math.random() - 0.5) * 0.5;
            const r1 = this.width * 0.3;
            const r2 = this.width * (0.7 + Math.random() * 0.4);
            const midR = (r1 + r2) / 2;
            const midAngle = angle + (Math.random() - 0.5) * 0.8;

            ctx.beginPath();
            ctx.moveTo(Math.cos(angle) * r1, Math.sin(angle) * r1);
            ctx.lineTo(Math.cos(midAngle) * midR, Math.sin(midAngle) * midR);
            ctx.lineTo(Math.cos(angle) * r2, Math.sin(angle) * r2);
            ctx.stroke();
        }

        ctx.restore();
    }
}
