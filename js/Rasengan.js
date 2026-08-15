class RasenganProjectile {
    constructor(x, y, dir, owner) {
        this.x = x;
        this.y = y;
        this.dir = dir; // 'up', 'down', 'left', 'right'
        this.owner = owner;
        this.width = CONSTANTS.TILE_SIZE * 0.85;
        this.height = CONSTANTS.TILE_SIZE * 0.85;
        this.speed = 10.0;
        this.toBeRemoved = false;
        
        this.animTimer = 0;
        this.animFrame = 0;
        this.rotation = 0;
        
        // Trilha de partículas de vento/chakra
        this.trail = [];
        this.hitEntities = new Set();
        
        // Determina velocidades vetoriais
        this.vx = 0;
        this.vy = 0;
        if (dir === 'left') this.vx = -this.speed;
        else if (dir === 'right') this.vx = this.speed;
        else if (dir === 'up') this.vy = -this.speed;
        else if (dir === 'down') this.vy = this.speed;
    }

    update(dt, map, enemies, boss, game) {
        if (this.toBeRemoved) return;

        this.animTimer += dt;
        if (this.animTimer > 50) {
            this.animFrame = (this.animFrame + 1) % 4;
            this.animTimer = 0;
        }
        this.rotation += 0.35;

        // Adiciona rastro de energia
        this.trail.push({
            x: this.x + this.width / 2,
            y: this.y + this.height / 2,
            alpha: 1.0,
            size: this.width * (0.5 + Math.random() * 0.4)
        });

        // Atualiza partículas do rastro
        for (let i = this.trail.length - 1; i >= 0; i--) {
            this.trail[i].alpha -= 0.08;
            if (this.trail[i].alpha <= 0) {
                this.trail.splice(i, 1);
            }
        }

        // Move o projétil
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

        // Se bater numa parede indestrutível, explode e para
        if (tile === CONSTANTS.TILE_SOLID) {
            this.explodeImpact(map, game);
            return;
        }

        // Se passar por uma caixa de tijolo (TILE_SOFT), DESTROI A CAIXA e continua!
        if (tile === CONSTANTS.TILE_SOFT) {
            map.grid[row][col] = CONSTANTS.TILE_EMPTY;
            game.score += 20;

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
                window.soundManager.playExplosion();
            }
        }

        // Dano em inimigos
        for (let enemy of enemies) {
            if (enemy.isAlive && !this.hitEntities.has(enemy) && this.checkCollision(enemy)) {
                this.hitEntities.add(enemy);
                const isDead = enemy.takeDamage(2, map);
                if (isDead) {
                    game.score += enemy.scoreValue || 200;
                    game.updateUI();
                }
            }
        }

        // Dano no Boss
        if (boss && boss.isAlive && !this.hitEntities.has(boss) && this.checkCollision(boss)) {
            this.hitEntities.add(boss);
            boss.takeDamage(3);
            game.score += 300;
            game.updateUI();
            if (!boss.isAlive) {
                game.score += 2500;
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
            window.soundManager.playExplosion();
        }
    }

    draw(ctx, spriteLoader) {
        const sprite = spriteLoader ? spriteLoader.get('rasengan') : null;

        // Desenha rastro de chakra
        ctx.save();
        for (let t of this.trail) {
            ctx.fillStyle = `rgba(0, 229, 255, ${t.alpha * 0.45})`;
            ctx.beginPath();
            ctx.arc(t.x, t.y, t.size / 2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(this.rotation);

        // Brilho externo ciano
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 18;

        if (sprite) {
            const sw = sprite.width / 2;
            const sh = sprite.height / 2;
            const sx = (this.animFrame % 2) * sw;
            const sy = Math.floor(this.animFrame / 2) * sh;

            const drawSize = CONSTANTS.TILE_SIZE * 1.05;
            ctx.drawImage(
                sprite,
                sx, sy, sw, sh,
                -drawSize / 2, -drawSize / 2,
                drawSize, drawSize
            );
        } else {
            // Fallback de energia
            ctx.fillStyle = '#00e5ff';
            ctx.beginPath();
            ctx.arc(0, 0, this.width / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(0, 0, this.width / 4, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}
