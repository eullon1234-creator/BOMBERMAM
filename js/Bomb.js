class Bomb {
    constructor(x, y, col, row, radius, owner, isRemote = false, isIce = false) {
        this.x = x;
        this.y = y;
        this.col = col;
        this.row = row;
        this.width = CONSTANTS.TILE_SIZE;
        this.height = CONSTANTS.TILE_SIZE;
        this.radius = radius;
        this.owner = owner;
        this.isRemote = isRemote;
        this.isIce = isIce;
        
        this.timer = isRemote ? 15000 : 2400; // Bomba remota espera comando manual (failsafe de 15s)
        this.exploded = false;
        this.toBeRemoved = false;
        
        // Propriedades do Chute de Bomba (Bomb Kick)
        this.isSliding = false;
        this.slideDir = null; // 'up', 'down', 'left', 'right'
        this.slideSpeed = 5.2; // Velocidade natural e suave de deslizamento ao chutar
        
        this.blasts = [];
        this.animTimer = 0;
        this.animFrame = 0;

        // Entidades que estavam sobre a bomba quando foi plantada (podem sair livremente)
        this.overlappingEntities = new Set();
        if (owner) {
            this.overlappingEntities.add(owner);
        }
    }

    kick(dir, map, bombsArray, enemies, boss, particleSystem) {
        if (this.exploded || this.toBeRemoved) return false;
        
        // Checa se o próximo tile na direção do chute está livre
        let nextCol = this.col;
        let nextRow = this.row;
        if (dir === 'left') nextCol--;
        else if (dir === 'right') nextCol++;
        else if (dir === 'up') nextRow--;
        else if (dir === 'down') nextRow++;

        if (nextCol < 0 || nextCol >= CONSTANTS.GRID_WIDTH || nextRow < 0 || nextRow >= CONSTANTS.GRID_HEIGHT) {
            return false;
        }

        const nextTile = map.grid[nextRow][nextCol];
        if (nextTile === CONSTANTS.TILE_SOLID || nextTile === CONSTANTS.TILE_SOFT) {
            return false;
        }

        // Checa se já tem outra bomba lá
        if (bombsArray) {
            for (let b of bombsArray) {
                if (b !== this && !b.exploded && !b.toBeRemoved && b.col === nextCol && b.row === nextRow) {
                    return false;
                }
            }
        }

        this.isSliding = true;
        this.slideDir = dir;

        // Libera o tile atual no grid enquanto desliza
        if (map.grid[this.row][this.col] === CONSTANTS.TILE_BOMB) {
            map.grid[this.row][this.col] = CONSTANTS.TILE_EMPTY;
        }

        if (window.soundManager) {
            window.soundManager.playBombKick();
        }

        if (particleSystem) {
            particleSystem.addFloatingText(this.x + 24, this.y - 10, "KICK!", "#ff9800", 11, true);
        }

        return true;
    }

    stopSliding(map) {
        this.isSliding = false;
        this.slideDir = null;
        
        // Alinha perfeitamente ao grid
        this.col = Math.max(0, Math.min(CONSTANTS.GRID_WIDTH - 1, Math.round(this.x / CONSTANTS.TILE_SIZE)));
        this.row = Math.max(0, Math.min(CONSTANTS.GRID_HEIGHT - 1, Math.round(this.y / CONSTANTS.TILE_SIZE)));
        this.x = this.col * CONSTANTS.TILE_SIZE;
        this.y = this.row * CONSTANTS.TILE_SIZE;

        if (!this.exploded && map.grid[this.row][this.col] === CONSTANTS.TILE_EMPTY) {
            map.grid[this.row][this.col] = CONSTANTS.TILE_BOMB;
        }
    }

    detonate(map, particleSystem) {
        if (!this.exploded && !this.toBeRemoved) {
            if (this.isSliding) {
                this.stopSliding(map);
            }
            this.explode(map, particleSystem);
        }
    }

    update(dt, map, bombsArray, enemies, boss, particleSystem, lightingSystem) {
        this.animTimer += dt;
        if (this.animTimer > 90) {
            this.animFrame = (this.animFrame + 1) % 4;
            this.animTimer = 0;
        }

        // Emite faíscas do pavio enquanto a bomba está acesa
        if (!this.exploded && particleSystem) {
            particleSystem.createBombFuseSpark(this.x + 24, this.y + 10);
        }

        // Registra luz dinâmica da bomba acesa
        if (!this.exploded && lightingSystem) {
            const pulse = 1 + Math.sin(Date.now() / 140) * 0.15;
            lightingSystem.addLight(this.x + 24, this.y + 24, 75 * pulse, this.isIce ? '#00e5ff' : '#ff9800', 0.9);
        }

        // Registra flashes das explosões ativas
        if (this.exploded && lightingSystem) {
            for (let blast of this.blasts) {
                lightingSystem.addLight(blast.col * CONSTANTS.TILE_SIZE + 24, blast.row * CONSTANTS.TILE_SIZE + 24, 95, '#ffaa00', 1.0);
            }
        }

        // Verifica se as entidades que estavam em cima já saíram da bomba
        for (let entity of this.overlappingEntities) {
            if (!entity.isAlive || !this.intersects(entity)) {
                this.overlappingEntities.delete(entity);
            }
        }

        // Movimento de deslizamento (Kick)
        if (this.isSliding && !this.exploded) {
            const timeScale = Math.min(dt || 16.6667, 50) / 16.6667;
            let vx = 0;
            let vy = 0;
            if (this.slideDir === 'left') vx = -this.slideSpeed * timeScale;
            else if (this.slideDir === 'right') vx = this.slideSpeed * timeScale;
            else if (this.slideDir === 'up') vy = -this.slideSpeed * timeScale;
            else if (this.slideDir === 'down') vy = this.slideSpeed * timeScale;

            this.x += vx;
            this.y += vy;

            this.col = Math.max(0, Math.min(CONSTANTS.GRID_WIDTH - 1, Math.round(this.x / CONSTANTS.TILE_SIZE)));
            this.row = Math.max(0, Math.min(CONSTANTS.GRID_HEIGHT - 1, Math.round(this.y / CONSTANTS.TILE_SIZE)));

            // Checagem de colisão frontal durante o deslizamento
            let checkX = this.x + this.width / 2;
            let checkY = this.y + this.height / 2;
            if (this.slideDir === 'right') checkX = this.x + this.width + 1;
            else if (this.slideDir === 'left') checkX = this.x - 1;
            else if (this.slideDir === 'down') checkY = this.y + this.height + 1;
            else if (this.slideDir === 'up') checkY = this.y - 1;

            const checkCol = Math.floor(checkX / CONSTANTS.TILE_SIZE);
            const checkRow = Math.floor(checkY / CONSTANTS.TILE_SIZE);

            let hitObstacle = false;

            if (checkCol < 0 || checkCol >= CONSTANTS.GRID_WIDTH || checkRow < 0 || checkRow >= CONSTANTS.GRID_HEIGHT) {
                hitObstacle = true;
            } else {
                const tile = map.grid[checkRow][checkCol];
                if (tile === CONSTANTS.TILE_SOLID || tile === CONSTANTS.TILE_SOFT) {
                    if (this.slideDir === 'right' && this.x + this.width >= checkCol * CONSTANTS.TILE_SIZE) hitObstacle = true;
                    else if (this.slideDir === 'left' && this.x <= (checkCol + 1) * CONSTANTS.TILE_SIZE) hitObstacle = true;
                    else if (this.slideDir === 'down' && this.y + this.height >= checkRow * CONSTANTS.TILE_SIZE) hitObstacle = true;
                    else if (this.slideDir === 'up' && this.y <= (checkRow + 1) * CONSTANTS.TILE_SIZE) hitObstacle = true;
                }
            }

            if (bombsArray) {
                for (let b of bombsArray) {
                    if (b !== this && !b.exploded && !b.toBeRemoved && this.intersects(b)) {
                        hitObstacle = true;
                        break;
                    }
                }
            }

            if (enemies) {
                for (let e of enemies) {
                    if (e.isAlive && this.intersects(e)) {
                        hitObstacle = true;
                        break;
                    }
                }
            }
            if (boss && boss.isAlive && this.intersects(boss)) {
                hitObstacle = true;
            }

            if (hitObstacle) {
                this.stopSliding(map);
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

        // Bombas normais contam o tempo até explodir; bombas remotas só detonam por tempo após 15s
        this.timer -= dt;
        if (this.timer <= 0) {
            if (this.isSliding) {
                this.stopSliding(map);
            }
            this.explode(map, particleSystem);
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

    explode(map, particleSystem) {
        if (this.exploded) return;
        this.exploded = true;
        this.timer = 500;
        
        if (window.soundManager) {
            if (this.isIce) {
                window.soundManager.playFreeze();
            } else {
                window.soundManager.playExplosion();
            }
        }
        
        if (this.owner) {
            this.owner.bombsActive = Math.max(0, this.owner.bombsActive - 1);
        }

        const cx = this.col * CONSTANTS.TILE_SIZE + CONSTANTS.TILE_SIZE / 2;
        const cy = this.row * CONSTANTS.TILE_SIZE + CONSTANTS.TILE_SIZE / 2;

        if (particleSystem) {
            particleSystem.addScreenShake(6, 220);
            particleSystem.createShockwave(cx, cy, 45, this.isIce ? 'rgba(0, 229, 255, 0.85)' : 'rgba(255, 170, 0, 0.85)');
            particleSystem.createExplosionSparks(cx, cy, this.isIce ? '#00e5ff' : '#ff9800', 16);
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

                    // Dispara estilhaços de tijolos com o sistema de partículas
                    if (particleSystem) {
                        const bx = targetCol * CONSTANTS.TILE_SIZE;
                        const by = targetRow * CONSTANTS.TILE_SIZE;
                        particleSystem.createBrickDebris(bx, by, map.currentLevelBiome || 0);
                    }
                    if (window.soundManager) {
                        window.soundManager.playBrickCrumble();
                    }

                    if (map.spawnPowerUp) {
                        // Verifica itens especiais e drops de bloco
                        if (map.keyInCrate && map.keyInCrate.col === targetCol && map.keyInCrate.row === targetRow) {
                            map.spawnPowerUp(targetCol, targetRow, 'key');
                        } else if (map.rasenganCrates && map.rasenganCrates.some(c => c.col === targetCol && c.row === targetRow)) {
                            map.spawnPowerUp(targetCol, targetRow, 'rasengan');
                        } else if (Math.random() < 0.72) {
                            map.spawnPowerUp(targetCol, targetRow);
                        }
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
                ctx.save();
                // Efeito especial de brilho se for bomba remota ou congelante
                if (this.isRemote) {
                    ctx.shadowColor = '#e91e63';
                    ctx.shadowBlur = 12;
                } else if (this.isIce) {
                    ctx.shadowColor = '#00e5ff';
                    ctx.shadowBlur = 12;
                }

                ctx.drawImage(
                    sprite,
                    this.animFrame * frameW, 0, frameW, frameH,
                    this.x, this.y,
                    CONSTANTS.TILE_SIZE, CONSTANTS.TILE_SIZE
                );

                // Indicador de antena piscante para bomba remota
                if (this.isRemote) {
                    ctx.fillStyle = (Math.floor(Date.now() / 150) % 2 === 0) ? '#ff1744' : '#00e676';
                    ctx.beginPath();
                    ctx.arc(this.x + CONSTANTS.TILE_SIZE / 2, this.y + 6, 3.5, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
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
                ctx.fillStyle = this.isRemote ? '#d81b60' : CONSTANTS.COLORS.BOMB;
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
