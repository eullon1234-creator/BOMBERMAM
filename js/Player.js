class Player extends Entity {
    constructor(x, y, character = 'hero') {
        // Hitbox ajustada para movimentação fluida nos corredores de 48px
        const boxSize = CONSTANTS.TILE_SIZE * 0.62;
        super(x, y, boxSize, boxSize);
        
        this.character = character; // 'hero', 'hero_naruto', 'hero_sasuke' ou 'hero_warrior'
        
        if (this.character === 'hero_naruto') {
            this.color = '#ff9800';
            this.speed = 2.2; // Ninja ágil
            this.bombCapacity = 1;
            this.bombRadius = 2;
        } else if (this.character === 'hero_sasuke') {
            this.color = '#1a237e';
            this.speed = 2.3; // Shinobi veloz
            this.bombCapacity = 1;
            this.bombRadius = 2;
        } else if (this.character === 'hero_warrior') {
            this.color = '#c8860a';
            this.speed = 2.4; // Guerreiro veloz e resistente
            this.bombCapacity = 1;
            this.bombRadius = 3; // Raio de fogo maior desde o início!
        } else {
            this.color = CONSTANTS.COLORS.PLAYER;
            this.speed = 2.0; // Clássico equilibrado e preciso
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
            special: false // Tecla Z para Poder Especial (Rasengan / Chidori)
        };
        
        this.actionPressed = false;
        this.specialPressed = false;
        this.direction = 'down'; // 'down', 'up', 'left', 'right'
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
        this.rasenganAmmo = 0; // Chakra para golpe especial (Rasengan / Chidori)
    }

    handleInput(map, bombsArray, game, dt = 16.6667) {
        this.vx = 0;
        this.vy = 0;

        let inputX = 0;
        let inputY = 0;

        if (this.keys.left) inputX -= 1;
        if (this.keys.right) inputX += 1;
        if (this.keys.up) inputY -= 1;
        if (this.keys.down) inputY += 1;

        const timeScale = Math.min(dt, 50) / 16.6667;

        if (inputX !== 0 && inputY !== 0) {
            // Movimento diagonal normalizado
            this.vx = inputX * this.speed * 0.72 * timeScale;
            this.vy = inputY * this.speed * 0.72 * timeScale;
        } else if (inputX !== 0) {
            this.vx = inputX * this.speed * timeScale;
            this.direction = inputX > 0 ? 'right' : 'left';
        } else if (inputY !== 0) {
            this.vy = inputY * this.speed * timeScale;
            this.direction = inputY > 0 ? 'down' : 'up';
        }

        if (inputX !== 0 && inputY === 0) {
            this.direction = inputX > 0 ? 'right' : 'left';
        } else if (inputY !== 0 && inputX === 0) {
            this.direction = inputY > 0 ? 'down' : 'up';
        }

        this.isMoving = (this.vx !== 0 || this.vy !== 0);

        // Plantar Bomba (Barra de Espaço)
        if (this.keys.action && !this.actionPressed) {
            this.actionPressed = true;
            this.plantBomb(map, bombsArray);
        } else if (!this.keys.action) {
            this.actionPressed = false;
        }

        // Disparar Jutsu Especial (Tecla Z - Rasengan ou Chidori)
        if (this.keys.special && !this.specialPressed) {
            this.specialPressed = true;
            this.castSpecial(game);
        } else if (!this.keys.special) {
            this.specialPressed = false;
        }
    }

    castSpecial(game) {
        if (this.rasenganAmmo <= 0 || !game) return;
        this.rasenganAmmo--;
        if (game.playerStats) {
            game.playerStats.rasenganAmmo = this.rasenganAmmo;
        }
        this.castTimer = 280; // Duração do efeito visual de lançamento

        const pSize = CONSTANTS.TILE_SIZE * 0.85;
        const startX = this.x + (this.width - pSize) / 2;
        const startY = this.y + (this.height - pSize) / 2;

        if (this.character === 'hero_sasuke') {
            // Dispara Chidori elétrico do Sasuke
            const proj = new ChidoriProjectile(startX, startY, this.direction, this);
            if (!game.chidoris) game.chidoris = [];
            game.chidoris.push(proj);

            if (window.soundManager) {
                window.soundManager.playChidoriLaunch();
            }
        } else {
            // Dispara Rasengan do Naruto / Herói
            const proj = new RasenganProjectile(startX, startY, this.direction, this);
            if (!game.rasengans) game.rasengans = [];
            game.rasengans.push(proj);

            if (window.soundManager) {
                window.soundManager.playRasenganLaunch();
            }
        }

        game.updateUI();
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
            const frameDelay = (this.character === 'hero_warrior') ? 80 : 110;
            const maxFrames  = (this.character === 'hero_warrior') ? 8  : 4;
            if (this.animTimer > frameDelay) {
                this.animFrame = (this.animFrame + 1) % maxFrames;
                this.animTimer = 0;
            }
        } else {
            this.animFrame = 0;
        }

        // Executa movimento fluido com assistência de quinas (Corner Alignment)
        this.moveSmoothly(map, bombsArray, game, dt);
    }

    moveSmoothly(map, bombsArray, game, dt = 16.6667) {
        // Movimento independente no eixo X
        if (this.vx !== 0) {
            this.x += this.vx;
            if (this.checkCollisions(map, bombsArray, game)) {
                this.x -= this.vx;
                // Ao bater em uma quina no eixo X, alinha suavemente no eixo Y
                this.assistCornerY(map, bombsArray, game, dt);
            }
        }

        // Movimento independente no eixo Y
        if (this.vy !== 0) {
            this.y += this.vy;
            if (this.checkCollisions(map, bombsArray, game)) {
                this.y -= this.vy;
                // Ao bater em uma quina no eixo Y, alinha suavemente no eixo X
                this.assistCornerX(map, bombsArray, game, dt);
            }
        }
    }

    // Desliza o jogador automaticamente para dentro do corredor mais próximo
    assistCornerY(map, bombsArray, game, dt = 16.6667) {
        const centerY = this.y + this.height / 2;
        const tileRow = Math.floor(centerY / CONSTANTS.TILE_SIZE);
        const tileCenterY = (tileRow + 0.5) * CONSTANTS.TILE_SIZE;
        const diff = tileCenterY - centerY;
        const timeScale = Math.min(dt, 50) / 16.6667;

        // Se estiver a até 18px do centro do corredor, desliza suavemente
        if (Math.abs(diff) < 18) {
            const slideStep = Math.sign(diff) * Math.min(Math.abs(diff), this.speed * 0.75 * timeScale);
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

        if (Math.abs(diff) < 18) {
            const slideStep = Math.sign(diff) * Math.min(Math.abs(diff), this.speed * 0.75 * timeScale);
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
                            // Tenta chutar a bomba na direção do movimento atual
                            if (this.isMoving && !bomb.isSliding) {
                                bomb.kick(this.direction, map, bombsArray, game?.enemies, game?.boss);
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
        
        // Efeito de piscar durante escudo de nascimento ou invulnerabilidade
        const isInvulnerable = (this.spawnShieldTimer > 0 || this.hasShield);
        if (isInvulnerable && Math.floor(Date.now() / 80) % 2 === 0) {
            ctx.globalAlpha = 0.6;
        }

        if (sprite && this.character === 'hero_warrior') {
            // Sprite sheet do Guerreiro: 8 colunas × 8 linhas
            // Linha 0: caminhar para baixo (para frente)
            // Linha 1: caminhar para cima
            // Linha 2: caminhar para esquerda
            // Linha 3: caminhar para direita
            // Linha 4-5: idle / idle alternativo
            // Linha 7: morte
            const COLS = 8;
            const ROWS = 8;
            const frameW = sprite.width / COLS;
            const frameH = sprite.height / ROWS;
            let row = 0;
            let flipH = false;
            let colFrame = this.isMoving ? (this.animFrame % COLS) : 0;

            if (!this.isAlive) {
                // Animação de morte: linha 7, progride da esq para dir
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

            // Seleciona linha por direção
            if (this.direction === 'down')       { row = 0; flipH = false; }
            else if (this.direction === 'up')    { row = 1; flipH = false; }
            else if (this.direction === 'left')  { row = 2; flipH = false; }
            else if (this.direction === 'right') { row = 2; flipH = true;  }

            // Idle: usa linha de baixo, frame 0 estático
            if (!this.isMoving) {
                colFrame = 0;
                // Pequena respiração: alterna entre frame 0 e 1 lentamente
                const idlePulse = Math.floor(Date.now() / 500) % 2;
                colFrame = idlePulse;
            }

            const drawX = this.x - (CONSTANTS.TILE_SIZE - this.width) / 2;
            const drawY = this.y - (CONSTANTS.TILE_SIZE - this.height) / 2 - 8;

            ctx.save();

            // Aura dourada pulsante enquanto ativo (sempre no guerreiro!)
            const auraPulse = 0.85 + Math.sin(Date.now() / 300) * 0.15;
            ctx.shadowColor = 'rgba(255, 200, 50, 0.5)';
            ctx.shadowBlur = 8 * auraPulse;

            if (flipH) {
                ctx.translate(drawX + CONSTANTS.TILE_SIZE, drawY);
                ctx.scale(-1, 1);
                ctx.drawImage(
                    sprite,
                    colFrame * frameW, row * frameH, frameW, frameH,
                    0, 0,
                    CONSTANTS.TILE_SIZE, CONSTANTS.TILE_SIZE + 8
                );
            } else {
                ctx.drawImage(
                    sprite,
                    colFrame * frameW, row * frameH, frameW, frameH,
                    drawX, drawY,
                    CONSTANTS.TILE_SIZE, CONSTANTS.TILE_SIZE + 8
                );
            }
            ctx.restore();

        } else if (sprite) {
            // Sprites de 4 colunas × 4 linhas (hero, naruto, sasuke)
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

            if (this.direction === 'down') {
                row = 0;
                flipH = false;
            } else if (this.direction === 'up') {
                row = 1;
                flipH = false;
            } else if (this.direction === 'right') {
                row = 2;
                flipH = false;
            } else if (this.direction === 'left') {
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
        } else if (this.character === 'hero_sasuke') {
            // Renderização Procedural Rica do Sasuke Uchiha
            this.drawProceduralSasuke(ctx);
        } else {
            // Fallback genérico
            if (this.isAlive) {
                ctx.fillStyle = this.color;
                ctx.fillRect(this.x, this.y, this.width, this.height);
            }
        }

        // Desenha Escudo Ativo ao redor do jogador
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
                ctx.drawImage(
                    doorAndKeySprite,
                    1 * kw, 1 * kh, kw, kh,
                    centerX - sSize / 2, centerY - sSize / 2,
                    sSize, sSize
                );
            } else {
                ctx.strokeStyle = '#29b6f6';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(centerX, centerY, this.width * 0.8, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.restore();
        }

        // Efeito de aura de Chakra durante o disparo de Rasengan / Chidori
        if (this.isAlive && this.castTimer > 0) {
            ctx.save();
            const cx = this.x + this.width / 2;
            const cy = this.y + this.height / 2;
            
            if (this.character === 'hero_sasuke') {
                // Descarga elétrica e faíscas azuis do Chidori
                ctx.shadowColor = '#00f0ff';
                ctx.shadowBlur = 24;
                ctx.strokeStyle = 'rgba(0, 240, 255, 0.95)';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(cx, cy, this.width * (0.8 + Math.random() * 0.35), 0, Math.PI * 2);
                ctx.stroke();

                // Fagulhas elétricas
                ctx.fillStyle = '#ffffff';
                for (let i = 0; i < 4; i++) {
                    const ang = Math.random() * Math.PI * 2;
                    const r = this.width * (0.6 + Math.random() * 0.4);
                    ctx.fillRect(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, 3, 3);
                }
            } else if (this.character === 'hero_warrior') {
                // Explosão de energia dourada do Guerreiro
                ctx.shadowColor = '#ffd700';
                ctx.shadowBlur = 30;
                ctx.strokeStyle = 'rgba(255, 200, 20, 0.95)';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(cx, cy, this.width * (0.9 + Math.random() * 0.4), 0, Math.PI * 2);
                ctx.stroke();

                // Faíscas douradas radiando para fora
                for (let i = 0; i < 6; i++) {
                    const ang = (i / 6) * Math.PI * 2 + Date.now() * 0.01;
                    const r1 = this.width * 0.9;
                    const r2 = this.width * (1.2 + Math.random() * 0.5);
                    ctx.strokeStyle = `rgba(255, ${180 + Math.random() * 70 | 0}, 0, 0.8)`;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1);
                    ctx.lineTo(cx + Math.cos(ang) * r2, cy + Math.sin(ang) * r2);
                    ctx.stroke();
                }
            } else {
                // Vórtice espiral do Rasengan
                ctx.shadowColor = '#00e5ff';
                ctx.shadowBlur = 22;
                ctx.strokeStyle = 'rgba(0, 229, 255, 0.85)';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(cx, cy, this.width * (0.75 + Math.random() * 0.3), 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.restore();
        }

        ctx.globalAlpha = 1.0;
    }

    // Desenho vetorial estilizado em Pixel-Art / Chibi do Sasuke Uchiha
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

        if (this.direction === 'left') {
            ctx.scale(-1, 1);
        }

        // Sombra nos pés
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.beginPath();
        ctx.ellipse(0, this.height * 0.45, this.width * 0.4, this.height * 0.15, 0, 0, Math.PI * 2);
        ctx.fill();

        // Pernas / Calças escuras
        ctx.fillStyle = '#1e1e24';
        ctx.fillRect(-this.width * 0.28, this.height * 0.15 + walkOffset, this.width * 0.22, this.height * 0.3);
        ctx.fillRect(this.width * 0.06, this.height * 0.15 - walkOffset, this.width * 0.22, this.height * 0.3);

        // Faixas brancas nas pernas
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-this.width * 0.28, this.height * 0.32 + walkOffset, this.width * 0.22, 2.5);
        ctx.fillRect(this.width * 0.06, this.height * 0.32 - walkOffset, this.width * 0.22, 2.5);

        // Túnica Azul Escura (Roupa Clássica do Sasuke)
        ctx.fillStyle = '#1a237e';
        ctx.beginPath();
        ctx.roundRect(-this.width * 0.38, -this.height * 0.15, this.width * 0.76, this.height * 0.4, 4);
        ctx.fill();

        // Gola Alta Branca/Azul
        ctx.fillStyle = '#283593';
        ctx.fillRect(-this.width * 0.25, -this.height * 0.28, this.width * 0.5, this.height * 0.16);

        // Cabeça (Pele)
        ctx.fillStyle = '#ffe0bd';
        ctx.beginPath();
        ctx.arc(0, -this.height * 0.22, this.width * 0.28, 0, Math.PI * 2);
        ctx.fill();

        // Olhos do Sasuke (Preto ou Sharingan Vermelho durante o Chidori!)
        if (this.castTimer > 0) {
            ctx.fillStyle = '#ff1744'; // Sharingan
            ctx.shadowColor = '#ff1744';
            ctx.shadowBlur = 6;
        } else {
            ctx.fillStyle = '#111111';
            ctx.shadowBlur = 0;
        }

        if (this.direction !== 'up') {
            ctx.fillRect(-this.width * 0.16, -this.height * 0.26, 3, 4);
            ctx.fillRect(this.width * 0.08, -this.height * 0.26, 3, 4);
            ctx.shadowBlur = 0;
        }

        // Protetor de Testa / Bandana Ninja
        ctx.fillStyle = '#0d47a1';
        ctx.fillRect(-this.width * 0.3, -this.height * 0.42, this.width * 0.6, 6);
        ctx.fillStyle = '#e0e0e0';
        ctx.fillRect(-this.width * 0.14, -this.height * 0.42, this.width * 0.28, 5);

        // Cabelo Espetado Preto do Sasuke com Franjas laterais
        ctx.fillStyle = '#111318';
        ctx.beginPath();
        // Topo e Espetos Traseiros
        ctx.moveTo(-this.width * 0.35, -this.height * 0.35);
        ctx.lineTo(-this.width * 0.48, -this.height * 0.55);
        ctx.lineTo(-this.width * 0.25, -this.height * 0.52);
        ctx.lineTo(0, -this.height * 0.62);
        ctx.lineTo(this.width * 0.25, -this.height * 0.52);
        ctx.lineTo(this.width * 0.48, -this.height * 0.55);
        ctx.lineTo(this.width * 0.35, -this.height * 0.35);
        ctx.fill();

        // Franjas laterais longas
        ctx.beginPath();
        ctx.moveTo(-this.width * 0.28, -this.height * 0.35);
        ctx.lineTo(-this.width * 0.32, -this.height * 0.1);
        ctx.lineTo(-this.width * 0.2, -this.height * 0.25);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(this.width * 0.28, -this.height * 0.35);
        ctx.lineTo(this.width * 0.32, -this.height * 0.1);
        ctx.lineTo(this.width * 0.2, -this.height * 0.25);
        ctx.fill();

        ctx.restore();
    }
}
