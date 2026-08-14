class Bomb {
    constructor(x, y, col, row, radius, owner) {
        this.x = x;
        this.y = y;
        this.col = col;
        this.row = row;
        this.width = CONSTANTS.TILE_SIZE;
        this.height = CONSTANTS.TILE_SIZE;
        this.radius = radius;
        this.owner = owner;
        
        this.timer = 2400;
        this.exploded = false;
        this.toBeRemoved = false;
        
        this.blasts = [];
        this.animTimer = 0;
        this.animFrame = 0;

        // Entidades que estavam sobre a bomba quando foi plantada (podem sair livremente)
        this.overlappingEntities = new Set();
        if (owner) {
            this.overlappingEntities.add(owner);
        }
    }

    update(dt, map) {
        this.animTimer += dt;
        if (this.animTimer > 100) {
            this.animFrame = (this.animFrame + 1) % 4;
            this.animTimer = 0;
        }

        // Verifica se as entidades que estavam em cima já saíram da bomba
        for (let entity of this.overlappingEntities) {
            if (!entity.isAlive || !this.intersects(entity)) {
                this.overlappingEntities.delete(entity);
            }
        }

        if (this.exploded) {
            this.timer -= dt;
            if (this.timer <= 0) {
                this.toBeRemoved = true;
                if (map.grid[this.row][this.col] === CONSTANTS.TILE_BOMB) {
                    map.grid[this.row][this.col] = CONSTANTS.TILE_EMPTY;
                }
            }
            return;
        }

        this.timer -= dt;
        if (this.timer <= 0) {
            this.explode(map);
        }
    }

    intersects(entity) {
        return (
            this.x < entity.x + entity.width &&
            this.x + this.width > entity.x &&
            this.y < entity.y + entity.height &&
            this.y + this.height > entity.y
        );
    }

    explode(map) {
        this.exploded = true;
        this.timer = 500;
        
        if (this.owner) {
            this.owner.bombsActive = Math.max(0, this.owner.bombsActive - 1);
        }

        this.blasts.push({ col: this.col, row: this.row, type: 'center' });
        map.grid[this.row][this.col] = CONSTANTS.TILE_EMPTY;

        const directions = [
            { c: 0, r: -1, typeBeam: 'beam_v', typeEnd: 'end_u' },
            { c: 0, r: 1, typeBeam: 'beam_v', typeEnd: 'end_d' },
            { c: -1, r: 0, typeBeam: 'beam_h', typeEnd: 'end_l' },
            { c: 1, r: 0, typeBeam: 'beam_h', typeEnd: 'end_r' }
        ];

        for (let dir of directions) {
            for (let i = 1; i <= this.radius; i++) {
                const targetCol = this.col + (dir.c * i);
                const targetRow = this.row + (dir.r * i);
                
                if (targetCol < 0 || targetCol >= CONSTANTS.GRID_WIDTH || 
                    targetRow < 0 || targetRow >= CONSTANTS.GRID_HEIGHT) {
                    break;
                }

                const tile = map.grid[targetRow][targetCol];
                
                if (tile === CONSTANTS.TILE_SOLID) {
                    break;
                }
                
                const isEnd = (i === this.radius);
                const blastType = isEnd ? dir.typeEnd : dir.typeBeam;

                if (tile === CONSTANTS.TILE_SOFT) {
                    map.grid[targetRow][targetCol] = CONSTANTS.TILE_EMPTY;
                    this.blasts.push({ col: targetCol, row: targetRow, type: blastType });
                    if (Math.random() < 0.4 && map.spawnPowerUp) {
                        map.spawnPowerUp(targetCol, targetRow);
                    }
                    break;
                }

                this.blasts.push({ col: targetCol, row: targetRow, type: blastType });
            }
        }
    }

    draw(ctx, spriteLoader) {
        if (this.toBeRemoved) return;

        const sprite = spriteLoader ? spriteLoader.get('bomb_explosion') : null;

        if (sprite) {
            const frameW = sprite.width / 4;
            const frameH = sprite.height / 4;

            if (!this.exploded) {
                ctx.drawImage(
                    sprite,
                    this.animFrame * frameW, 0, frameW, frameH,
                    this.x, this.y,
                    CONSTANTS.TILE_SIZE, CONSTANTS.TILE_SIZE
                );
            } else {
                for (let blast of this.blasts) {
                    const bx = blast.col * CONSTANTS.TILE_SIZE;
                    const by = blast.row * CONSTANTS.TILE_SIZE;
                    
                    let row = 1;
                    let angle = 0;

                    if (blast.type === 'center') {
                        row = 1;
                    } else if (blast.type.startsWith('beam')) {
                        row = 2;
                        if (blast.type === 'beam_v') angle = Math.PI / 2;
                    } else if (blast.type.startsWith('end')) {
                        row = 3;
                        if (blast.type === 'end_r') angle = 0;
                        else if (blast.type === 'end_d') angle = Math.PI / 2;
                        else if (blast.type === 'end_l') angle = Math.PI;
                        else if (blast.type === 'end_u') angle = -Math.PI / 2;
                    }

                    ctx.save();
                    ctx.translate(bx + CONSTANTS.TILE_SIZE / 2, by + CONSTANTS.TILE_SIZE / 2);
                    ctx.rotate(angle);
                    ctx.drawImage(
                        sprite,
                        this.animFrame * frameW, row * frameH, frameW, frameH,
                        -CONSTANTS.TILE_SIZE / 2, -CONSTANTS.TILE_SIZE / 2,
                        CONSTANTS.TILE_SIZE, CONSTANTS.TILE_SIZE
                    );
                    ctx.restore();
                }
            }
        } else {
            if (!this.exploded) {
                ctx.fillStyle = CONSTANTS.COLORS.BOMB;
                ctx.beginPath();
                ctx.arc(this.x + CONSTANTS.TILE_SIZE/2, this.y + CONSTANTS.TILE_SIZE/2, CONSTANTS.TILE_SIZE*0.4, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.fillStyle = CONSTANTS.COLORS.EXPLOSION;
                for (let blast of this.blasts) {
                    ctx.fillRect(blast.col * CONSTANTS.TILE_SIZE, blast.row * CONSTANTS.TILE_SIZE, CONSTANTS.TILE_SIZE, CONSTANTS.TILE_SIZE);
                }
            }
        }
    }
}
