class LevelMap {
    constructor() {
        this.grid = [];
        this.powerUps = []; // {col, row, type, immunityTimer}
        this.door = null;   // {col, row, isRevealed, isOpen}
        this.keyInCrate = null;
        this.currentLevelBiome = CONSTANTS.BIOMES.FOREST;
        
        // Mecânica de Sudden Death (PvP)
        this.suddenDeathIndex = 0;
        this.suddenDeathOrder = [];
    }

    spawnPowerUp(col, row, forcedType = null) {
        for (let p of this.powerUps) {
            if (p.col === col && p.row === row) return;
        }

        let type = forcedType;
        if (!type) {
            const rand = Math.random();
            if (rand < 0.22) type = 'bomb';
            else if (rand < 0.44) type = 'fire';
            else if (rand < 0.60) type = 'speed';
            else if (rand < 0.72) type = 'shield';
            else if (rand < 0.82) type = 'remote'; // Detonador Remoto [X]
            else if (rand < 0.90) type = 'ice';    // Bomba de Gelo
            else if (rand < 0.96) type = 'skull';  // Caveira da Maldição
            else type = 'heart';
        }

        this.powerUps.push({
            col,
            row,
            type,
            immunityTimer: 750
        });
    }

    update(dt) {
        for (let p of this.powerUps) {
            if (p.immunityTimer > 0) {
                p.immunityTimer -= dt;
            }
        }
    }

