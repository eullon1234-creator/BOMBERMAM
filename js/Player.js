class Player extends Entity {
    constructor(x, y, character = 'hero', playerIndex = 1) {
        // Tamanho da hitbox do personagem ligeiramente menor que o tile para passagem suave em corredores
        const boxSize = CONSTANTS.TILE_SIZE * 0.60;
        super(x, y, boxSize, boxSize);
        
        this.character = character; // 'hero', 'hero_naruto', 'hero_sasuke', 'hero_warrior'
        this.playerIndex = playerIndex; // 1 (P1) ou 2 (P2)
        
        if (this.character === 'hero_naruto') {
            this.color = '#ff9800';
            this.baseSpeed = 2.4;
            this.speed = 2.4;
            this.bombCapacity = 1;
            this.bombRadius = 2;
        } else if (this.character === 'hero_sasuke') {
            this.color = '#1a237e';
            this.baseSpeed = 2.5;
            this.speed = 2.5;
            this.bombCapacity = 1;
            this.bombRadius = 2;
        } else if (this.character === 'hero_warrior') {
            this.color = '#c8860a';
            this.baseSpeed = 2.6;
            this.speed = 2.6;
            this.bombCapacity = 1;
            this.bombRadius = 3;
        } else {
            this.color = (this.playerIndex === 2) ? '#00e5ff' : CONSTANTS.COLORS.PLAYER;
            this.baseSpeed = 2.2;
            this.speed = 2.2;
            this.bombCapacity = 1;
            this.bombRadius = 2;
        }
        
        this.bombsActive = 0;
        
        this.keys = {
            up: false,
            down: false,
            left: false,
            right: false,
            action: false,
            special: false,
            remote: false
        };
        
        this.actionPressed = false;
        this.specialPressed = false;
        this.remotePressed = false;
        this.direction = 'down';
        this.animFrame = 0;
        this.animTimer = 0;
        this.isMoving = false;
        this.deathTimer = 0;
        this.castTimer = 0;

        // Estado de Itens e Poderes
        this.hasKey = false;
        this.hasShield = false;
        this.shieldTimer = 0;
        this.spawnShieldTimer = 1500;
        this.rasenganAmmo = 0;
        this.hasRemoteTrigger = false;
        this.hasIceBomb = false;
        this.hasSpikeBomb = false;
        this.portalCooldown = 0;
        this.iceSlideVx = 0;
        this.iceSlideVy = 0;

        // Sistema de Maldição da Caveira (Skull Curse)
        this.curseType = null;
        this.curseTimer = 0;
        this.diarrheaTimer = 0;

        this.pvpWins = 0;
    }

    applyCurse(curseType, duration = 8000) {
        this.curseType = curseType;
        this.curseTimer = duration;
        if (window.soundManager) {
            window.soundManager.playCurseSkull();
        }
    }

    handleInput(map, bombsArray, game, dt = 16.6667) {
        this.vx = 0;
        this.vy = 0;

        let inputX = 0;
        let inputY = 0;

        this.vx = 0;
        this.vy = 0;

        const isInverted = (this.curseType === CONSTANTS.CURSE_TYPES.INVERTED && this.curseTimer > 0);

        if (this.keys.left) inputX += isInverted ? 1 : -1;
        if (this.keys.right) inputX += isInverted ? -1 : 1;
        if (this.keys.up) inputY += isInverted ? 1 : -1;
        if (this.keys.down) inputY += isInverted ? -1 : 1;

        let effectiveSpeed = this.speed;
        if (this.curseTimer > 0) {
            if (this.curseType === CONSTANTS.CURSE_TYPES.SLOW) {
                effectiveSpeed = Math.max(1.0, this.speed * 0.5);
            } else if (this.curseType === CONSTANTS.CURSE_TYPES.FAST) {
                effectiveSpeed = this.speed * 1.6;
            }
        }

        const timeScale = Math.min(dt, 50) / 16.6667;

        // Atualização precisa e sem ambiguidades da direção
        if (inputY < 0) this.direction = 'up';
        else if (inputY > 0) this.direction = 'down';
        else if (inputX < 0) this.direction = 'left';
        else if (inputX > 0) this.direction = 'right';

        // Movimentação nítida e responsiva
        if (inputX !== 0 && inputY !== 0) {
            this.vx = inputX * effectiveSpeed * 0.72 * timeScale;
            this.vy = inputY * effectiveSpeed * 0.72 * timeScale;
        } else if (inputX !== 0) {
            this.vx = inputX * effectiveSpeed * timeScale;
        } else if (inputY !== 0) {
            this.vy = inputY * effectiveSpeed * timeScale;
        }

        // Maldição de Diarreia de Bombas
        if (this.curseTimer > 0 && this.curseType === CONSTANTS.CURSE_TYPES.DIARRHEA) {
            this.diarrheaTimer += dt;
            if (this.diarrheaTimer > 600) {
                this.diarrheaTimer = 0;
                this.placeBomb(map, bombsArray, game);
            }
        }

        // Plantar Bomba (Espaço / Enter)
        if (this.keys.action && !this.actionPressed) {
            this.actionPressed = true;
            this.placeBomb(map, bombsArray, game);
        } else if (!this.keys.action) {
            this.actionPressed = false;
        }

        // Usar Especial (Tecla Z / L)
        if (this.keys.special && !this.specialPressed) {
            this.specialPressed = true;
            this.castSpecial(game);
        } else if (!this.keys.special) {
            this.specialPressed = false;
        }

        // Detonar Bombas Remotamente (Tecla X / K)
        if (this.keys.remote && !this.remotePressed) {
            this.remotePressed = true;
            this.detonateRemoteBombs(map, bombsArray, game);
        } else if (!this.keys.remote) {
            this.remotePressed = false;
        }
    }

    detonateRemoteBombs(map, bombsArray, game) {
        if (!this.hasRemoteTrigger || !bombsArray) return;
        let detonatedCount = 0;
        for (let b of bombsArray) {
            if (b.owner === this && b.isRemote && !b.exploded && !b.toBeRemoved) {
                b.detonate(map, game?.particleSystem);
                detonatedCount++;
            }
        }
        if (detonatedCount > 0 && window.soundManager) {
            window.soundManager.playRemoteTrigger();
        }
    }

    castSpecial(game) {
        if (this.rasenganAmmo <= 0 || !game) return;
        this.rasenganAmmo--;
        if (game.playerStats && this.playerIndex === 1) {
            game.playerStats.rasenganAmmo = this.rasenganAmmo;
        }
        this.castTimer = 350;

        const pSize = CONSTANTS.TILE_SIZE * 0.85;
        const startX = this.x + (this.width - pSize) / 2;
        const startY = this.y + (this.height - pSize) / 2;

        if (this.character === 'hero_sasuke') {
            const proj = new ChidoriProjectile(startX, startY, this.direction, this);
            if (!game.chidoris) game.chidoris = [];
            game.chidoris.push(proj);
            if (window.soundManager) window.soundManager.playChidoriLaunch();
            if (game.particleSystem) game.particleSystem.addScreenShake(8, 200);

        } else if (this.character === 'hero_warrior') {
            this.castWarriorFlameCyclone(game);

        } else if (this.character === 'hero') {
            this.castMegaBomb(game);

        } else {
            const proj = new RasenganProjectile(startX, startY, this.direction, this);
            if (!game.rasengans) game.rasengans = [];
            game.rasengans.push(proj);
            if (window.soundManager) window.soundManager.playRasenganLaunch();
            if (game.particleSystem) game.particleSystem.addScreenShake(8, 200);
        }

        game.updateUI();
    }

    castWarriorFlameCyclone(game) {
        if (window.soundManager) window.soundManager.playWarriorSpin();
        if (game.particleSystem) {
            game.particleSystem.addScreenShake(10, 300);
            game.particleSystem.createShockwave(this.x + this.width/2, this.y + this.height/2, 80, 'rgba(255, 100, 0, 0.9)');
            game.particleSystem.createExplosionSparks(this.x + this.width/2, this.y + this.height/2, '#ff5722', 25);
            game.particleSystem.addFloatingText(this.x + this.width/2, this.y - 15, "FIRE CYCLONE!", "#ff5722", 14, true);
        }

        const myGrid = this.getGridPos();
        for (let r = myGrid.row - 1; r <= myGrid.row + 1; r++) {
            for (let c = myGrid.col - 1; c <= myGrid.col + 1; c++) {
                if (r < 0 || r >= CONSTANTS.GRID_HEIGHT || c < 0 || c >= CONSTANTS.GRID_WIDTH) continue;
                
                if (game.map.grid[r][c] === CONSTANTS.TILE_SOFT) {
                    game.map.grid[r][c] = CONSTANTS.TILE_EMPTY;
                    if (game.particleSystem) {
                        game.particleSystem.createBrickDebris(c * CONSTANTS.TILE_SIZE, r * CONSTANTS.TILE_SIZE, game.map.currentLevelBiome || 0);
                    }
                    if (game.map.spawnPowerUp && Math.random() < 0.6) {
                        game.map.spawnPowerUp(c, r);
                    }
                    game.score += 30;
                }

                const hitBox = { x: c * CONSTANTS.TILE_SIZE, y: r * CONSTANTS.TILE_SIZE, width: CONSTANTS.TILE_SIZE, height: CONSTANTS.TILE_SIZE };
                if (game.enemies) {
                    for (let enemy of game.enemies) {
                        if (enemy.isAlive && enemy.checkCollision(hitBox)) {
                            const isDead = enemy.takeDamage(3, game.map);
                            if (isDead) {
                                game.comboCount++;
                                game.score += (enemy.scoreValue || 150) * 2;
                                game.updateUI();
                            }
                        }
                    }
                }
                if (game.boss && game.boss.isAlive && game.boss.checkCollision(hitBox)) {
                    game.boss.takeDamage(2);
                    game.score += 250;
                    game.updateUI();
                }
            }
        }
    }

    castMegaBomb(game) {
        const gridPos = this.getGridPos();
        const bomb = new Bomb(gridPos.col * CONSTANTS.TILE_SIZE, gridPos.row * CONSTANTS.TILE_SIZE, gridPos.col, gridPos.row, this.bombRadius + 3, this, false, false);
        game.bombs.push(bomb);
        game.map.grid[gridPos.row][gridPos.col] = CONSTANTS.TILE_BOMB;
        
        if (window.soundManager) window.soundManager.playBombPlant();
        if (game.particleSystem) {
            game.particleSystem.addFloatingText(this.x + this.width/2, this.y - 15, "MEGA BOMBA!", "#ff5722", 13, true);
        }
    }

    placeBomb(map, bombsArray, game) {
        if (!this.isAlive) return;
        if (this.bombsActive >= this.bombCapacity) return;

        const gridPos = this.getGridPos();
        
        if (map.grid[gridPos.row][gridPos.col] === CONSTANTS.TILE_BOMB) return;
        for (let b of bombsArray) {
            if (b.col === gridPos.col && b.row === gridPos.row && !b.exploded && !b.toBeRemoved) {
                return;
            }
        }

        const isIce = this.hasIceBomb;
        const isSpike = this.hasSpikeBomb;
        this.hasIceBomb = false;
        this.hasSpikeBomb = false;

        const bomb = new Bomb(
            gridPos.col * CONSTANTS.TILE_SIZE,
            gridPos.row * CONSTANTS.TILE_SIZE,
            gridPos.col,
            gridPos.row,
            this.bombRadius,
            this,
            this.hasRemoteTrigger,
            isIce,
            isSpike
        );
        
        this.bombsActive++;
        bombsArray.push(bomb);
        map.grid[gridPos.row][gridPos.col] = CONSTANTS.TILE_BOMB;

        if (window.soundManager) {
            window.soundManager.playBombPlant();
        }
    }

    update(dt, map, bombsArray, game) {
        if (!this.isAlive) {
            this.deathTimer += dt;
            return;
        }

        if (this.curseTimer > 0) {
            this.curseTimer -= dt;
            if (this.curseTimer <= 0) {
                this.curseType = null;
            }
        }

        if (this.shieldTimer > 0) {
            this.shieldTimer -= dt;
            if (this.shieldTimer <= 0) this.hasShield = false;
        }
        if (this.spawnShieldTimer > 0) {
            this.spawnShieldTimer -= dt;
        }

        if (this.castTimer > 0) {
            this.castTimer -= dt;
        }

        if (this.portalCooldown > 0) {
            this.portalCooldown -= dt;
        }

        this.handleInput(map, bombsArray, game, dt);

        this.isMoving = (this.vx !== 0 || this.vy !== 0);

        if (this.isMoving) {
            this.animTimer += dt;
            if (this.animTimer > 110) {
                this.animFrame = (this.animFrame + 1) % 4;
                this.animTimer = 0;
            }
        } else {
            this.animFrame = 0;
        }

        // ========================================================
        // FÍSICA DE ARMADILHAS DE CENÁRIO: ESTEIRAS, GELO E PORTAIS
        // ========================================================
        const centerCol = Math.floor((this.x + this.width / 2) / CONSTANTS.TILE_SIZE);
        const centerRow = Math.floor((this.y + this.height / 2) / CONSTANTS.TILE_SIZE);

        // 1. Esteiras Rolantes (Conveyors)
        if (map && map.getConveyorVelocity) {
            const conv = map.getConveyorVelocity(centerCol, centerRow);
            if (conv) {
                const timeScale = Math.min(dt, 50) / 16.6667;
                const tryX = this.x + conv.vx * timeScale;
                const tryY = this.y + conv.vy * timeScale;
                if (!this.checkMapCollision(tryX, this.y, map) && !this.checkBombCollision(tryX, this.y, bombsArray, map, game)) {
                    this.x = tryX;
                }
                if (!this.checkMapCollision(this.x, tryY, map) && !this.checkBombCollision(this.x, tryY, bombsArray, map, game)) {
                    this.y = tryY;
                }
            }
        }

        // 2. Portais Dimensionais (Portals)
        if (this.portalCooldown <= 0 && map && map.getPortalTeleport) {
            const dest = map.getPortalTeleport(centerCol, centerRow);
            if (dest) {
                this.portalCooldown = 1100;
                this.x = dest.col * CONSTANTS.TILE_SIZE + (CONSTANTS.TILE_SIZE - this.width) / 2;
                this.y = dest.row * CONSTANTS.TILE_SIZE + (CONSTANTS.TILE_SIZE - this.height) / 2;
                if (window.soundManager) window.soundManager.playPortalWarp();
                if (game?.particleSystem) {
                    game.particleSystem.createShockwave(this.x + this.width / 2, this.y + this.height / 2, 48, '#00e5ff');
                    game.particleSystem.addFloatingText(this.x + this.width / 2, this.y - 12, "WARP!", "#00e5ff", 12, true);
                }
            }
        }

        // 3. Piso de Gelo (Ice Slide)
        const onIce = map && map.isIce && map.isIce(centerCol, centerRow);
        if (onIce) {
            if (this.vx !== 0 || this.vy !== 0) {
                this.iceSlideVx = this.vx * 0.94;
                this.iceSlideVy = this.vy * 0.94;
            } else if (Math.abs(this.iceSlideVx) > 0.15 || Math.abs(this.iceSlideVy) > 0.15) {
                this.iceSlideVx *= 0.93;
                this.iceSlideVy *= 0.93;
                const nextX = this.x + this.iceSlideVx;
                const nextY = this.y + this.iceSlideVy;
                if (!this.checkMapCollision(nextX, this.y, map) && !this.checkBombCollision(nextX, this.y, bombsArray, map, game)) {
                    this.x = nextX;
                }
                if (!this.checkMapCollision(this.x, nextY, map) && !this.checkBombCollision(this.x, nextY, bombsArray, map, game)) {
                    this.y = nextY;
                }
            }
        } else {
            this.iceSlideVx = 0;
            this.iceSlideVy = 0;
        }

        // ========================================================
        // MOVIMENTO E DESLIZAMENTO DE CANTOS SUAVE (CORNER SLIDE)
        // ========================================================
        if (this.vx !== 0) {
            const nextX = this.x + this.vx;
            if (!this.checkMapCollision(nextX, this.y, map) && !this.checkBombCollision(nextX, this.y, bombsArray, map, game)) {
                this.x = nextX;
            } else {
                // Alinhamento vertical automático ao tentar entrar em corredores
                const centerY = this.y + this.height / 2;
                const targetRow = Math.floor(centerY / CONSTANTS.TILE_SIZE);
                const idealY = targetRow * CONSTANTS.TILE_SIZE + (CONSTANTS.TILE_SIZE - this.height) / 2;
                const diffY = idealY - this.y;

                if (Math.abs(diffY) <= 16 && Math.abs(diffY) > 0.5) {
                    const slideSpeed = Math.min(Math.abs(diffY), this.speed * 0.85);
                    const tryY = this.y + Math.sign(diffY) * slideSpeed;
                    if (!this.checkMapCollision(this.x, tryY, map) && !this.checkBombCollision(this.x, tryY, bombsArray, map, game)) {
                        this.y = tryY;
                    }
                }
            }
        }

        if (this.vy !== 0) {
            const nextY = this.y + this.vy;
            if (!this.checkMapCollision(this.x, nextY, map) && !this.checkBombCollision(this.x, nextY, bombsArray, map, game)) {
                this.y = nextY;
            } else {
                // Alinhamento horizontal automático ao tentar entrar em corredores
                const centerX = this.x + this.width / 2;
                const targetCol = Math.floor(centerX / CONSTANTS.TILE_SIZE);
                const idealX = targetCol * CONSTANTS.TILE_SIZE + (CONSTANTS.TILE_SIZE - this.width) / 2;
                const diffX = idealX - this.x;

                if (Math.abs(diffX) <= 16 && Math.abs(diffX) > 0.5) {
                    const slideSpeed = Math.min(Math.abs(diffX), this.speed * 0.85);
                    const tryX = this.x + Math.sign(diffX) * slideSpeed;
                    if (!this.checkMapCollision(tryX, this.y, map) && !this.checkBombCollision(tryX, this.y, bombsArray, map, game)) {
                        this.x = tryX;
                    }
                }
            }
        }
    }

    checkBombCollision(x, y, bombsArray, map, game) {
        if (!bombsArray) return false;
        
        const myHitbox = { x, y, width: this.width, height: this.height };

        for (let bomb of bombsArray) {
            if (bomb.exploded || bomb.toBeRemoved) continue;

            const bombHitbox = {
                x: bomb.x + 4,
                y: bomb.y + 4,
                width: CONSTANTS.TILE_SIZE - 8,
                height: CONSTANTS.TILE_SIZE - 8
            };

            const isColliding = !(
                myHitbox.x + myHitbox.width <= bombHitbox.x ||
                myHitbox.x >= bombHitbox.x + bombHitbox.width ||
                myHitbox.y + myHitbox.height <= bombHitbox.y ||
                myHitbox.y >= bombHitbox.y + bombHitbox.height
            );

            if (isColliding) {
                if (bomb.overlappingEntities.has(this)) {
                    continue;
                }

                if (!bomb.isSliding) {
                    let kickDir = null;
                    if (this.direction === 'left' && this.x > bomb.x) kickDir = 'left';
                    else if (this.direction === 'right' && this.x < bomb.x) kickDir = 'right';
                    else if (this.direction === 'up' && this.y > bomb.y) kickDir = 'up';
                    else if (this.direction === 'down' && this.y < bomb.y) kickDir = 'down';

                    if (kickDir) {
                        bomb.kick(kickDir, map, bombsArray, game?.enemies, game?.boss, game?.particleSystem);
                    }
                }

                return true;
            } else {
                if (bomb.overlappingEntities.has(this)) {
                    bomb.overlappingEntities.delete(this);
                }
            }
        }
        return false;
    }

    checkMapCollision(x, y, map) {
        const leftCol = Math.floor(x / CONSTANTS.TILE_SIZE);
        const rightCol = Math.floor((x + this.width) / CONSTANTS.TILE_SIZE);
        const topRow = Math.floor(y / CONSTANTS.TILE_SIZE);
        const bottomRow = Math.floor((y + this.height) / CONSTANTS.TILE_SIZE);

        for (let row = topRow; row <= bottomRow; row++) {
            for (let col = leftCol; col <= rightCol; col++) {
                if (row < 0 || row >= CONSTANTS.GRID_HEIGHT || col < 0 || col >= CONSTANTS.GRID_WIDTH) {
                    return true;
                }
                const tile = map.grid[row][col];
                if (tile === CONSTANTS.TILE_SOLID || tile === CONSTANTS.TILE_SOFT) {
                    return true;
                }
            }
        }
        return false;
    }

    draw(ctx, spriteLoader) {
        const heroSprite = spriteLoader ? spriteLoader.get(this.character) : null;
        const doorAndKeySprite = spriteLoader ? spriteLoader.get('door_and_key') : null;

        const drawX = Math.round(this.x - (CONSTANTS.TILE_SIZE - this.width) / 2);
        const drawY = Math.round(this.y - (CONSTANTS.TILE_SIZE - this.height) / 2);

        if (this.spawnShieldTimer > 0) {
            ctx.globalAlpha = (Math.floor(Date.now() / 80) % 2 === 0) ? 0.35 : 1.0;
        }

        if (heroSprite) {
            let row = 0;
            let cols = 4;
            let rows = 4;
            let animFrames = 4;
            let flip = false;

            if (this.character === 'hero_warrior') {
                cols = 8;
                rows = 8;
                animFrames = 8;
                if (this.direction === 'down') row = 4;
                else if (this.direction === 'up') row = 5;
                else if (this.direction === 'right') row = 6;
                else if (this.direction === 'left') {
                    row = 6;
                    flip = true;
                }
            } else {
                if (this.direction === 'down') row = 0;
                else if (this.direction === 'right') row = 1;
                else if (this.direction === 'up') row = 2;
                else if (this.direction === 'left') row = 3;
            }

            const frameWidth = heroSprite.width / cols;
            const frameHeight = heroSprite.height / rows;
            const currentFrame = this.animFrame % animFrames;

            ctx.save();
            let finalDrawX = drawX;
            let finalDrawY = drawY;
            if (flip) {
                ctx.translate(drawX + CONSTANTS.TILE_SIZE / 2, drawY + CONSTANTS.TILE_SIZE / 2);
                ctx.scale(-1, 1);
                finalDrawX = -CONSTANTS.TILE_SIZE / 2;
                finalDrawY = -CONSTANTS.TILE_SIZE / 2;
            }

            ctx.drawImage(
                heroSprite,
                currentFrame * frameWidth, row * frameHeight, frameWidth, frameHeight,
                finalDrawX, finalDrawY,
                CONSTANTS.TILE_SIZE, CONSTANTS.TILE_SIZE
            );
            ctx.restore();
        } else if (this.character === 'hero_sasuke') {
            this.drawProceduralSasuke(ctx);
        } else {
            if (this.isAlive) {
                ctx.fillStyle = this.color;
                ctx.fillRect(this.x, this.y, this.width, this.height);
            }
        }

        // Desenha Escudo Ativo
        if (this.isAlive && this.hasShield) {
            ctx.save();
            const centerX = this.x + this.width / 2;
            const centerY = this.y + this.height / 2;
            
            if (doorAndKeySprite) {
                const kw = doorAndKeySprite.width / 2;
                const kh = doorAndKeySprite.height / 2;
                const shieldPulse = 1 + Math.sin(Date.now() / 150) * 0.08;
                const sSize = CONSTANTS.TILE_SIZE * 1.1 * shieldPulse;
                
                ctx.globalAlpha = 0.8;
                ctx.drawImage(doorAndKeySprite, 1 * kw, 1 * kh, kw, kh, centerX - sSize / 2, centerY - sSize / 2, sSize, sSize);
            } else {
                ctx.strokeStyle = '#29b6f6';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(centerX, centerY, this.width * 0.8, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.restore();
        }

        // Efeito de Maldição da Caveira (Ícone flutuante)
        if (this.isAlive && this.curseTimer > 0) {
            ctx.save();
            const floatY = Math.sin(Date.now() / 120) * 3;
            ctx.font = '16px sans-serif';
            ctx.textAlign = 'center';
            ctx.shadowColor = '#ab47bc';
            ctx.shadowBlur = 12;
            ctx.fillText('💀', this.x + this.width / 2, this.y - 12 + floatY);
            ctx.restore();
        }

        // Indicador P1 / P2
        if (this.isAlive) {
            ctx.save();
            ctx.font = 'bold 9px "Outfit", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = (this.playerIndex === 1) ? '#ff5722' : '#00e5ff';
            ctx.shadowColor = '#000000';
            ctx.shadowBlur = 4;
            ctx.fillText(`P${this.playerIndex}`, this.x + this.width / 2, this.y - 2);
            ctx.restore();
        }

        ctx.globalAlpha = 1.0;
    }

    drawProceduralSasuke(ctx) {
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;
        const walkOffset = this.isMoving ? Math.sin(this.animTimer / 25) * 2.5 : 0;

        ctx.save();
        ctx.translate(cx, cy);
        if (this.direction === 'left') ctx.scale(-1, 1);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.beginPath();
        ctx.ellipse(0, this.height * 0.45, this.width * 0.4, this.height * 0.15, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#1e1e24';
        ctx.fillRect(-this.width * 0.28, this.height * 0.15 + walkOffset, this.width * 0.22, this.height * 0.3);
        ctx.fillRect(this.width * 0.06, this.height * 0.15 - walkOffset, this.width * 0.22, this.height * 0.3);

        ctx.fillStyle = '#1a237e';
        ctx.beginPath();
        ctx.roundRect(-this.width * 0.38, -this.height * 0.15, this.width * 0.76, this.height * 0.4, 4);
        ctx.fill();

        ctx.fillStyle = '#283593';
        ctx.fillRect(-this.width * 0.25, -this.height * 0.28, this.width * 0.5, this.height * 0.16);

        ctx.fillStyle = '#ffe0bd';
        ctx.beginPath();
        ctx.arc(0, -this.height * 0.22, this.width * 0.28, 0, Math.PI * 2);
        ctx.fill();

        if (this.castTimer > 0) {
            ctx.fillStyle = '#ff1744';
            ctx.shadowColor = '#ff1744';
            ctx.shadowBlur = 6;
        } else {
            ctx.fillStyle = '#111111';
            ctx.shadowBlur = 0;
        }

        if (this.direction !== 'up') {
            ctx.fillRect(-this.width * 0.16, -this.height * 0.26, 3, 4);
            ctx.fillRect(this.width * 0.08, -this.height * 0.26, 3, 4);
        }

        ctx.fillStyle = '#0d47a1';
        ctx.fillRect(-this.width * 0.3, -this.height * 0.42, this.width * 0.6, 6);
        ctx.fillStyle = '#e0e0e0';
        ctx.fillRect(-this.width * 0.14, -this.height * 0.42, this.width * 0.28, 5);

        ctx.fillStyle = '#111318';
        ctx.beginPath();
        ctx.moveTo(-this.width * 0.35, -this.height * 0.35);
        ctx.lineTo(-this.width * 0.48, -this.height * 0.55);
        ctx.lineTo(-this.width * 0.25, -this.height * 0.52);
        ctx.lineTo(0, -this.height * 0.62);
        ctx.lineTo(this.width * 0.25, -this.height * 0.52);
        ctx.lineTo(this.width * 0.48, -this.height * 0.55);
        ctx.lineTo(this.width * 0.35, -this.height * 0.35);
        ctx.fill();

        ctx.restore();
    }
}
