class Boss extends Entity {
    constructor(x, y) {
        super(x, y, CONSTANTS.TILE_SIZE * 2.2, CONSTANTS.TILE_SIZE * 2.2);
        this.color = '#8a2be2';
        this.hp = 12;
        this.maxHp = 12;
        this.state = 'idle'; // 'idle', 'moving', 'charging', 'damage', 'dead'
        this.stateTimer = 1500;
        this.speed = 1.6;
        
        this.animFrame = 0;
        this.animTimer = 0;
        this.deathTimer = 0;
        
        this.x = x - this.width / 2;
        this.y = y - this.height / 2;
    }

    update(dt, map, player, bombsArray, enemiesArray) {
        if (!this.isAlive) {
            this.deathTimer += dt;
            return;
        }

        this.animTimer += dt;
        if (this.animTimer > 180) {
            this.animFrame = (this.animFrame + 1) % 3;
            this.animTimer = 0;
        }

        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
            this.changeState(player, bombsArray, enemiesArray);
        }

        if (this.state === 'moving') {
            this.moveTowards(player, map);
        }
    }

    changeState(player, bombsArray, enemiesArray) {
        if (this.state === 'dead') return;

        const rand = Math.random();
        if (rand < 0.45) {
            this.state = 'moving';
            this.stateTimer = 2500;
        } else if (rand < 0.75) {
            this.state = 'charging';
            this.stateTimer = 1800;
            // Invoca minions se houver poucos
            if (enemiesArray && enemiesArray.filter(e => e.isAlive).length < 2) {
                enemiesArray.push(new Enemy(this.x, this.y, 2));
            }
        } else {
            this.state = 'idle';
            this.stateTimer = 1200;
            // Solta uma bomba do boss
            if (bombsArray) {
                const gridPos = this.getGridPos();
                bombsArray.push(new Bomb(gridPos.col * CONSTANTS.TILE_SIZE, gridPos.row * CONSTANTS.TILE_SIZE, gridPos.col, gridPos.row, 3, null));
            }
        }
    }

    moveTowards(target, map) {
        const dx = (target.x + target.width/2) - (this.x + this.width/2);
        const dy = (target.y + target.height/2) - (this.y + this.height/2);
        const length = Math.sqrt(dx*dx + dy*dy);
        if (length === 0) return;

        this.vx = (dx / length) * this.speed;
        this.vy = (dy / length) * this.speed;

        this.x += this.vx;
        if (this.checkCollisionWithWalls(map)) this.x -= this.vx;
        
        this.y += this.vy;
        if (this.checkCollisionWithWalls(map)) this.y -= this.vy;
    }

    checkCollisionWithWalls(map) {
        const left = this.x + 8;
        const right = this.x + this.width - 8;
        const top = this.y + 8;
        const bottom = this.y + this.height - 8;

        const points = [
            { x: left, y: top }, { x: right, y: top },
            { x: left, y: bottom }, { x: right, y: bottom }
        ];

        for (let p of points) {
            const col = Math.floor(p.x / CONSTANTS.TILE_SIZE);
            const row = Math.floor(p.y / CONSTANTS.TILE_SIZE);
            if (col < 0 || col >= CONSTANTS.GRID_WIDTH || row < 0 || row >= CONSTANTS.GRID_HEIGHT) return true;
            if (map.grid[row][col] === CONSTANTS.TILE_SOLID) return true;
        }
        return false;
    }

    takeDamage(amount) {
        if (this.state === 'dead') return;
        this.hp -= amount;
        this.state = 'damage';
        this.stateTimer = 400;
        
        if (this.hp <= 0) {
            this.hp = 0;
            this.state = 'dead';
            this.isAlive = false;
        }
    }

    draw(ctx, spriteLoader) {
        const sprite = spriteLoader ? spriteLoader.get('boss') : null;
        
        if (sprite) {
            const frameW = sprite.width / 3;
            const frameH = sprite.height / 3;
            let row = 0;
            let col = this.animFrame;

            if (this.state === 'idle' || this.state === 'moving') {
                row = 0;
            } else if (this.state === 'charging') {
                row = 1;
            } else if (this.state === 'damage' || this.state === 'dead') {
                row = 2;
                col = this.state === 'dead' ? 2 : (Math.floor(Date.now() / 100) % 2 === 0 ? 0 : 1);
            }

            const drawWidth = CONSTANTS.TILE_SIZE * 3;
            const drawHeight = CONSTANTS.TILE_SIZE * 3;
            const drawX = this.x - (drawWidth - this.width) / 2;
            const drawY = this.y - (drawHeight - this.height) / 2;

            ctx.drawImage(
                sprite,
                col * frameW, row * frameH, frameW, frameH,
                drawX, drawY,
                drawWidth, drawHeight
            );
        } else {
            if (!this.isAlive) return;
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }

        // Barra de Vida Superior do Boss
        if (this.isAlive) {
            const barW = this.width;
            const barH = 10;
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(this.x, this.y - 18, barW, barH);
            ctx.fillStyle = '#ff2222';
            ctx.fillRect(this.x + 1, this.y - 17, (barW - 2) * (this.hp / this.maxHp), barH - 2);
            ctx.strokeStyle = '#fff';
            ctx.strokeRect(this.x, this.y - 18, barW, barH);
        }
    }
}
