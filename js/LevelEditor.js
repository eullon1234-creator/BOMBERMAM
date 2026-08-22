class LevelEditor {
    constructor(game) {
        this.game = game;
        this.canvas = game.canvas;
        this.ctx = game.ctx;

        this.grid = [];
        this.biome = CONSTANTS.BIOMES.FOREST;
        this.playerSpawn = { col: 1, row: 1 };
        this.player2Spawn = { col: 13, row: 13 };
        this.enemies = []; // [{col, row, type}]
        this.boss = null;  // {col, row}
        this.powerUps = []; // [{col, row, type}]
        this.door = { col: 13, row: 1 };
        this.keyInCrate = { col: 1, row: 13 };

        this.currentTool = 'tile_solid';
        this.isMouseDown = false;
        this.lastPaintCell = null;
        this.hoverCol = -1;
        this.hoverRow = -1;

        this.levelName = "Minha Fase Incrível";
        this.savedLevels = this.getStoredLevels();

        this.initDefaultGrid();
        this.bindDOM();
    }

    initDefaultGrid() {
        this.grid = [];
        this.enemies = [
            { col: 7, row: 7, type: CONSTANTS.ENEMY_TYPES.BALLOM },
            { col: 11, row: 5, type: CONSTANTS.ENEMY_TYPES.ONEAL }
        ];
        this.powerUps = [
            { col: 3, row: 3, type: 'fire' },
            { col: 5, row: 3, type: 'bomb' },
            { col: 9, row: 9, type: 'spike' }
        ];
        this.boss = null;
        this.playerSpawn = { col: 1, row: 1 };
        this.player2Spawn = { col: 13, row: 13 };
        this.door = { col: 13, row: 1, isRevealed: false };
        this.keyInCrate = { col: 1, row: 13 };

        for (let r = 0; r < CONSTANTS.GRID_HEIGHT; r++) {
            let row = [];
            for (let c = 0; c < CONSTANTS.GRID_WIDTH; c++) {
                if (r === 0 || r === CONSTANTS.GRID_HEIGHT - 1 || c === 0 || c === CONSTANTS.GRID_WIDTH - 1) {
                    row.push(CONSTANTS.TILE_SOLID);
                } else if (r % 2 === 0 && c % 2 === 0) {
                    row.push(CONSTANTS.TILE_SOLID);
                } else {
                    if ((r === 1 && c <= 2) || (c === 1 && r <= 2)) {
                        row.push(CONSTANTS.TILE_EMPTY);
                    } else if (Math.random() < 0.35) {
                        row.push(CONSTANTS.TILE_SOFT);
                    } else {
                        row.push(CONSTANTS.TILE_EMPTY);
                    }
                }
            }
            this.grid.push(row);
        }
    }

    bindDOM() {
        // Seleção de ferramentas da paleta
        document.querySelectorAll('.builder-tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tool = btn.getAttribute('data-tool');
                this.selectTool(tool);
            });
        });

        // Eventos do Canvas para pintura
        this.canvas.addEventListener('mousedown', (e) => {
            if (this.game.state !== CONSTANTS.STATE_BUILDER) return;
            this.isMouseDown = true;
            const pos = this.getCanvasGridPos(e);
            if (pos) this.paint(pos.col, pos.row);
        });

        window.addEventListener('mouseup', () => {
            this.isMouseDown = false;
            this.lastPaintCell = null;
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (this.game.state !== CONSTANTS.STATE_BUILDER) return;
            const pos = this.getCanvasGridPos(e);
            if (pos) {
                this.hoverCol = pos.col;
                this.hoverRow = pos.row;
                if (this.isMouseDown) {
                    if (!this.lastPaintCell || this.lastPaintCell.col !== pos.col || this.lastPaintCell.row !== pos.row) {
                        this.paint(pos.col, pos.row);
                    }
                }
            } else {
                this.hoverCol = -1;
                this.hoverRow = -1;
            }
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.hoverCol = -1;
            this.hoverRow = -1;
        });

        // Botões de Ação do Editor
        const btnPlaytest = document.getElementById('btn-builder-playtest');
        if (btnPlaytest) {
            btnPlaytest.addEventListener('click', () => this.startPlaytest());
        }

        const btnClear = document.getElementById('btn-builder-clear');
        if (btnClear) {
            btnClear.addEventListener('click', () => this.clearMap());
        }

        const btnSave = document.getElementById('btn-builder-save');
        if (btnSave) {
            btnSave.addEventListener('click', () => this.saveCurrentLevel());
        }

        const btnExport = document.getElementById('btn-builder-export');
        if (btnExport) {
            btnExport.addEventListener('click', () => this.openExportModal());
        }

        const btnImport = document.getElementById('btn-builder-import');
        if (btnImport) {
            btnImport.addEventListener('click', () => this.openImportModal());
        }

        const btnBackMenu = document.getElementById('btn-builder-back-menu');
        if (btnBackMenu) {
            btnBackMenu.addEventListener('click', () => {
                this.game.openMenu();
            });
        }

        // Seletor de Bioma
        const biomeSelect = document.getElementById('builder-biome-select');
        if (biomeSelect) {
            biomeSelect.addEventListener('change', (e) => {
                this.biome = parseInt(e.target.value, 10);
            });
        }

        // Seletor de Templates
        const templateSelect = document.getElementById('builder-template-select');
        if (templateSelect) {
            templateSelect.addEventListener('change', (e) => {
                const val = e.target.value;
                if (val) {
                    this.loadTemplate(val);
                    e.target.value = "";
                }
            });
        }
    }

    getCanvasGridPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;

        const col = Math.floor(mouseX / CONSTANTS.TILE_SIZE);
        const row = Math.floor(mouseY / CONSTANTS.TILE_SIZE);

        if (col >= 0 && col < CONSTANTS.GRID_WIDTH && row >= 0 && row < CONSTANTS.GRID_HEIGHT) {
            return { col, row };
        }
        return null;
    }

    selectTool(toolKey) {
        this.currentTool = toolKey;
        document.querySelectorAll('.builder-tool-btn').forEach(btn => {
            if (btn.getAttribute('data-tool') === toolKey) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        if (window.soundManager) window.soundManager.playHover();
    }

    paint(col, row) {
        this.lastPaintCell = { col, row };

        // Bordas externas são sempre sólidas
        if (row === 0 || row === CONSTANTS.GRID_HEIGHT - 1 || col === 0 || col === CONSTANTS.GRID_WIDTH - 1) {
            return;
        }

        const tool = this.currentTool;

        if (tool === 'erase') {
            this.grid[row][col] = CONSTANTS.TILE_EMPTY;
            this.enemies = this.enemies.filter(e => !(e.col === col && e.row === row));
            this.powerUps = this.powerUps.filter(p => !(p.col === col && p.row === row));
            if (this.boss && this.boss.col === col && this.boss.row === row) this.boss = null;
            if (this.door && this.door.col === col && this.door.row === row) this.door = null;
            if (this.keyInCrate && this.keyInCrate.col === col && this.keyInCrate.row === row) this.keyInCrate = null;
            if (window.soundManager) window.soundManager.playEditorErase();
            return;
        }

        // Terrenos
        if (tool === 'tile_empty') {
            this.grid[row][col] = CONSTANTS.TILE_EMPTY;
        } else if (tool === 'tile_solid') {
            this.grid[row][col] = CONSTANTS.TILE_SOLID;
            this.clearEntitiesAt(col, row);
        } else if (tool === 'tile_soft') {
            this.grid[row][col] = CONSTANTS.TILE_SOFT;
            this.clearEntitiesAt(col, row);
        } else if (tool === 'tile_ice') {
            this.grid[row][col] = CONSTANTS.TILE_ICE;
        } else if (tool === 'tile_conveyor_up') {
            this.grid[row][col] = CONSTANTS.TILE_CONVEYOR_UP;
        } else if (tool === 'tile_conveyor_down') {
            this.grid[row][col] = CONSTANTS.TILE_CONVEYOR_DOWN;
        } else if (tool === 'tile_conveyor_left') {
            this.grid[row][col] = CONSTANTS.TILE_CONVEYOR_LEFT;
        } else if (tool === 'tile_conveyor_right') {
            this.grid[row][col] = CONSTANTS.TILE_CONVEYOR_RIGHT;
        } else if (tool === 'tile_portal_a') {
            // Remove Portal A anterior se existir
            for (let r = 0; r < CONSTANTS.GRID_HEIGHT; r++) {
                for (let c = 0; c < CONSTANTS.GRID_WIDTH; c++) {
                    if (this.grid[r][c] === CONSTANTS.TILE_PORTAL_A) this.grid[r][c] = CONSTANTS.TILE_EMPTY;
                }
            }
            this.grid[row][col] = CONSTANTS.TILE_PORTAL_A;
        } else if (tool === 'tile_portal_b') {
            // Remove Portal B anterior se existir
            for (let r = 0; r < CONSTANTS.GRID_HEIGHT; r++) {
                for (let c = 0; c < CONSTANTS.GRID_WIDTH; c++) {
                    if (this.grid[r][c] === CONSTANTS.TILE_PORTAL_B) this.grid[r][c] = CONSTANTS.TILE_EMPTY;
                }
            }
            this.grid[row][col] = CONSTANTS.TILE_PORTAL_B;

        // Spawns
        } else if (tool === 'spawn_p1') {
            this.playerSpawn = { col, row };
            this.grid[row][col] = CONSTANTS.TILE_EMPTY;
        } else if (tool === 'spawn_p2') {
            this.player2Spawn = { col, row };
            this.grid[row][col] = CONSTANTS.TILE_EMPTY;

        // Inimigos
        } else if (tool.startsWith('enemy_')) {
            this.grid[row][col] = CONSTANTS.TILE_EMPTY;
            const enemyType = tool.replace('enemy_', '');
            if (enemyType === 'boss') {
                this.boss = { col, row };
            } else {
                this.enemies = this.enemies.filter(e => !(e.col === col && e.row === row));
                if (this.enemies.length < 15) {
                    this.enemies.push({ col, row, type: enemyType });
                }
            }

        // Objetivos & Itens
        } else if (tool === 'item_door') {
            this.door = { col, row, isRevealed: false };
            if (this.grid[row][col] === CONSTANTS.TILE_SOLID) this.grid[row][col] = CONSTANTS.TILE_SOFT;
        } else if (tool === 'item_key') {
            this.keyInCrate = { col, row };
            if (this.grid[row][col] === CONSTANTS.TILE_EMPTY) this.grid[row][col] = CONSTANTS.TILE_SOFT;
        } else if (tool.startsWith('power_')) {
            const pType = tool.replace('power_', '');
            this.powerUps = this.powerUps.filter(p => !(p.col === col && p.row === row));
            this.powerUps.push({ col, row, type: pType });
            if (this.grid[row][col] === CONSTANTS.TILE_SOLID) this.grid[row][col] = CONSTANTS.TILE_EMPTY;
        }

        if (window.soundManager) window.soundManager.playEditorPlace();
    }

    clearEntitiesAt(col, row) {
        this.enemies = this.enemies.filter(e => !(e.col === col && e.row === row));
        this.powerUps = this.powerUps.filter(p => !(p.col === col && p.row === row));
        if (this.boss && this.boss.col === col && this.boss.row === row) this.boss = null;
    }

    clearMap() {
        for (let r = 0; r < CONSTANTS.GRID_HEIGHT; r++) {
            for (let c = 0; c < CONSTANTS.GRID_WIDTH; c++) {
                if (r === 0 || r === CONSTANTS.GRID_HEIGHT - 1 || c === 0 || c === CONSTANTS.GRID_WIDTH - 1) {
                    this.grid[r][c] = CONSTANTS.TILE_SOLID;
                } else {
                    this.grid[r][c] = CONSTANTS.TILE_EMPTY;
                }
            }
        }
        this.enemies = [];
        this.powerUps = [];
        this.boss = null;
        this.door = { col: 13, row: 13 };
        this.keyInCrate = null;
        if (window.soundManager) window.soundManager.playBrickCrumble();
    }

    loadTemplate(templateKey) {
        this.clearMap();

        if (templateKey === 'classic') {
            for (let r = 2; r < CONSTANTS.GRID_HEIGHT - 2; r += 2) {
                for (let c = 2; c < CONSTANTS.GRID_WIDTH - 2; c += 2) {
                    this.grid[r][c] = CONSTANTS.TILE_SOLID;
                }
            }
            for (let r = 1; r < CONSTANTS.GRID_HEIGHT - 1; r++) {
                for (let c = 1; c < CONSTANTS.GRID_WIDTH - 1; c++) {
                    if (this.grid[r][c] === CONSTANTS.TILE_EMPTY && Math.random() < 0.45) {
                        if (!((r <= 2 && c <= 2) || (r >= 12 && c >= 12))) {
                            this.grid[r][c] = CONSTANTS.TILE_SOFT;
                        }
                    }
                }
            }
            this.enemies = [
                { col: 7, row: 7, type: CONSTANTS.ENEMY_TYPES.BALLOM },
                { col: 11, row: 5, type: CONSTANTS.ENEMY_TYPES.ONEAL },
                { col: 5, row: 11, type: CONSTANTS.ENEMY_TYPES.DAHL }
            ];
            this.powerUps = [
                { col: 3, row: 3, type: 'fire' },
                { col: 9, row: 9, type: 'spike' },
                { col: 7, row: 3, type: 'bomb' }
            ];
        } else if (templateKey === 'ice_cavern') {
            this.biome = CONSTANTS.BIOMES.CRYSTAL;
            for (let r = 2; r < CONSTANTS.GRID_HEIGHT - 2; r += 2) {
                for (let c = 2; c < CONSTANTS.GRID_WIDTH - 2; c += 2) {
                    this.grid[r][c] = CONSTANTS.TILE_SOLID;
                }
            }
            for (let r = 1; r < CONSTANTS.GRID_HEIGHT - 1; r++) {
                for (let c = 1; c < CONSTANTS.GRID_WIDTH - 1; c++) {
                    if (this.grid[r][c] === CONSTANTS.TILE_EMPTY && Math.random() < 0.35) {
                        this.grid[r][c] = CONSTANTS.TILE_ICE;
                    }
                }
            }
            this.enemies = [
                { col: 7, row: 7, type: CONSTANTS.ENEMY_TYPES.MINVO },
                { col: 9, row: 3, type: CONSTANTS.ENEMY_TYPES.ONEAL }
            ];
            this.powerUps = [
                { col: 5, row: 5, type: 'ice' },
                { col: 7, row: 9, type: 'speed' }
            ];
        } else if (templateKey === 'conveyor_factory') {
            this.biome = CONSTANTS.BIOMES.CYBER;
            for (let c = 2; c <= 12; c++) {
                this.grid[4][c] = CONSTANTS.TILE_CONVEYOR_RIGHT;
                this.grid[10][c] = CONSTANTS.TILE_CONVEYOR_LEFT;
            }
            for (let r = 4; r <= 10; r++) {
                this.grid[r][2] = CONSTANTS.TILE_CONVEYOR_UP;
                this.grid[r][12] = CONSTANTS.TILE_CONVEYOR_DOWN;
            }
            this.grid[7][7] = CONSTANTS.TILE_PORTAL_A;
            this.grid[2][2] = CONSTANTS.TILE_PORTAL_B;
            this.enemies = [
                { col: 7, row: 4, type: CONSTANTS.ENEMY_TYPES.DAHL },
                { col: 7, row: 10, type: CONSTANTS.ENEMY_TYPES.DAHL }
            ];
        } else if (templateKey === 'boss_arena') {
            this.biome = CONSTANTS.BIOMES.THRONE;
            this.grid[3][3] = CONSTANTS.TILE_SOLID;
            this.grid[3][11] = CONSTANTS.TILE_SOLID;
            this.grid[11][3] = CONSTANTS.TILE_SOLID;
            this.grid[11][11] = CONSTANTS.TILE_SOLID;
            this.grid[2][2] = CONSTANTS.TILE_PORTAL_A;
            this.grid[12][12] = CONSTANTS.TILE_PORTAL_B;
            this.boss = { col: 7, row: 7 };
            this.powerUps = [
                { col: 3, row: 7, type: 'rasengan' },
                { col: 11, row: 7, type: 'rasengan' },
                { col: 7, row: 3, type: 'spike' },
                { col: 7, row: 11, type: 'remote' }
            ];
        }

        const biomeSelect = document.getElementById('builder-biome-select');
        if (biomeSelect) biomeSelect.value = this.biome;

        if (window.soundManager) window.soundManager.playLevelClear();
    }

    serializeLevel() {
        return {
            name: this.levelName,
            biome: this.biome,
            grid: this.grid,
            playerSpawn: this.playerSpawn,
            player2Spawn: this.player2Spawn,
            enemies: this.enemies,
            boss: this.boss,
            powerUps: this.powerUps,
            door: this.door,
            keyInCrate: this.keyInCrate
        };
    }

    startPlaytest() {
        const levelData = this.serializeLevel();
        this.game.startCustomLevel(levelData);
    }

    getStoredLevels() {
        try {
            return JSON.parse(localStorage.getItem('bm_custom_levels') || '{}');
        } catch (e) {
            return {};
        }
    }

    saveCurrentLevel() {
        const name = prompt("Digite o nome para salvar sua fase:", this.levelName) || this.levelName;
        if (!name) return;
        this.levelName = name;
        const levelData = this.serializeLevel();
        this.savedLevels[name] = levelData;
        localStorage.setItem('bm_custom_levels', JSON.stringify(this.savedLevels));
        alert(`✅ Fase "${name}" salva com sucesso no navegador!`);
        if (window.soundManager) window.soundManager.playPowerUp();
    }

    openExportModal() {
        const data = this.serializeLevel();
        const jsonStr = JSON.stringify(data);
        const modal = document.getElementById('modal-builder-json');
        const textarea = document.getElementById('builder-json-textarea');
        const title = document.getElementById('builder-json-title');
        const actionBtn = document.getElementById('btn-builder-json-action');

        if (modal && textarea) {
            title.innerText = "📋 EXPORTAR CÓDIGO DA FASE (JSON)";
            textarea.value = jsonStr;
            textarea.readOnly = false;
            actionBtn.innerText = "COPIAR PARA ÁREA DE TRANSFERÊNCIA";
            actionBtn.onclick = () => {
                navigator.clipboard.writeText(jsonStr).then(() => {
                    alert("✅ Código da fase copiado com sucesso! Envie para seus amigos!");
                });
            };
            modal.classList.remove('hidden');
        }
    }

    openImportModal() {
        const modal = document.getElementById('modal-builder-json');
        const textarea = document.getElementById('builder-json-textarea');
        const title = document.getElementById('builder-json-title');
        const actionBtn = document.getElementById('btn-builder-json-action');

        if (modal && textarea) {
            title.innerText = "📥 IMPORTAR CÓDIGO DA FASE (JSON)";
            textarea.value = "";
            textarea.readOnly = false;
            textarea.placeholder = "Cole aqui o código JSON da fase compartilhada...";
            actionBtn.innerText = "CARREGAR FASE NO EDITOR";
            actionBtn.onclick = () => {
                try {
                    const parsed = JSON.parse(textarea.value.trim());
                    if (parsed && parsed.grid && parsed.grid.length === CONSTANTS.GRID_HEIGHT) {
                        this.levelName = parsed.name || "Fase Importada";
                        this.biome = parsed.biome !== undefined ? parsed.biome : CONSTANTS.BIOMES.FOREST;
                        this.grid = parsed.grid;
                        this.playerSpawn = parsed.playerSpawn || { col: 1, row: 1 };
                        this.player2Spawn = parsed.player2Spawn || { col: 13, row: 13 };
                        this.enemies = parsed.enemies || [];
                        this.boss = parsed.boss || null;
                        this.powerUps = parsed.powerUps || [];
                        this.door = parsed.door || { col: 13, row: 1 };
                        this.keyInCrate = parsed.keyInCrate || null;

                        const biomeSelect = document.getElementById('builder-biome-select');
                        if (biomeSelect) biomeSelect.value = this.biome;

                        modal.classList.add('hidden');
                        alert(`✅ Fase "${this.levelName}" importada com sucesso!`);
                        if (window.soundManager) window.soundManager.playPowerUp();
                    } else {
                        alert("❌ Código de fase inválido!");
                    }
                } catch (err) {
                    alert("❌ Erro ao processar JSON: " + err.message);
                }
            };
            modal.classList.remove('hidden');
        }
    }

    render(spriteLoader) {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 1. Renderiza o mapa com o bioma selecionado
        const tempMap = new LevelMap();
        tempMap.grid = this.grid;
        tempMap.currentLevelBiome = this.biome;
        tempMap.door = this.door ? { col: this.door.col, row: this.door.row, isRevealed: true, isOpen: false } : null;
        tempMap.powerUps = this.powerUps.map(p => ({ col: p.col, row: p.row, type: p.type, immunityTimer: 0 }));
        tempMap.draw(ctx, spriteLoader, 1, null);

        // 2. Renderiza Chave Secreta se estiver em bloco ou no chão
        if (this.keyInCrate) {
            const kx = this.keyInCrate.col * CONSTANTS.TILE_SIZE;
            const ky = this.keyInCrate.row * CONSTANTS.TILE_SIZE;
            ctx.save();
            ctx.fillStyle = 'rgba(255, 235, 59, 0.4)';
            ctx.fillRect(kx + 4, ky + 4, CONSTANTS.TILE_SIZE - 8, CONSTANTS.TILE_SIZE - 8);
            ctx.font = '22px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('🔑', kx + CONSTANTS.TILE_SIZE / 2, ky + CONSTANTS.TILE_SIZE / 2 + 8);
            ctx.restore();
        }

        // 3. Renderiza Spawn dos Jogadores
        if (this.playerSpawn) {
            const sx = this.playerSpawn.col * CONSTANTS.TILE_SIZE;
            const sy = this.playerSpawn.row * CONSTANTS.TILE_SIZE;
            ctx.save();
            ctx.fillStyle = 'rgba(255, 87, 34, 0.45)';
            ctx.beginPath();
            ctx.arc(sx + CONSTANTS.TILE_SIZE / 2, sy + CONSTANTS.TILE_SIZE / 2, 18, 0, Math.PI * 2);
            ctx.fill();
            ctx.font = 'bold 12px "Outfit", sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.fillText('P1', sx + CONSTANTS.TILE_SIZE / 2, sy + CONSTANTS.TILE_SIZE / 2 + 4);
            ctx.restore();
        }

        if (this.player2Spawn) {
            const sx = this.player2Spawn.col * CONSTANTS.TILE_SIZE;
            const sy = this.player2Spawn.row * CONSTANTS.TILE_SIZE;
            ctx.save();
            ctx.fillStyle = 'rgba(0, 229, 255, 0.45)';
            ctx.beginPath();
            ctx.arc(sx + CONSTANTS.TILE_SIZE / 2, sy + CONSTANTS.TILE_SIZE / 2, 18, 0, Math.PI * 2);
            ctx.fill();
            ctx.font = 'bold 12px "Outfit", sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.fillText('P2', sx + CONSTANTS.TILE_SIZE / 2, sy + CONSTANTS.TILE_SIZE / 2 + 4);
            ctx.restore();
        }

        // 4. Renderiza Inimigos
        for (let enemy of this.enemies) {
            const ex = enemy.col * CONSTANTS.TILE_SIZE;
            const ey = enemy.row * CONSTANTS.TILE_SIZE;
            ctx.save();
            let emoji = '🎈';
            let bgColor = 'rgba(244, 67, 54, 0.5)';
            if (enemy.type === CONSTANTS.ENEMY_TYPES.ONEAL) { emoji = '💧'; bgColor = 'rgba(33, 150, 243, 0.5)'; }
            else if (enemy.type === CONSTANTS.ENEMY_TYPES.DAHL) { emoji = '🗿'; bgColor = 'rgba(255, 152, 0, 0.5)'; }
            else if (enemy.type === CONSTANTS.ENEMY_TYPES.MINVO) { emoji = '🦇'; bgColor = 'rgba(171, 71, 188, 0.5)'; }

            ctx.fillStyle = bgColor;
            ctx.beginPath();
            ctx.arc(ex + CONSTANTS.TILE_SIZE / 2, ey + CONSTANTS.TILE_SIZE / 2, 16, 0, Math.PI * 2);
            ctx.fill();

            ctx.font = '18px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(emoji, ex + CONSTANTS.TILE_SIZE / 2, ey + CONSTANTS.TILE_SIZE / 2 + 6);
            ctx.restore();
        }

        // 5. Renderiza Boss
        if (this.boss) {
            const bx = this.boss.col * CONSTANTS.TILE_SIZE;
            const by = this.boss.row * CONSTANTS.TILE_SIZE;
            ctx.save();
            ctx.fillStyle = 'rgba(229, 57, 53, 0.65)';
            ctx.beginPath();
            ctx.arc(bx + CONSTANTS.TILE_SIZE / 2, by + CONSTANTS.TILE_SIZE / 2, 22, 0, Math.PI * 2);
            ctx.fill();
            ctx.font = '24px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('👑', bx + CONSTANTS.TILE_SIZE / 2, by + CONSTANTS.TILE_SIZE / 2 + 8);
            ctx.restore();
        }

        // 6. Grid Overlay & Guias do Editor
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 1;
        for (let c = 0; c <= CONSTANTS.GRID_WIDTH; c++) {
            ctx.beginPath();
            ctx.moveTo(c * CONSTANTS.TILE_SIZE, 0);
            ctx.lineTo(c * CONSTANTS.TILE_SIZE, CONSTANTS.CANVAS_HEIGHT);
            ctx.stroke();
        }
        for (let r = 0; r <= CONSTANTS.GRID_HEIGHT; r++) {
            ctx.beginPath();
            ctx.moveTo(0, r * CONSTANTS.TILE_SIZE);
            ctx.lineTo(CONSTANTS.CANVAS_WIDTH, r * CONSTANTS.TILE_SIZE);
            ctx.stroke();
        }

        // 7. Hover Cell Highlight
        if (this.hoverCol >= 0 && this.hoverRow >= 0) {
            const hx = this.hoverCol * CONSTANTS.TILE_SIZE;
            const hy = this.hoverRow * CONSTANTS.TILE_SIZE;
            ctx.fillStyle = 'rgba(0, 229, 255, 0.25)';
            ctx.fillRect(hx, hy, CONSTANTS.TILE_SIZE, CONSTANTS.TILE_SIZE);
            ctx.strokeStyle = '#00e5ff';
            ctx.lineWidth = 2;
            ctx.strokeRect(hx, hy, CONSTANTS.TILE_SIZE, CONSTANTS.TILE_SIZE);
        }
        ctx.restore();
    }
}
