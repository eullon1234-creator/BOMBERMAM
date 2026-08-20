class Player extends Entity {
    constructor(x, y, character = 'hero', playerIndex = 1) {
        const boxSize = CONSTANTS.TILE_SIZE * 0.62;
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
        this.spawnShieldTimer = 1500; // 1.5s de imunidade inicial ao nascer
        this.rasenganAmmo = 0;
        this.hasRemoteTrigger = false;
        this.hasIceBomb = false;

        // Sistema de Maldição da Caveira (Skull Curse)
        this.curseType = null;
        this.curseTimer = 0;
        this.diarrheaTimer = 0;

        // Score e Vitórias (especialmente para modo PvP)
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

        // Efeito de maldição de controles invertidos
        const isInverted = (this.curseType === CONSTANTS.CURSE_TYPES.INVERTED && this.curseTimer > 0);

        if (this.keys.left) inputX += isInverted ? 1 : -1;
        if (this.keys.right) inputX += isInverted ? -1 : 1;
        if (this.keys.up) inputY += isInverted ? 1 : -1;
        if (this.keys.down) inputY += isInverted ? -1 : 1;

        // Modificador de velocidade da maldição
        let effectiveSpeed = this.speed;
        if (this.curseTimer > 0) {
            if (this.curseType === CONSTANTS.CURSE_TYPES.SLOW) {
                effectiveSpeed = Math.max(1.0, this.speed * 0.5);
            } else if (this.curseType === CONSTANTS.CURSE_TYPES.FAST) {
                effectiveSpeed = this.speed * 1.6;
            }
        }

        const timeScale = Math.min(dt, 50) / 16.6667;

        if (inputX !== 0 && inputY !== 0) {
            this.vx = inputX * effectiveSpeed * 0.72 * timeScale;
            this.vy = inputY * effectiveSpeed * 0.72 * timeScale;
        } else if (inputX !== 0) {
            this.vx = inputX * effectiveSpeed * timeScale;
            this.direction = inputX > 0 ? 'right' : 'left';
        } else if (inputY !== 0) {
            this.vy = inputY * effectiveSpeed * timeScale;
            this.direction = inputY > 0 ? 'down' : 'up';
        }

        if (inputX !== 0 && inputY === 0) {
            this.direction = inputX > 0 ? 'right' : 'left';
        } else if (inputY !== 0 && inputX === 0) {
            this.direction = inputY > 0 ? 'down' : 'up';
        }

        this.isMoving = (this.vx !== 0 || this.vy !== 0);

        // Plantar Bomba Manualmente
        if (this.keys.action && !this.actionPressed) {
            this.actionPressed = true;
            this.plantBomb(map, bombsArray);
        } else if (!this.keys.action) {
            this.actionPressed = false;
        }

        // Maldição de Diarreia de Bombas (Planta bombas automaticamente)
        if (this.curseType === CONSTANTS.CURSE_TYPES.DIARRHEA && this.curseTimer > 0) {
            this.diarrheaTimer += dt;
            if (this.diarrheaTimer > 380) {
                this.plantBomb(map, bombsArray);
                this.diarrheaTimer = 0;
            }
        }

        // Disparar Golpe Especial (Tecla Z / L)
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
            // Chidori Elétrico
            const proj = new ChidoriProjectile(startX, startY, this.direction, this);
            if (!game.chidoris) game.chidoris = [];
            game.chidoris.push(proj);
            if (window.soundManager) window.soundManager.playChidoriLaunch();
            if (game.particleSystem) game.particleSystem.addScreenShake(8, 200);

        } else if (this.character === 'hero_warrior') {
            // Ciclone Flamejante 360° do Guerreiro
            this.castWarriorFlameCyclone(game);

        } else if (this.character === 'hero') {
            // Bomberman Clássico: Mega Bomba Instantânea com Raio Triplo
            this.castMegaBomb(game);

        } else {
            // Rasengan do Naruto
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
        // Atinge área 3x3 ao redor do Guerreiro
        for (let r = myGrid.row - 1; r <= myGrid.row + 1; r++) {
            for (let c = myGrid.col - 1; c <= myGrid.col + 1; c++) {
                if (r < 0 || r >= CONSTANTS.GRID_HEIGHT || c < 0 || c >= CONSTANTS.GRID_WIDTH) continue;
                
                // Quebra blocos de tijolo
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

                // Causa dano massivo a inimigos na área
                const hitBox = { x: c * CONSTANTS.TILE_SIZE, y: r * CONSTANTS.TILE_SIZE, width: CONSTANTS.TILE_SIZE, height: CONSTANTS.TILE_SIZE };
                if (game.enemies) {
                    for (let enemy of game.enemies) {
                        if (enemy.isAlive && enemy.checkCollision(hitBox)) {
                            const isDead = enemy.takeDamage(3, game.map);
                            if (isDead) {
                                game.score += enemy.scoreValue || 200;
                            }
                        }
                    }
                }
                if (game.boss && game.boss.isAlive && game.boss.checkCollision(hitBox)) {
                    game.boss.takeDamage(3);
                }
            }
        }
    }

    castMegaBomb(game) {
        const gridPos = this.getGridPos();
        const megaRadius = this.bombRadius + 3;
        const b = new Bomb(gridPos.col * CONSTANTS.TILE_SIZE, gridPos.row * CONSTANTS.TILE_SIZE, gridPos.col, gridPos.row, megaRadius, this, false, false);
        game.bombs.push(b);
        game.map.grid[gridPos.row][gridPos.col] = CONSTANTS.TILE_BOMB;
        this.bombsActive++;

        if (window.soundManager) window.soundManager.playBombDrop();
        if (game.particleSystem) {
            game.particleSystem.addFloatingText(this.x + 24, this.y - 12, "MEGA BOMB!", "#00e5ff", 13, true);
        }
    }

    plantBomb(map, bombsArray) {
        if (this.bombsActive >= this.bombCapacity) return;

        const gridPos = this.getGridPos();
        for (let b of bombsArray) {
            if (b.col === gridPos.col && b.row === gridPos.row && !b.toBeRemoved) {
                return;
            }
        }

        const bombX = gridPos.col * CONSTANTS.TILE_SIZE;
        const bombY = gridPos.row * CONSTANTS.TILE_SIZE;

        const newBomb = new Bomb(bombX, bombY, gridPos.col, gridPos.row, this.bombRadius, this, this.hasRemoteTrigger, this.hasIceBomb);
        bombsArray.push(newBomb);
        map.grid[gridPos.row][gridPos.col] = CONSTANTS.TILE_BOMB;
        this.bombsActive++;

        if (window.soundManager) {
            window.soundManager.playBombDrop();
        }
    }

    update(dt, map, bombsArray, game) {
        if (!this.isAlive) {
            this.deathTimer += dt;
            return;
        }

        if (this.castTimer > 0) {
            this.castTimer -= dt;
        }

        // Atualiza maldição da caveira
        if (this.curseTimer > 0) {
            this.curseTimer -= dt;
            if (this.curseTimer <= 0) {
                this.curseType = null;
            }
        }

        // Atualiza temporizadores de escudo
        if (this.spawnShieldTimer > 0) {
            this.spawnShieldTimer -= dt;
        }
        if (this.shieldTimer > 0) {
            this.shieldTimer -= dt;
            this.hasShield = true;
        } else {
            this.hasShield = false;
        }

        this.handleInput(map, bombsArray, game, dt);

        // Atualiza animação de passos
        if (this.isMoving) {
            this.animTimer += dt;
            const frameDelay = (this.character === 'hero_warrior') ? 70 : 100;
            const maxFrames  = (this.character === 'hero_warrior') ? 8  : 4;
            if (this.animTimer > frameDelay) {
                this.animFrame = (this.animFrame + 1) % maxFrames;
                this.animTimer = 0;
            }
        } else {
            this.animFrame = 0;
        }

        this.moveSmoothly(map, bombsArray, game, dt);
    }

    moveSmoothly(map, bombsArray, game, dt = 16.6667) {
        if (this.vx !== 0) {
            this.x += this.vx;
            if (this.checkCollisions(map, bombsArray, game)) {
                this.x -= this.vx;
                this.assistCornerY(map, bombsArray, game, dt);
            }
        }

        if (this.vy !== 0) {
            this.y += this.vy;
            if (this.checkCollisions(map, bombsArray, game)) {
                this.y -= this.vy;
                this.assistCornerX(map, bombsArray, game, dt);
            }
        }
    }

    assistCornerY(map, bombsArray, game, dt = 16.6667) {
        const centerY = this.y + this.height / 2;
        const tileRow = Math.floor(centerY / CONSTANTS.TILE_SIZE);
        const tileCenterY = (tileRow + 0.5) * CONSTANTS.TILE_SIZE;
        const diff = tileCenterY - centerY;
        const timeScale = Math.min(dt, 50) / 16.6667;

        if (Math.abs(diff) < 20) {
            const slideStep = Math.sign(diff) * Math.min(Math.abs(diff), this.speed * 0.85 * timeScale);
            this.y += slideStep;
            if (this.checkCollisions(map, bombsArray, game)) {
                this.y -= slideStep;
            }
        }
    }

    assistCornerX(map, bombsArray, game, dt = 16.6667) {
        const centerX = this.x + this.width / 2;
        const tileCol = Math.floor(centerX / CONSTANTS.TILE_SIZE);
        const tileCenterX = (tileCol + 0.5) * CONSTANTS.TILE_SIZE;
        const diff = tileCenterX - centerX;
        const timeScale = Math.min(dt, 50) / 16.6667;

        if (Math.abs(diff) < 20) {
            const slideStep = Math.sign(diff) * Math.min(Math.abs(diff), this.speed * 0.85 * timeScale);
            this.x += slideStep;
            if (this.checkCollisions(map, bombsArray, game)) {
                this.x -= slideStep;
            }
        }
    }

    checkCollisions(map, bombsArray, game) {
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

        // Colisão com Bombas (Chute de Bombas integrado)
        if (bombsArray) {
            for (let bomb of bombsArray) {
                if (!bomb.exploded && !bomb.toBeRemoved) {
                    if (!bomb.overlappingEntities.has(this)) {
                        if (this.checkCollision(bomb)) {
                            if (this.isMoving && !bomb.isSliding) {
                                bomb.kick(this.direction, map, bombsArray, game?.enemies, game?.boss, game?.particleSystem);
                            }
                            return true;
                        }
                    }
                }
            }
        }

        return false;
    }

    draw(ctx, spriteLoader) {
        const spriteName = this.character || 'hero';
        const sprite = spriteLoader ? spriteLoader.get(spriteName) : null;
        const doorAndKeySprite = spriteLoader ? spriteLoader.get('door_and_key') : null;
        
        const isInvulnerable = (this.spawnShieldTimer > 0 || this.hasShield);
        if (isInvulnerable && Math.floor(Date.now() / 80) % 2 === 0) {
            ctx.globalAlpha = 0.6;
        }

        if (sprite && this.character === 'hero_warrior') {
            const COLS = 8;
            const ROWS = 8;
            const frameW = sprite.width / COLS;
            const frameH = sprite.height / ROWS;
            let row = 0;
            let flipH = false;
            let colFrame = this.isMoving ? (this.animFrame % COLS) : 0;

            if (!this.isAlive) {
                row = 7;
                colFrame = Math.min(COLS - 1, Math.floor(this.deathTimer / 100));
                ctx.save();
                ctx.globalAlpha = Math.max(0, 1 - this.deathTimer / 800);
                ctx.drawImage(
                    sprite,
                    colFrame * frameW, row * frameH, frameW, frameH,
                    this.x - (CONSTANTS.TILE_SIZE - this.width) / 2,
                    this.y - (CONSTANTS.TILE_SIZE - this.height) / 2 - 8,
                    CONSTANTS.TILE_SIZE, CONSTANTS.TILE_SIZE + 8
                );
                ctx.restore();
                ctx.globalAlpha = 1.0;
                return;
            }

            if (this.direction === 'down')       { row = 0; flipH = false; }
            else if (this.direction === 'up')    { row = 1; flipH = false; }
            else if (this.direction === 'left')  { row = 2; flipH = false; }
            else if (this.direction === 'right') { row = 2; flipH = true;  }

            if (!this.isMoving) {
                const idlePulse = Math.floor(Date.now() / 500) % 2;
                colFrame = idlePulse;
            }

            const drawX = this.x - (CONSTANTS.TILE_SIZE - this.width) / 2;
            const drawY = this.y - (CONSTANTS.TILE_SIZE - this.height) / 2 - 8;

            ctx.save();
            const auraPulse = 0.85 + Math.sin(Date.now() / 300) * 0.15;
            ctx.shadowColor = 'rgba(255, 200, 50, 0.5)';
            ctx.shadowBlur = 8 * auraPulse;

            if (flipH) {
                ctx.translate(drawX + CONSTANTS.TILE_SIZE, drawY);
                ctx.scale(-1, 1);
                ctx.drawImage(sprite, colFrame * frameW, row * frameH, frameW, frameH, 0, 0, CONSTANTS.TILE_SIZE, CONSTANTS.TILE_SIZE + 8);
            } else {
                ctx.drawImage(sprite, colFrame * frameW, row * frameH, frameW, frameH, drawX, drawY, CONSTANTS.TILE_SIZE, CONSTANTS.TILE_SIZE + 8);
            }
            ctx.restore();

        } else if (sprite) {
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
                ctx.globalAlpha = 1.0;
                return;
            }

            if (this.direction === 'down') { row = 0; flipH = false; }
            else if (this.direction === 'up') { row = 1; flipH = false; }
            else if (this.direction === 'right') { row = 2; flipH = false; }
            else if (this.direction === 'left') { row = 2; flipH = true; }

            const drawX = this.x - (CONSTANTS.TILE_SIZE - this.width)/2;
            const drawY = this.y - (CONSTANTS.TILE_SIZE - this.height)/2 - 6;

            ctx.save();
            // Diferenciação visual para Player 2 (aura ciano neon)
            if (this.playerIndex === 2) {
                ctx.shadowColor = '#00e5ff';
                ctx.shadowBlur = 10;
            }

            if (flipH) {
                ctx.translate(drawX + CONSTANTS.TILE_SIZE, drawY);
                ctx.scale(-1, 1);
                ctx.drawImage(sprite, this.animFrame * frameW, row * frameH, frameW, frameH, 0, 0, CONSTANTS.TILE_SIZE, CONSTANTS.TILE_SIZE + 6);
            } else {
                ctx.drawImage(sprite, this.animFrame * frameW, row * frameH, frameW, frameH, drawX, drawY, CONSTANTS.TILE_SIZE, CONSTANTS.TILE_SIZE + 6);
            }
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

        // Efeito de Maldição da Caveira (Ícone flutuante roxo acima do herói)
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

        // Indicador de P1 ou P2 acima do personagem no modo versus
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
        if (!this.isAlive) {
            ctx.save();
            ctx.fillStyle = 'rgba(26, 35, 126, 0.4)';
            ctx.beginPath();
            ctx.arc(this.x + this.width/2, this.y + this.height/2, this.width/2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            return;
        }

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
