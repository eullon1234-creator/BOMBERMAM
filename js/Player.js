class Player extends Entity {
    constructor(x, y, character = 'hero') {
        // Hitbox ajustada para movimentação fluida nos corredores de 48px
        const boxSize = CONSTANTS.TILE_SIZE * 0.62;
        super(x, y, boxSize, boxSize);
        
        this.character = character; // 'hero' ou 'hero_naruto'
        this.color = character === 'hero_naruto' ? '#ff9800' : CONSTANTS.COLORS.PLAYER;
        
        // Atributos base do personagem escolhido
        if (this.character === 'hero_naruto') {
            this.speed = 3.5; // Ninja mais ágil
            this.bombCapacity = 1;
            this.bombRadius = 2;
        } else {
            this.speed = 3.2; // Clássico equilibrado
            this.bombCapacity = 1;
            this.bombRadius = 2;
        }
        
        this.bombsActive = 0;
        
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

        // Estado de Itens e Poderes
        this.hasKey = false;
        this.hasShield = false;
        this.shieldTimer = 0;
        this.spawnShieldTimer = 1500; // 1.5s de imunidade inicial ao nascer
    }

    handleInput(map, bombsArray) {
        this.vx = 0;
        this.vy = 0;

        let inputX = 0;
        let inputY = 0;

        if (this.keys.left) inputX -= 1;
        if (this.keys.right) inputX += 1;
        if (this.keys.up) inputY -= 1;
        if (this.keys.down) inputY += 1;

        if (inputX !== 0 && inputY !== 0) {
            // Movimento diagonal: prioriza a última direção ou a mais recente
            this.vx = inputX * this.speed * 0.75;
            this.vy = inputY * this.speed * 0.75;
        } else if (inputX !== 0) {
            this.vx = inputX * this.speed;
            this.direction = inputX > 0 ? 'right' : 'left';
        } else if (inputY !== 0) {
            this.vy = inputY * this.speed;
            this.direction = inputY > 0 ? 'down' : 'up';
        }

        if (inputX !== 0 && inputY === 0) {
            this.direction = inputX > 0 ? 'right' : 'left';
        } else if (inputY !== 0 && inputX === 0) {
            this.direction = inputY > 0 ? 'down' : 'up';
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

        if (window.soundManager) {
            window.soundManager.playBombDrop();
        }
    }

    update(dt, map, bombsArray) {
        if (!this.isAlive) {
            this.deathTimer += dt;
            return;
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

        this.handleInput(map, bombsArray);

        // Atualiza animação de passos
        if (this.isMoving) {
            this.animTimer += dt;
            if (this.animTimer > 100) {
                this.animFrame = (this.animFrame + 1) % 4;
                this.animTimer = 0;
            }
        } else {
            this.animFrame = 0;
        }

        // Executa movimento fluido com assistência de quinas (Corner Alignment)
        this.moveSmoothly(map, bombsArray);
    }

    moveSmoothly(map, bombsArray) {
        // Movimento independente no eixo X
        if (this.vx !== 0) {
            this.x += this.vx;
            if (this.checkCollisions(map, bombsArray)) {
                this.x -= this.vx;
                // Ao bater em uma quina no eixo X, alinha suavemente no eixo Y
                this.assistCornerY(map, bombsArray);
            }
        }

        // Movimento independente no eixo Y
        if (this.vy !== 0) {
            this.y += this.vy;
            if (this.checkCollisions(map, bombsArray)) {
                this.y -= this.vy;
                // Ao bater em uma quina no eixo Y, alinha suavemente no eixo X
                this.assistCornerX(map, bombsArray);
            }
        }
    }

    // Desliza o jogador automaticamente para dentro do corredor mais próximo
    assistCornerY(map, bombsArray) {
        const centerY = this.y + this.height / 2;
        const tileRow = Math.floor(centerY / CONSTANTS.TILE_SIZE);
        const tileCenterY = (tileRow + 0.5) * CONSTANTS.TILE_SIZE;
        const diff = tileCenterY - centerY;

        // Se estiver a até 18px do centro do corredor, desliza suavemente
        if (Math.abs(diff) < 18) {
            const slideStep = Math.sign(diff) * Math.min(Math.abs(diff), this.speed * 0.85);
            this.y += slideStep;
            if (this.checkCollisions(map, bombsArray)) {
                this.y -= slideStep;
            }
        }
    }

    assistCornerX(map, bombsArray) {
        const centerX = this.x + this.width / 2;
        const tileCol = Math.floor(centerX / CONSTANTS.TILE_SIZE);
        const tileCenterX = (tileCol + 0.5) * CONSTANTS.TILE_SIZE;
        const diff = tileCenterX - centerX;

        if (Math.abs(diff) < 18) {
            const slideStep = Math.sign(diff) * Math.min(Math.abs(diff), this.speed * 0.85);
            this.x += slideStep;
            if (this.checkCollisions(map, bombsArray)) {
                this.x -= slideStep;
            }
        }
    }

    checkCollisions(map, bombsArray) {
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

        // Colisão com Bombas (ignora se ainda estiver saindo de cima da bomba que acabou de plantar)
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
        const spriteName = this.character || 'hero';
        const sprite = spriteLoader ? spriteLoader.get(spriteName) : null;
        const doorAndKeySprite = spriteLoader ? spriteLoader.get('door_and_key') : null;
        
        // Efeito de piscar durante escudo de nascimento ou invulnerabilidade
        const isInvulnerable = (this.spawnShieldTimer > 0 || this.hasShield);
        if (isInvulnerable && Math.floor(Date.now() / 80) % 2 === 0) {
            ctx.globalAlpha = 0.6;
        }

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
                ctx.globalAlpha = 1.0;
                return;
            }

            if (this.direction === 'down') {
                row = 0;
                flipH = false;
            } else if (this.direction === 'up') {
                row = 1;
                flipH = false;
            } else if (this.direction === 'left') {
                row = 2;
                flipH = false;
            } else if (this.direction === 'right') {
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

        // Ícone flutuante da chave acima da cabeça quando o jogador a possui
        if (this.isAlive && this.hasKey && doorAndKeySprite) {
            const kw = doorAndKeySprite.width / 2;
            const kh = doorAndKeySprite.height / 2;
            const floatY = Math.sin(Date.now() / 200) * 3;
            ctx.drawImage(
                doorAndKeySprite,
                0 * kw, 1 * kh, kw, kh,
                this.x + this.width / 2 - 10, this.y - 24 + floatY,
                20, 20
            );
        }

        ctx.globalAlpha = 1.0;
    }
}
