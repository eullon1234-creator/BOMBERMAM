class Enemy extends Entity {
    constructor(x, y, type = CONSTANTS.ENEMY_TYPES.BALLOM) {
        super(x, y, CONSTANTS.TILE_SIZE * 0.75, CONSTANTS.TILE_SIZE * 0.75);

        // Define o tipo e características
        this.type = type;
        this.setupTypeAttributes();

        this.x = x + (CONSTANTS.TILE_SIZE - this.width) / 2;
        this.y = y + (CONSTANTS.TILE_SIZE - this.height) / 2;

        this.direction = this.getRandomDirection();
        this.facing = 'down'; // 'down', 'up', 'left', 'right'

        // Timers e Estados
        this.animFrame = 0;
        this.animTimer = 0;
        this.deathTimer = 0;
        this.damageTimer = 0;
        this.decisionTimer = 0;
        this.chargeTimer = 0;
        this.isCharging = false;
        this.toBeRemoved = false;
        this.hasKey = false; // Se for o portador da chave

        // Suporte a compatibilidade de level antigo (para cálculo de score)
        this.level = this.type === CONSTANTS.ENEMY_TYPES.BALLOM ? 1 : 2;
    }

    setupTypeAttributes() {
        switch (this.type) {
            case CONSTANTS.ENEMY_TYPES.ONEAL: // Slime Azul: Rápido, BFS e esquiva
                this.spriteKey = 'enemy_blue';
                this.color = '#2196f3';
                this.baseSpeed = 1.0;
                this.speed = 1.0;
                this.hp = 1;
                this.maxHp = 1;
                this.scoreValue = 200;
                this.canPassSoftWalls = false;
                break;

            case CONSTANTS.ENEMY_TYPES.DAHL: // Golem Laranja: Tanque com 2 HP e investida
                this.spriteKey = 'enemy_orange';
                this.color = '#ff9800';
                this.baseSpeed = 0.75;
                this.speed = 0.75;
                this.hp = 2;
                this.maxHp = 2;
                this.scoreValue = 350;
                this.canPassSoftWalls = false;
                break;

            case CONSTANTS.ENEMY_TYPES.MINVO: // Morcego Roxo: Flutua através de tijolos
                this.spriteKey = 'enemy_purple';
                this.color = '#ab47bc';
                this.baseSpeed = 0.85;
                this.speed = 0.85;
                this.hp = 1;
                this.maxHp = 1;
                this.scoreValue = 300;
                this.canPassSoftWalls = true;
                break;

            case CONSTANTS.ENEMY_TYPES.BALLOM: // Balão Vermelho: Clássico, patrulha
            default:
                this.type = CONSTANTS.ENEMY_TYPES.BALLOM;
                this.spriteKey = 'enemy';
                this.color = '#ff3333';
                this.baseSpeed = 0.85;
                this.speed = 0.85;
                this.hp = 1;
                this.maxHp = 1;
                this.scoreValue = 100;
                this.canPassSoftWalls = false;
                break;
        }
    }

    getRandomDirection() {
        const dirs = [
            { vx: 1, vy: 0, name: 'right' },
            { vx: -1, vy: 0, name: 'left' },
            { vx: 0, vy: 1, name: 'down' },
            { vx: 0, vy: -1, name: 'up' }
        ];
        return dirs[Math.floor(Math.random() * dirs.length)];
    }

    takeDamage(amount = 1, map = null) {
        if (!this.isAlive || this.damageTimer > 0) return false;

        this.hp -= amount;
        this.damageTimer = 400; // Invulnerabilidade breve / piscar

        if (this.hp <= 0) {
            this.hp = 0;
            this.isAlive = false;
            this.deathTimer = 0;

            // Se for o portador da chave, solta a chave no chão!
            if (this.hasKey && map && map.spawnPowerUp) {
                const grid = this.getGridPos();
                map.spawnPowerUp(grid.col, grid.row, 'key');
                this.hasKey = false;
            }

            return true; // Morreu
        }
        return false; // Sobreviveu com dano
    }

    update(dt, map, player, bombs = []) {
        if (!this.isAlive) {
            this.deathTimer += dt;
            if (this.deathTimer > 450) {
                this.toBeRemoved = true;
            }
            return;
        }

        if (this.damageTimer > 0) {
            this.damageTimer -= dt;
        }

        // Animação de caminhada/ação
        this.animTimer += dt;
        const animSpeed = this.isCharging ? 90 : 140;
        if (this.animTimer > animSpeed) {
            this.animFrame = (this.animFrame + 1) % 4;
            this.animTimer = 0;
        }

        // Timer de tomada de decisão da IA (para evitar mudanças bruscas a cada frame)
        this.decisionTimer -= dt;
        if (this.decisionTimer <= 0) {
            this.decisionTimer = 160 + Math.random() * 80;
            this.decideNextMove(map, player, bombs);
        }

        // Execução do movimento de acordo com o tipo
        this.executeMovement(dt, map);
    }

    decideNextMove(map, player, bombs) {
        const myCenter = {
            x: this.x + this.width / 2,
            y: this.y + this.height / 2
        };
        const currentCol = Math.floor(myCenter.x / CONSTANTS.TILE_SIZE);
        const currentRow = Math.floor(myCenter.y / CONSTANTS.TILE_SIZE);

        // 1. AVALIAÇÃO DE PERIGO DE BOMBA (Esquiva Inteligente)
        const dangerMap = this.calculateBombDangerZones(map, bombs);
        const isInDanger = dangerMap[`${currentCol},${currentRow}`];

        if (isInDanger) {
            // Tenta achar a melhor rota de fuga para um tile seguro
            const escapeDir = this.findEscapeDirection(currentCol, currentRow, map, dangerMap);
            if (escapeDir) {
                this.direction = escapeDir;
                this.facing = escapeDir.name;
                this.isCharging = false;
                return;
            }
        }

        // 2. COMPORTAMENTO ESPECÍFICO POR TIPO
        switch (this.type) {
            case CONSTANTS.ENEMY_TYPES.ONEAL: // Busca caminho mais curto até o jogador (BFS)
                this.decideOnealMove(currentCol, currentRow, map, player, dangerMap);
                break;

            case CONSTANTS.ENEMY_TYPES.DAHL: // Investida em linha de visão
                this.decideDahlMove(currentCol, currentRow, map, player, dangerMap);
                break;

            case CONSTANTS.ENEMY_TYPES.MINVO: // Perseguição com passagem por blocos destrutíveis
                this.decideMinvoMove(currentCol, currentRow, map, player, dangerMap);
                break;

            case CONSTANTS.ENEMY_TYPES.BALLOM:
            default:
                this.decideBallomMove(currentCol, currentRow, map, player, dangerMap);
                break;
        }
    }

    calculateBombDangerZones(map, bombs) {
        const danger = {};
        for (let bomb of bombs) {
            if (bomb.toBeRemoved) continue;
            
            // Tile da própria bomba
            danger[`${bomb.col},${bomb.row}`] = true;

            // Linhas de expansão da bomba
            const dirs = [
                { c: 0, r: -1 }, { c: 0, r: 1 },
                { c: -1, r: 0 }, { c: 1, r: 0 }
            ];

            for (let d of dirs) {
                for (let i = 1; i <= bomb.radius; i++) {
                    const tc = bomb.col + d.c * i;
                    const tr = bomb.row + d.r * i;
                    if (tc < 0 || tc >= CONSTANTS.GRID_WIDTH || tr < 0 || tr >= CONSTANTS.GRID_HEIGHT) break;
                    
                    const tile = map.grid[tr][tc];
                    if (tile === CONSTANTS.TILE_SOLID) break;
                    
                    danger[`${tc},${tr}`] = true;
                    if (tile === CONSTANTS.TILE_SOFT) break; // Tijolo bloqueia alcance
                }
            }
        }
        return danger;
    }

    findEscapeDirection(col, row, map, dangerMap) {
        const dirs = [
            { vx: 0, vy: -1, name: 'up', c: 0, r: -1 },
            { vx: 0, vy: 1, name: 'down', c: 0, r: 1 },
            { vx: -1, vy: 0, name: 'left', c: -1, r: 0 },
            { vx: 1, vy: 0, name: 'right', c: 1, r: 0 }
        ];

        // Embaralha para não ser previsível
        dirs.sort(() => Math.random() - 0.5);

        for (let d of dirs) {
            const nextCol = col + d.c;
            const nextRow = row + d.r;

            if (this.isTilePassable(nextCol, nextRow, map)) {
                // Se o próximo tile não estiver em perigo, foge para lá!
                if (!dangerMap[`${nextCol},${nextRow}`]) {
                    return { vx: d.vx, vy: d.vy, name: d.name };
                }
            }
        }
        return null;
    }

    isTilePassable(col, row, map) {
        if (col < 0 || col >= CONSTANTS.GRID_WIDTH || row < 0 || row >= CONSTANTS.GRID_HEIGHT) return false;
        const tile = map.grid[row][col];
        if (tile === CONSTANTS.TILE_SOLID) return false;
        if (tile === CONSTANTS.TILE_BOMB) return false;
        if (tile === CONSTANTS.TILE_SOFT && !this.canPassSoftWalls) return false;
        return true;
    }

    // --- LÓGICAS INDIVIDUAIS DE IA ---

    decideBallomMove(col, row, map, player, dangerMap) {
        this.speed = this.baseSpeed;
        const availableDirs = this.getAvailableDirections(col, row, map, dangerMap);
        if (availableDirs.length === 0) return;

        // Se estiver se movendo e o caminho continuar livre, mantém na maioria das vezes
        const currentIsAvailable = availableDirs.find(d => d.name === this.facing);
        if (currentIsAvailable && Math.random() < 0.7) {
            return;
        }

        // Escolhe uma direção válida disponível
        const chosen = availableDirs[Math.floor(Math.random() * availableDirs.length)];
        this.direction = { vx: chosen.vx, vy: chosen.vy };
        this.facing = chosen.name;
    }

    decideOnealMove(col, row, map, player, dangerMap) {
        this.speed = this.baseSpeed;
        const playerGrid = player.getGridPos();

        // Distância de Manhattan até o jogador
        const dist = Math.abs(col - playerGrid.col) + Math.abs(row - playerGrid.row);

        // Se o jogador estiver em um raio de até 8 blocos, usa BFS para traçar o melhor caminho
        if (dist <= 8) {
            const path = this.findPathBFS(col, row, playerGrid.col, playerGrid.row, map, dangerMap);
            if (path && path.length > 0) {
                const nextStep = path[0];
                const dx = nextStep.col - col;
                const dy = nextStep.row - row;
                
                let dirName = 'down';
                if (dx > 0) dirName = 'right';
                else if (dx < 0) dirName = 'left';
                else if (dy < 0) dirName = 'up';
                
                this.direction = { vx: dx, vy: dy };
                this.facing = dirName;
                return;
            }
        }

        // Caso o jogador esteja longe ou bloqueado, patrulha com inteligência
        this.decideBallomMove(col, row, map, player, dangerMap);
    }

    decideDahlMove(col, row, map, player, dangerMap) {
        const playerGrid = player.getGridPos();

        // Verifica se há linha reta direta e desobstruída com o jogador
        if (this.hasLineOfSight(col, row, playerGrid.col, playerGrid.row, map)) {
            this.isCharging = true;
            this.speed = 1.35; // Aceleração equilibrada durante investida

            const dx = playerGrid.col - col;
            const dy = playerGrid.row - row;

            if (dx !== 0) {
                this.direction = { vx: Math.sign(dx), vy: 0 };
                this.facing = dx > 0 ? 'right' : 'left';
            } else {
                this.direction = { vx: 0, vy: Math.sign(dy) };
                this.facing = dy > 0 ? 'down' : 'up';
            }
            return;
        }

        // Sem linha de visão, move-se normalmente
        this.isCharging = false;
        this.speed = this.baseSpeed;
        this.decideBallomMove(col, row, map, player, dangerMap);
    }

    hasLineOfSight(x1, y1, x2, y2, map) {
        if (x1 !== x2 && y1 !== y2) return false; // Precisa estar na mesma linha ou coluna

        if (x1 === x2) {
            const minY = Math.min(y1, y2);
            const maxY = Math.max(y1, y2);
            for (let y = minY + 1; y < maxY; y++) {
                if (map.grid[y][x1] !== CONSTANTS.TILE_EMPTY) return false;
            }
            return true;
        } else {
            const minX = Math.min(x1, x2);
            const maxX = Math.max(x1, x2);
            for (let x = minX + 1; x < maxX; x++) {
                if (map.grid[y1][x] !== CONSTANTS.TILE_EMPTY) return false;
            }
            return true;
        }
    }

    decideMinvoMove(col, row, map, player, dangerMap) {
        this.speed = this.baseSpeed;
        const playerGrid = player.getGridPos();

        // Minvo usa BFS mas considerando blocos SOFT como transitáveis
        const path = this.findPathBFS(col, row, playerGrid.col, playerGrid.row, map, dangerMap, true);
        if (path && path.length > 0 && Math.random() < 0.85) {
            const nextStep = path[0];
            const dx = nextStep.col - col;
            const dy = nextStep.row - row;
            
            let dirName = 'down';
            if (dx > 0) dirName = 'right';
            else if (dx < 0) dirName = 'left';
            else if (dy < 0) dirName = 'up';

            this.direction = { vx: dx, vy: dy };
            this.facing = dirName;
            return;
        }

        this.decideBallomMove(col, row, map, player, dangerMap);
    }

    findPathBFS(startCol, startRow, targetCol, targetRow, map, dangerMap, canPassSoft = false) {
        const queue = [{ col: startCol, row: startRow, path: [] }];
        const visited = new Set();
        visited.add(`${startCol},${startRow}`);

        const dirs = [
            { c: 0, r: -1 }, { c: 0, r: 1 },
            { c: -1, r: 0 }, { c: 1, r: 0 }
        ];

        let iterations = 0;
        while (queue.length > 0 && iterations < 120) {
            iterations++;
            const current = queue.shift();

            if (current.col === targetCol && current.row === targetRow) {
                return current.path;
            }

            for (let d of dirs) {
                const nc = current.col + d.c;
                const nr = current.row + d.r;
                const key = `${nc},${nr}`;

                if (visited.has(key)) continue;

                if (nc >= 0 && nc < CONSTANTS.GRID_WIDTH && nr >= 0 && nr < CONSTANTS.GRID_HEIGHT) {
                    const tile = map.grid[nr][nc];
                    const isSolid = tile === CONSTANTS.TILE_SOLID || tile === CONSTANTS.TILE_BOMB;
                    const isSoftBlocked = tile === CONSTANTS.TILE_SOFT && !canPassSoft;

                    // Evita ladrilhos com bombas ativas no caminho a menos que seja o alvo do jogador
                    const isDangerous = dangerMap && dangerMap[key] && (nc !== targetCol || nr !== targetRow);

                    if (!isSolid && !isSoftBlocked && !isDangerous) {
                        visited.add(key);
                        queue.push({
                            col: nc,
                            row: nr,
                            path: [...current.path, { col: nc, row: nr }]
                        });
                    }
                }
            }
        }
        return null;
    }

    getAvailableDirections(col, row, map, dangerMap) {
        const dirs = [
            { vx: 0, vy: -1, name: 'up', c: 0, r: -1 },
            { vx: 0, vy: 1, name: 'down', c: 0, r: 1 },
            { vx: -1, vy: 0, name: 'left', c: -1, r: 0 },
            { vx: 1, vy: 0, name: 'right', c: 1, r: 0 }
        ];

        return dirs.filter(d => {
            const nc = col + d.c;
            const nr = row + d.r;
            if (!this.isTilePassable(nc, nr, map)) return false;
            // Se houver perigo de bomba na direção, evita se houver outras opções
            if (dangerMap && dangerMap[`${nc},${nr}`]) return false;
            return true;
        });
    }

    executeMovement(dt, map) {
        if (!this.direction) return;

        const timeScale = Math.min(dt || 16.6667, 50) / 16.6667;

        this.vx = this.direction.vx * this.speed * timeScale;
        this.vy = this.direction.vy * this.speed * timeScale;

        // Movimento no eixo X
        this.x += this.vx;
        if (this.checkMapCollision(map)) {
            this.x -= this.vx;
            // Ao bater na parede, cancela investida e reorienta
            this.isCharging = false;
            this.speed = this.baseSpeed;
            this.direction = this.getRandomDirection();
            this.facing = this.direction.name;
        }

        // Movimento no eixo Y
        this.y += this.vy;
        if (this.checkMapCollision(map)) {
            this.y -= this.vy;
            this.isCharging = false;
            this.speed = this.baseSpeed;
            this.direction = this.getRandomDirection();
            this.facing = this.direction.name;
        }
    }

    checkMapCollision(map) {
        const left = this.x;
        const right = this.x + this.width;
        const top = this.y;
        const bottom = this.y + this.height;

        const pointsToCheck = [
            { x: left + 2, y: top + 2 },
            { x: right - 2, y: top + 2 },
            { x: left + 2, y: bottom - 2 },
            { x: right - 2, y: bottom - 2 }
        ];

        for (let p of pointsToCheck) {
            const col = Math.floor(p.x / CONSTANTS.TILE_SIZE);
            const row = Math.floor(p.y / CONSTANTS.TILE_SIZE);

            if (col < 0 || col >= CONSTANTS.GRID_WIDTH || row < 0 || row >= CONSTANTS.GRID_HEIGHT) return true;

            const tile = map.grid[row][col];
            if (tile === CONSTANTS.TILE_SOLID || tile === CONSTANTS.TILE_BOMB) {
                return true;
            }
            if (tile === CONSTANTS.TILE_SOFT && !this.canPassSoftWalls) {
                return true;
            }
        }
        return false;
    }

    draw(ctx, spriteLoader) {
        const sprite = spriteLoader ? spriteLoader.get(this.spriteKey) : null;

        // Efeito de piscar quando sofre dano
        if (this.damageTimer > 0 && Math.floor(Date.now() / 60) % 2 === 0) {
            ctx.globalAlpha = 0.4;
        }

        if (sprite) {
            const frameW = sprite.width / 4;
            const frameH = sprite.height / 4;

            let row = 0;
            let col = this.animFrame;

            if (!this.isAlive) {
                row = 3; // Linha de explosão/pop de derrota
                col = Math.min(3, Math.floor(this.deathTimer / 110));
            } else {
                if (this.isCharging) {
                    row = 2; // Linha de investida / modo ativo
                } else if (this.facing === 'left' || this.facing === 'right') {
                    row = 1; // Linha de perfil
                } else if (this.facing === 'up') {
                    row = 2; // Linha de costas/subindo
                } else {
                    row = 0; // Linha frontal padrão
                }
            }

            const drawX = this.x - (CONSTANTS.TILE_SIZE - this.width) / 2;
            const drawY = this.y - (CONSTANTS.TILE_SIZE - this.height) / 2;

            ctx.save();
            // Espelha horizontalmente se estiver olhando para a esquerda na linha lateral
            if (this.facing === 'left' && row === 1 && this.isAlive) {
                ctx.translate(drawX + CONSTANTS.TILE_SIZE, drawY);
                ctx.scale(-1, 1);
                ctx.drawImage(
                    sprite,
                    col * frameW, row * frameH, frameW, frameH,
                    0, 0,
                    CONSTANTS.TILE_SIZE, CONSTANTS.TILE_SIZE
                );
            } else {
                // Efeito de aura suave para o Minvo (fantasma)
                if (this.type === CONSTANTS.ENEMY_TYPES.MINVO && this.isAlive) {
                    ctx.globalAlpha = 0.85;
                }

                ctx.drawImage(
                    sprite,
                    col * frameW, row * frameH, frameW, frameH,
                    drawX, drawY,
                    CONSTANTS.TILE_SIZE, CONSTANTS.TILE_SIZE
                );
            }
            ctx.restore();
        } else {
            if (!this.isAlive) {
                ctx.globalAlpha = 1.0;
                return;
            }
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Barra de Vida para inimigos com múltiplos pontos de vida (ex: Golem Laranja)
        if (this.isAlive && this.maxHp > 1) {
            const barW = this.width;
            const barH = 5;
            const barX = this.x;
            const barY = this.y - 8;

            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(barX, barY, barW, barH);
            ctx.fillStyle = this.hp > 1 ? '#ff9800' : '#f44336';
            ctx.fillRect(barX + 1, barY + 1, (barW - 2) * (this.hp / this.maxHp), barH - 2);
        }

        // Se este inimigo carrega a chave secreta, desenha um brilho e mini-chave acima dele
        if (this.isAlive && this.hasKey) {
            const doorAndKeySprite = spriteLoader ? spriteLoader.get('door_and_key') : null;
            if (doorAndKeySprite) {
                const kw = doorAndKeySprite.width / 2;
                const kh = doorAndKeySprite.height / 2;
                const floatY = Math.sin((Date.now() + this.x) / 150) * 3;
                ctx.drawImage(
                    doorAndKeySprite,
                    0 * kw, 1 * kh, kw, kh,
                    this.x + this.width / 2 - 8, this.y - 20 + floatY,
                    16, 16
                );
            }
        }

        ctx.globalAlpha = 1.0;
    }
}
