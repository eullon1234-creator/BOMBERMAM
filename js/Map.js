class Map {
    constructor() {
        this.grid = [];
        this.powerUps = []; // {col, row, type, immunityTimer}
        this.door = null;   // {col, row, isRevealed, isOpen}
        this.keyInCrate = null;
        this.keyCarrierEnemyIndex = -1;
    }

    spawnPowerUp(col, row, forcedType = null) {
        // Se já existe um power-up neste tile, não sobrepõe
        for (let p of this.powerUps) {
            if (p.col === col && p.row === row) return;
        }

        let type = forcedType;
        if (!type) {
            const rand = Math.random();
            if (rand < 0.28) type = 'bomb';
            else if (rand < 0.56) type = 'fire';
            else if (rand < 0.74) type = 'speed';
            else if (rand < 0.88) type = 'heart';
            else type = 'shield';
        }

        // immunityTimer protege o item recém-gerado da explosão que quebrou a caixa
        this.powerUps.push({
            col,
            row,
            type,
            immunityTimer: 750
        });
    }

    update(dt) {
        // Reduz tempo de imunidade dos power-ups
        for (let p of this.powerUps) {
            if (p.immunityTimer > 0) {
                p.immunityTimer -= dt;
            }
        }
    }

    generate(level) {
        this.grid = [];
        this.powerUps = [];
        this.door = null;
        this.keyInCrate = null;

        const softWallPositions = [];

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

                // Grid clássico de pilares indestrutíveis
                if (row % 2 === 0 && col % 2 === 0) {
                    rowArray.push(CONSTANTS.TILE_SOLID);
                } else {
                    // Safe zone do jogador (3x3 inicial)
                    if ((row === 1 && col <= 2) || (col === 1 && row <= 2)) {
                        rowArray.push(CONSTANTS.TILE_EMPTY);
                    } else {
                        // Taxa equilibrada de blocos destrutíveis
                        if (Math.random() < 0.45) {
                            rowArray.push(CONSTANTS.TILE_SOFT);
                            softWallPositions.push({ col, row });
                        } else {
                            rowArray.push(CONSTANTS.TILE_EMPTY);
                        }
                    }
                }
            }
            this.grid.push(rowArray);
        }

        // Posicionamento da Porta e da Chave para as fases 1 e 2
        if (level < 3 && softWallPositions.length > 3) {
            // Embaralha as posições dos blocos de tijolo
            softWallPositions.sort(() => Math.random() - 0.5);

            // Esconde a Porta sob um dos tijolos distantes da base
            const doorPos = softWallPositions[0];
            this.door = {
                col: doorPos.col,
                row: doorPos.row,
                isRevealed: false,
                isOpen: false
            };

            // 50% de chance da Chave estar numa caixa ou ser dropada por um inimigo
            if (Math.random() < 0.5) {
                const keyPos = softWallPositions[1];
                this.keyInCrate = { col: keyPos.col, row: keyPos.row };
            } else {
                this.keyInCrate = null; // Será atribuída a um dos inimigos no Game.js
            }
        }
    }

    draw(ctx, spriteLoader, level, player) {
        const tileSprite = spriteLoader ? spriteLoader.get('tileset') : null;
        const itemSprite = spriteLoader ? spriteLoader.get('items') : null;
        const doorAndKeySprite = spriteLoader ? spriteLoader.get('door_and_key') : null;

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

                    // Desenha a PORTA se o bloco sobre ela já foi destruído
                    if (this.door && this.door.col === col && this.door.row === row && tile === CONSTANTS.TILE_EMPTY) {
                        this.door.isRevealed = true;
                        this.drawDoorTile(ctx, doorAndKeySprite, x, y, player);
                    }

                    // Desenha Paredes e Tijolos
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
            const floatOffset = Math.sin((Date.now() + p.col * 200) / 180) * 2;

            if (p.type === 'key' && doorAndKeySprite) {
                const kw = doorAndKeySprite.width / 2;
                const kh = doorAndKeySprite.height / 2;
                ctx.drawImage(
                    doorAndKeySprite,
                    0 * kw, 1 * kh, kw, kh,
                    px + 4, py + 4 + floatOffset,
                    CONSTANTS.TILE_SIZE - 8, CONSTANTS.TILE_SIZE - 8
                );
            } else if (p.type === 'shield' && doorAndKeySprite) {
                const kw = doorAndKeySprite.width / 2;
                const kh = doorAndKeySprite.height / 2;
                ctx.drawImage(
                    doorAndKeySprite,
                    1 * kw, 1 * kh, kw, kh,
                    px + 4, py + 4 + floatOffset,
                    CONSTANTS.TILE_SIZE - 8, CONSTANTS.TILE_SIZE - 8
                );
            } else if (itemSprite) {
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
                    px + 4, py + 4 + floatOffset,
                    CONSTANTS.TILE_SIZE - 8, CONSTANTS.TILE_SIZE - 8
                );
            } else {
                ctx.fillStyle = p.type === 'key' ? '#ffd700' : '#ffff00';
                ctx.fillRect(px + 8, py + 8, CONSTANTS.TILE_SIZE - 16, CONSTANTS.TILE_SIZE - 16);
            }
        }
    }

    drawDoorTile(ctx, doorAndKeySprite, x, y, player) {
        if (!doorAndKeySprite) {
            ctx.fillStyle = player && player.hasKey ? '#00e676' : '#9e9e9e';
            ctx.fillRect(x + 4, y + 4, CONSTANTS.TILE_SIZE - 8, CONSTANTS.TILE_SIZE - 8);
            return;
        }

        const dw = doorAndKeySprite.width / 2;
        const dh = doorAndKeySprite.height / 2;

        // Se o jogador possui a chave, a porta brilha aberta com o portal místico!
        const isOpen = player && player.hasKey;
        const colIdx = isOpen ? 1 : 0;
        const rowIdx = 0;

        ctx.drawImage(
            doorAndKeySprite,
            colIdx * dw, rowIdx * dh, dw, dh,
            x, y,
            CONSTANTS.TILE_SIZE, CONSTANTS.TILE_SIZE
        );
    }
}
