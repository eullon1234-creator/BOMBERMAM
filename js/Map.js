class Map {
    constructor() {
        this.grid = [];
        this.powerUps = []; // {col, row, type: 'bomb'|'fire'|'speed'|'heart'}
    }

    spawnPowerUp(col, row) {
        const types = ['bomb', 'fire', 'speed', 'heart'];
        const type = types[Math.floor(Math.random() * types.length)];
        this.powerUps.push({ col, row, type });
    }

    generate(level) {
        this.grid = [];
        this.powerUps = [];

        for (let row = 0; row < CONSTANTS.GRID_HEIGHT; row++) {
            let rowArray = [];
            for (let col = 0; col < CONSTANTS.GRID_WIDTH; col++) {
                
                // Bordas
                if (row === 0 || row === CONSTANTS.GRID_HEIGHT - 1 || 
                    col === 0 || col === CONSTANTS.GRID_WIDTH - 1) {
                    rowArray.push(CONSTANTS.TILE_SOLID);
                    continue;
                }

                if (level === 3) {
                    // Arena do Boss
                    if ((row === 3 || row === 11) && (col === 3 || col === 11)) {
                        rowArray.push(CONSTANTS.TILE_SOLID);
                    } else {
                        rowArray.push(CONSTANTS.TILE_EMPTY);
                    }
                    continue;
                }

                // Grid clássico
                if (row % 2 === 0 && col % 2 === 0) {
                    rowArray.push(CONSTANTS.TILE_SOLID);
                } else {
                    // Safe zone do jogador
                    if ((row === 1 && col <= 2) || (col === 1 && row <= 2)) {
                        rowArray.push(CONSTANTS.TILE_EMPTY);
                    } else {
                        if (Math.random() < 0.35) {
                            rowArray.push(CONSTANTS.TILE_SOFT);
                        } else {
                            rowArray.push(CONSTANTS.TILE_EMPTY);
                        }
                    }
                }
            }
            this.grid.push(rowArray);
        }
    }

    draw(ctx, spriteLoader, level) {
        const tileSprite = spriteLoader ? spriteLoader.get('tileset') : null;
        const itemSprite = spriteLoader ? spriteLoader.get('items') : null;

        const tileRow = Math.min(2, level - 1); // 0 = Grass/Bricks, 1 = Dungeon/Crate, 2 = Cyber Arena

        for (let row = 0; row < CONSTANTS.GRID_HEIGHT; row++) {
            for (let col = 0; col < CONSTANTS.GRID_WIDTH; col++) {
                const tile = this.grid[row][col];
                const x = col * CONSTANTS.TILE_SIZE;
                const y = row * CONSTANTS.TILE_SIZE;

                if (tileSprite) {
                    const tw = tileSprite.width / 3;
                    const th = tileSprite.height / 3;

                    // Desenha o chão primeiro
                    ctx.drawImage(
                        tileSprite,
                        2 * tw, tileRow * th, tw, th,
                        x, y,
                        CONSTANTS.TILE_SIZE, CONSTANTS.TILE_SIZE
                    );

                    if (tile === CONSTANTS.TILE_SOLID) {
                        ctx.drawImage(
                            tileSprite,
                            0 * tw, tileRow * th, tw, th,
                            x, y,
                            CONSTANTS.TILE_SIZE, CONSTANTS.TILE_SIZE
                        );
                    } else if (tile === CONSTANTS.TILE_SOFT) {
                        ctx.drawImage(
                            tileSprite,
                            1 * tw, tileRow * th, tw, th,
                            x, y,
                            CONSTANTS.TILE_SIZE, CONSTANTS.TILE_SIZE
                        );
                    }
                } else {
                    if (tile === CONSTANTS.TILE_SOLID) {
                        ctx.fillStyle = CONSTANTS.COLORS.SOLID_WALL;
                        ctx.fillRect(x, y, CONSTANTS.TILE_SIZE, CONSTANTS.TILE_SIZE);
                    } else if (tile === CONSTANTS.TILE_SOFT) {
                        ctx.fillStyle = CONSTANTS.COLORS.SOFT_WALL;
                        ctx.fillRect(x, y, CONSTANTS.TILE_SIZE, CONSTANTS.TILE_SIZE);
                    }
                }
            }
        }

        // Desenha Power-ups caídos no chão
        for (let p of this.powerUps) {
            const px = p.col * CONSTANTS.TILE_SIZE;
            const py = p.row * CONSTANTS.TILE_SIZE;

            if (itemSprite) {
                const iw = itemSprite.width / 2;
                const ih = itemSprite.height / 2;
                let sx = 0, sy = 0;

                if (p.type === 'bomb') { sx = 0; sy = 0; }
                else if (p.type === 'fire') { sx = 1; sy = 0; }
                else if (p.type === 'speed') { sx = 0; sy = 1; }
                else if (p.type === 'heart') { sx = 1; sy = 1; }

                ctx.drawImage(
                    itemSprite,
                    sx * iw, sy * ih, iw, ih,
                    px + 4, py + 4,
                    CONSTANTS.TILE_SIZE - 8, CONSTANTS.TILE_SIZE - 8
                );
            } else {
                ctx.fillStyle = '#ffff00';
                ctx.fillRect(px + 8, py + 8, CONSTANTS.TILE_SIZE - 16, CONSTANTS.TILE_SIZE - 16);
            }
        }
    }
}
