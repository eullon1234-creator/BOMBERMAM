class Player extends Entity {
    constructor(x, y) {
        super(x, y, CONSTANTS.TILE_SIZE * 0.7, CONSTANTS.TILE_SIZE * 0.7);
        this.color = CONSTANTS.COLORS.PLAYER;
        this.speed = 3.2;
        
        this.bombCapacity = 1;
        this.bombsActive = 0;
        this.bombRadius = 2;
        
        this.keys = {
            up: false,
            down: false,
            left: false,
            right: false,
            action: false
        };
        
        this.actionPressed = false;
        this.direction = 'down'; // 'down', 'up', 'left', 'right'
        this.animFrame = 0;
        this.animTimer = 0;
        this.isMoving = false;
        this.deathTimer = 0;
    }

    handleInput(map, bombsArray) {
        this.vx = 0;
        this.vy = 0;

        if (this.keys.left) {
            this.vx = -this.speed;
            this.direction = 'left';
        } else if (this.keys.right) {
            this.vx = this.speed;
            this.direction = 'right';
        } else if (this.keys.up) {
            this.vy = -this.speed;
            this.direction = 'up';
        } else if (this.keys.down) {
            this.vy = this.speed;
            this.direction = 'down';
        }

        this.isMoving = (this.vx !== 0 || this.vy !== 0);

        // Plantar Bomba
        if (this.keys.action && !this.actionPressed) {
            this.actionPressed = true;
            this.plantBomb(map, bombsArray);
        } else if (!this.keys.action) {
            this.actionPressed = false;
        }
    }

    plantBomb(map, bombsArray) {
        if (this.bombsActive >= this.bombCapacity) return;

        const gridPos = this.getGridPos();
        // Não planta se já tiver bomba no mesmo tile
        for (let b of bombsArray) {
            if (b.col === gridPos.col && b.row === gridPos.row && !b.toBeRemoved) {
                return;
            }
        }

        const bombX = gridPos.col * CONSTANTS.TILE_SIZE;
        const bombY = gridPos.row * CONSTANTS.TILE_SIZE;

        const newBomb = new Bomb(bombX, bombY, gridPos.col, gridPos.row, this.bombRadius, this);
        bombsArray.push(newBomb);
        map.grid[gridPos.row][gridPos.col] = CONSTANTS.TILE_BOMB;
        this.bombsActive++;
    }

    update(dt, map, bombsArray) {
        if (!this.isAlive) {
            this.deathTimer += dt;
            return;
        }

        this.handleInput(map, bombsArray);

        // Atualiza animação
        if (this.isMoving) {
            this.animTimer += dt;
            if (this.animTimer > 110) {
                this.animFrame = (this.animFrame + 1) % 4;
                this.animTimer = 0;
            }
        } else {
            this.animFrame = 0; // Postura parado olhando para a direção atual
        }

        // Movimento em X com Corner Assist
        if (this.vx !== 0) {
            this.x += this.vx;
            if (this.checkCollisions(map, bombsArray)) {
                this.x -= this.vx;
                this.cornerAssistY(map, bombsArray);
            }
        }

        // Movimento em Y com Corner Assist
        if (this.vy !== 0) {
            this.y += this.vy;
            if (this.checkCollisions(map, bombsArray)) {
                this.y -= this.vy;
                this.cornerAssistX(map, bombsArray);
            }
        }
    }

    // Facilita virar esquinas sem travar nos cantos dos blocos
    cornerAssistY(map, bombsArray) {
        const centerY = this.y + this.height / 2;
        const targetTileCenterY = (Math.floor(centerY / CONSTANTS.TILE_SIZE) + 0.5) * CONSTANTS.TILE_SIZE;
        const diff = targetTileCenterY - centerY;
        if (Math.abs(diff) < 14) {
            this.y += Math.sign(diff) * Math.min(Math.abs(diff), 2);
        }
    }

    cornerAssistX(map, bombsArray) {
        const centerX = this.x + this.width / 2;
        const targetTileCenterX = (Math.floor(centerX / CONSTANTS.TILE_SIZE) + 0.5) * CONSTANTS.TILE_SIZE;
        const diff = targetTileCenterX - centerX;
        if (Math.abs(diff) < 14) {
            this.x += Math.sign(diff) * Math.min(Math.abs(diff), 2);
        }
    }

    checkCollisions(map, bombsArray) {
        // Colisão com blocos do mapa
        const left = this.x;
        const right = this.x + this.width;
        const top = this.y;
        const bottom = this.y + this.height;

        const points = [
            { x: left + 2, y: top + 2 },
            { x: right - 2, y: top + 2 },
            { x: left + 2, y: bottom - 2 },
            { x: right - 2, y: bottom - 2 }
        ];

        for (let p of points) {
            const col = Math.floor(p.x / CONSTANTS.TILE_SIZE);
            const row = Math.floor(p.y / CONSTANTS.TILE_SIZE);

            if (col < 0 || col >= CONSTANTS.GRID_WIDTH || row < 0 || row >= CONSTANTS.GRID_HEIGHT) {
                return true;
            }

            const tile = map.grid[row][col];
            if (tile === CONSTANTS.TILE_SOLID || tile === CONSTANTS.TILE_SOFT) {
                return true;
            }
        }

        // Colisão com Bombas (apenas se o jogador não estiver mais sobrepondo a bomba)
        if (bombsArray) {
            for (let bomb of bombsArray) {
                if (!bomb.exploded && !bomb.toBeRemoved) {
                    if (!bomb.overlappingEntities.has(this)) {
                        if (this.checkCollision(bomb)) {
                            return true;
                        }
                    }
                }
            }
        }

        return false;
    }

    draw(ctx, spriteLoader) {
        const sprite = spriteLoader ? spriteLoader.get('hero') : null;
        
        if (sprite) {
            const frameW = sprite.width / 4;
            const frameH = sprite.height / 4;
            let row = 0;
            let flipH = false;

            if (!this.isAlive) {
                row = 3;
                const deathFrame = Math.min(3, Math.floor(this.deathTimer / 150));
                ctx.drawImage(
                    sprite,
                    deathFrame * frameW, row * frameH, frameW, frameH,
                    this.x - (CONSTANTS.TILE_SIZE - this.width)/2,
                    this.y - (CONSTANTS.TILE_SIZE - this.height)/2 - 6,
                    CONSTANTS.TILE_SIZE, CONSTANTS.TILE_SIZE + 6
                );
                return;
            }

            if (this.direction === 'down') {
                row = 0;
                flipH = false;
            } else if (this.direction === 'up') {
                row = 1;
                flipH = false;
            } else if (this.direction === 'left') {
                // O sprite nativo da linha 2 está virado para a ESQUERDA
                row = 2;
                flipH = false;
            } else if (this.direction === 'right') {
                // Espelha para a DIREITA
                row = 2;
                flipH = true;
            }

            const drawX = this.x - (CONSTANTS.TILE_SIZE - this.width)/2;
            const drawY = this.y - (CONSTANTS.TILE_SIZE - this.height)/2 - 6;

            ctx.save();
            if (flipH) {
                ctx.translate(drawX + CONSTANTS.TILE_SIZE, drawY);
                ctx.scale(-1, 1);
                ctx.drawImage(
                    sprite,
                    this.animFrame * frameW, row * frameH, frameW, frameH,
                    0, 0,
                    CONSTANTS.TILE_SIZE, CONSTANTS.TILE_SIZE + 6
                );
            } else {
                ctx.drawImage(
                    sprite,
                    this.animFrame * frameW, row * frameH, frameW, frameH,
                    drawX, drawY,
                    CONSTANTS.TILE_SIZE, CONSTANTS.TILE_SIZE + 6
                );
            }
            ctx.restore();
        } else {
            // Fallback
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }
}