    generate(mode = 'campaign', level = 1) {
        this.grid = [];
        this.powerUps = [];
        this.door = null;
        this.keyInCrate = null;
        this.rasenganCrates = [];
        
        // Define o bioma de acordo com a fase da campanha (1 a 5)
        if (mode === 'campaign') {
            this.currentLevelBiome = Math.min(4, Math.max(0, level - 1));
        } else if (mode === 'endless') {
            this.currentLevelBiome = (level % 4);
        } else {
            this.currentLevelBiome = 1; // PvP usa arena de cristais
        }

        const softWallPositions = [];

        for (let row = 0; row < CONSTANTS.GRID_HEIGHT; row++) {
            let rowArray = [];
            for (let col = 0; col < CONSTANTS.GRID_WIDTH; col++) {
                // Bordas externas sólidas
                if (row === 0 || row === CONSTANTS.GRID_HEIGHT - 1 || 
                    col === 0 || col === CONSTANTS.GRID_WIDTH - 1) {
                    rowArray.push(CONSTANTS.TILE_SOLID);
                    continue;
                }

                // Modo Boss Final (Fase 5 da Campanha)
                if (mode === 'campaign' && level === CONSTANTS.MAX_CAMPAIGN_LEVELS) {
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
                    let isSafe = false;

                    if (mode === 'pvp') {
                        if ((row === 1 && col <= 2) || (col === 1 && row <= 2)) isSafe = true;
                        if ((row === CONSTANTS.GRID_HEIGHT - 2 && col >= CONSTANTS.GRID_WIDTH - 3) || 
                            (col === CONSTANTS.GRID_WIDTH - 2 && row >= CONSTANTS.GRID_HEIGHT - 3)) isSafe = true;
                    } else {
                        if ((row === 1 && col <= 2) || (col === 1 && row <= 2)) isSafe = true;
                    }

                    if (isSafe) {
                        rowArray.push(CONSTANTS.TILE_EMPTY);
                    } else {
                        const softChance = (mode === 'endless') ? 0.38 : (mode === 'pvp' ? 0.55 : 0.46);
                        if (Math.random() < softChance) {
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

        // Posicionamento da Porta e Chave nas Fases 1 a 4 da Campanha
        if (mode === 'campaign' && level < CONSTANTS.MAX_CAMPAIGN_LEVELS && softWallPositions.length > 4) {
            softWallPositions.sort(() => Math.random() - 0.5);

            const doorPos = softWallPositions[0];
            this.door = {
                col: doorPos.col,
                row: doorPos.row,
                isRevealed: false,
                isOpen: false
            };

            if (Math.random() < 0.5) {
                const keyPos = softWallPositions[1];
                this.keyInCrate = { col: keyPos.col, row: keyPos.row };
            } else {
                this.keyInCrate = null;
            }

            this.rasenganCrates = [
                { col: softWallPositions[2].col, row: softWallPositions[2].row },
                { col: softWallPositions[3].col, row: softWallPositions[3].row }
            ];
        } else if (mode === 'campaign' && level === CONSTANTS.MAX_CAMPAIGN_LEVELS) {
            this.spawnPowerUp(3, 7, 'rasengan');
            this.spawnPowerUp(11, 7, 'rasengan');
            this.spawnPowerUp(7, 3, 'shield');
            this.spawnPowerUp(7, 11, 'remote');
        } else if (mode === 'pvp') {
            this.buildSuddenDeathSpiral();
        }
    }

    buildSuddenDeathSpiral() {
        this.suddenDeathIndex = 0;
        this.suddenDeathOrder = [];
        
        let top = 1, bottom = CONSTANTS.GRID_HEIGHT - 2;
        let left = 1, right = CONSTANTS.GRID_WIDTH - 2;

        while (top <= bottom && left <= right) {
            for (let c = left; c <= right; c++) this.suddenDeathOrder.push({ col: c, row: top });
            top++;
            for (let r = top; r <= bottom; r++) this.suddenDeathOrder.push({ col: right, row: r });
            right--;
            if (top <= bottom) {
                for (let c = right; c >= left; c--) this.suddenDeathOrder.push({ col: c, row: bottom });
                bottom--;
            }
            if (left <= right) {
                for (let r = bottom; r >= top; r--) this.suddenDeathOrder.push({ col: left, row: r });
                left++;
            }
        }
    }

    spawnNextSuddenDeathBlock(particleSystem) {
        if (this.suddenDeathIndex >= this.suddenDeathOrder.length) return null;
        const target = this.suddenDeathOrder[this.suddenDeathIndex++];
        this.grid[target.row][target.col] = CONSTANTS.TILE_SOLID;

        const x = target.col * CONSTANTS.TILE_SIZE;
        const y = target.row * CONSTANTS.TILE_SIZE;

        if (particleSystem) {
            particleSystem.addScreenShake(6, 200);
            particleSystem.createBrickDebris(x, y, 1);
        }
        if (window.soundManager) {
            window.soundManager.playBrickCrumble();
        }

        return target;
    }

    draw(ctx, spriteLoader, level, player) {
        const tileSprite = spriteLoader ? spriteLoader.get('tileset') : null;
        const itemSprite = spriteLoader ? spriteLoader.get('items') : null;
        const doorAndKeySprite = spriteLoader ? spriteLoader.get('door_and_key') : null;

        const spriteRow = Math.min(2, this.currentLevelBiome % 3);

        for (let row = 0; row < CONSTANTS.GRID_HEIGHT; row++) {
            for (let col = 0; col < CONSTANTS.GRID_WIDTH; col++) {
                const tile = this.grid[row][col];
                const x = col * CONSTANTS.TILE_SIZE;
                const y = row * CONSTANTS.TILE_SIZE;

                if (tileSprite) {
                    const tw = tileSprite.width / 3;
                    const th = tileSprite.height / 3;

                    ctx.save();
                    if (this.currentLevelBiome === CONSTANTS.BIOMES.VOLCANO) {
                        ctx.filter = 'hue-rotate(-40deg) saturate(1.4)';
                    } else if (this.currentLevelBiome === CONSTANTS.BIOMES.CYBER) {
                        ctx.filter = 'hue-rotate(160deg) contrast(1.2)';
                    } else if (this.currentLevelBiome === CONSTANTS.BIOMES.THRONE) {
                        ctx.filter = 'hue-rotate(240deg) brightness(0.85) contrast(1.3)';
                    }

                    // Chão Base
                    ctx.drawImage(
                        tileSprite,
                        2 * tw, spriteRow * th, tw, th,
                        x, y,
                        CONSTANTS.TILE_SIZE, CONSTANTS.TILE_SIZE
                    );

                    // Detalhes e Props procedurais de Piso
                    if (tile === CONSTANTS.TILE_EMPTY) {
                        this.drawFloorDetails(ctx, col, row, x, y);
                    }

                    // Porta Secreta
                    if (this.door && this.door.col === col && this.door.row === row && tile === CONSTANTS.TILE_EMPTY) {
                        this.door.isRevealed = true;
                        this.drawDoorTile(ctx, doorAndKeySprite, x, y, player);
                    }

                    // Paredes e Tijolos com Relevo e Bevel 3D
                    if (tile === CONSTANTS.TILE_SOLID) {
                        ctx.drawImage(
                            tileSprite,
                            0 * tw, spriteRow * th, tw, th,
                            x, y,
                            CONSTANTS.TILE_SIZE, CONSTANTS.TILE_SIZE
                        );
                        this.drawBlock3DBevel(ctx, x, y, true);

                    } else if (tile === CONSTANTS.TILE_SOFT) {
                        ctx.drawImage(
                            tileSprite,
                            1 * tw, spriteRow * th, tw, th,
                            x, y,
                            CONSTANTS.TILE_SIZE, CONSTANTS.TILE_SIZE
                        );
                        this.drawBlock3DBevel(ctx, x, y, false);
                    }
                    ctx.restore();
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

        // Desenha Power-ups com auras
        for (let p of this.powerUps) {
            const px = p.col * CONSTANTS.TILE_SIZE;
            const py = p.row * CONSTANTS.TILE_SIZE;
            const floatOffset = Math.sin((Date.now() + p.col * 200) / 180) * 2.5;

            if (p.type === 'key' && doorAndKeySprite) {
                const kw = doorAndKeySprite.width / 2;
                const kh = doorAndKeySprite.height / 2;
                ctx.drawImage(doorAndKeySprite, 0 * kw, 1 * kh, kw, kh, px + 4, py + 4 + floatOffset, CONSTANTS.TILE_SIZE - 8, CONSTANTS.TILE_SIZE - 8);

            } else if (p.type === 'shield' && doorAndKeySprite) {
                const kw = doorAndKeySprite.width / 2;
                const kh = doorAndKeySprite.height / 2;
                ctx.drawImage(doorAndKeySprite, 1 * kw, 1 * kh, kw, kh, px + 4, py + 4 + floatOffset, CONSTANTS.TILE_SIZE - 8, CONSTANTS.TILE_SIZE - 8);

            } else if (p.type === 'rasengan') {
                const rasenganSprite = spriteLoader ? spriteLoader.get('rasengan') : null;
                if (rasenganSprite) {
                    const sw = rasenganSprite.width / 2;
                    const sh = rasenganSprite.height / 2;
                    const frame = Math.floor((Date.now() / 90) % 4);
                    const sx = (frame % 2) * sw;
                    const sy = Math.floor(frame / 2) * sh;

                    ctx.save();
                    ctx.shadowColor = '#00e5ff';
                    ctx.shadowBlur = 14;
                    ctx.drawImage(rasenganSprite, sx, sy, sw, sh, px + 3, py + 3 + floatOffset, CONSTANTS.TILE_SIZE - 6, CONSTANTS.TILE_SIZE - 6);
                    ctx.restore();
                } else {
                    ctx.fillStyle = '#00e5ff';
                    ctx.beginPath();
                    ctx.arc(px + CONSTANTS.TILE_SIZE/2, py + CONSTANTS.TILE_SIZE/2 + floatOffset, 14, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else if (p.type === 'remote') {
                ctx.save();
                ctx.shadowColor = '#e91e63';
                ctx.shadowBlur = 12;
                ctx.fillStyle = 'rgba(233, 30, 99, 0.25)';
                ctx.beginPath();
                ctx.arc(px + CONSTANTS.TILE_SIZE/2, py + CONSTANTS.TILE_SIZE/2 + floatOffset, 16, 0, Math.PI * 2);
                ctx.fill();
                ctx.font = '22px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('⏱️', px + CONSTANTS.TILE_SIZE/2, py + CONSTANTS.TILE_SIZE/2 + floatOffset + 8);
                ctx.restore();

            } else if (p.type === 'skull') {
                ctx.save();
                ctx.shadowColor = '#ab47bc';
                ctx.shadowBlur = 14;
                ctx.font = '22px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('💀', px + CONSTANTS.TILE_SIZE/2, py + CONSTANTS.TILE_SIZE/2 + floatOffset + 8);
                ctx.restore();

            } else if (p.type === 'ice') {
                ctx.save();
                ctx.shadowColor = '#00e5ff';
                ctx.shadowBlur = 14;
                ctx.font = '22px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('❄️', px + CONSTANTS.TILE_SIZE/2, py + CONSTANTS.TILE_SIZE/2 + floatOffset + 8);
                ctx.restore();

            } else if (itemSprite) {
                const iw = itemSprite.width / 2;
                const ih = itemSprite.height / 2;
                let sx = 0, sy = 0;

                if (p.type === 'bomb') { sx = 0; sy = 0; }
                else if (p.type === 'fire') { sx = 1; sy = 0; }
                else if (p.type === 'speed') { sx = 0; sy = 1; }
                else if (p.type === 'heart') { sx = 1; sy = 1; }

                ctx.drawImage(itemSprite, sx * iw, sy * ih, iw, ih, px + 4, py + 4 + floatOffset, CONSTANTS.TILE_SIZE - 8, CONSTANTS.TILE_SIZE - 8);
            }
        }
    }

    // Relevo 3D / Bevel e destaques de luz
    drawBlock3DBevel(ctx, x, y, isSolid = false) {
        ctx.save();
        // Luz na borda superior
        ctx.fillStyle = isSolid ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.16)';
        ctx.fillRect(x, y, CONSTANTS.TILE_SIZE, 3);
        ctx.fillRect(x, y, 3, CONSTANTS.TILE_SIZE);

        // Sombra na borda inferior e direita
        ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
        ctx.fillRect(x, y + CONSTANTS.TILE_SIZE - 4, CONSTANTS.TILE_SIZE, 4);
        ctx.fillRect(x + CONSTANTS.TILE_SIZE - 4, y, 4, CONSTANTS.TILE_SIZE);
        ctx.restore();
    }

    // Props decorativos no chão
    drawFloorDetails(ctx, col, row, x, y) {
        const seed = (col * 17 + row * 31) % 100;
        if (seed > 35) return;

        ctx.save();
        if (this.currentLevelBiome === CONSTANTS.BIOMES.FOREST) {
            // Tufo de grama / florzinha sutil
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.beginPath();
            ctx.arc(x + 16, y + 20, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(255, 213, 79, 0.6)';
            ctx.beginPath();
            ctx.arc(x + 16, y + 20, 1.2, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.currentLevelBiome === CONSTANTS.BIOMES.CRYSTAL) {
            // Cristais cintilantes no chão
            ctx.fillStyle = 'rgba(0, 229, 255, 0.35)';
            ctx.fillRect(x + 20, y + 24, 3, 5);
        } else if (this.currentLevelBiome === CONSTANTS.BIOMES.VOLCANO) {
            // Fissura de magma
            ctx.fillStyle = 'rgba(255, 87, 34, 0.4)';
            ctx.fillRect(x + 12, y + 22, 8, 2);
            ctx.fillRect(x + 16, y + 24, 4, 3);
        } else if (this.currentLevelBiome === CONSTANTS.BIOMES.CYBER) {
            // Trilha de circuito neon
            ctx.fillStyle = 'rgba(0, 229, 255, 0.25)';
            ctx.fillRect(x + 10, y + 24, 12, 1.5);
            ctx.fillRect(x + 22, y + 18, 1.5, 7);
        }
        ctx.restore();
    }

    drawDoorTile(ctx, doorAndKeySprite, x, y, player) {
        if (!doorAndKeySprite) {
            ctx.fillStyle = player && player.hasKey ? '#00e676' : '#9e9e9e';
            ctx.fillRect(x + 4, y + 4, CONSTANTS.TILE_SIZE - 8, CONSTANTS.TILE_SIZE - 8);
            return;
        }

        const dw = doorAndKeySprite.width / 2;
        const dh = doorAndKeySprite.height / 2;
        const isOpen = player && player.hasKey;
        const colIdx = isOpen ? 1 : 0;
        const rowIdx = 0;

        ctx.drawImage(doorAndKeySprite, colIdx * dw, rowIdx * dh, dw, dh, x, y, CONSTANTS.TILE_SIZE, CONSTANTS.TILE_SIZE);
    }
}
