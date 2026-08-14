class Enemy extends Entity {
    constructor(x, y, level) {
        super(x, y, CONSTANTS.TILE_SIZE * 0.75, CONSTANTS.TILE_SIZE * 0.75);
        this.color = CONSTANTS.COLORS.ENEMY;
        this.level = level;
        this.speed = level === 1 ? 1.2 : 1.8;
        this.direction = this.getRandomDirection();
        
        this.x = x + (CONSTANTS.TILE_SIZE - this.width) / 2;
        this.y = y + (CONSTANTS.TILE_SIZE - this.height) / 2;

        this.animFrame = 0;
        this.animTimer = 0;
        this.deathTimer = 0;
        this.toBeRemoved = false;
    }

    getRandomDirection() {
        const dirs = [
            {vx: 1, vy: 0},
            {vx: -1, vy: 0},
            {vx: 0, vy: 1},
            {vx: 0, vy: -1}
        ];
        return dirs[Math.floor(Math.random() * dirs.length)];
    }

    update(dt, map, player) {
        if (!this.isAlive) {
            this.deathTimer += dt;
            if (this.deathTimer > 400) {
                this.toBeRemoved = true;
            }
            return;
        }

        // Animação
        this.animTimer += dt;
        if (this.animTimer > 150) {
            this.animFrame = (this.animFrame + 1) % 4;
            this.animTimer = 0;
        }

        if (this.level === 1) {
            this.randomPatrol(map);
        } else if (this.level === 2) {
            this.chasePlayer(map, player);
        }
    }

    randomPatrol(map) {
        this.vx = this.direction.vx * this.speed;
        this.vy = this.direction.vy * this.speed;

        this.x += this.vx;
        if (this.checkMapCollision(map)) {
            this.x -= this.vx;
            this.direction = this.getRandomDirection();
        }

        this.y += this.vy;
        if (this.checkMapCollision(map)) {
            this.y -= this.vy;
            this.direction = this.getRandomDirection();
        }
    }

    chasePlayer(map, player) {
        const dx = (player.x + player.width/2) - (this.x + this.width/2);
        const dy = (player.y + player.height/2) - (this.y + this.height/2);

        this.vx = 0;
        this.vy = 0;

        if (Math.abs(dx) > Math.abs(dy)) {
            this.vx = (dx > 0 ? 1 : -1) * this.speed;
        } else {
            this.vy = (dy > 0 ? 1 : -1) * this.speed;
        }

        this.x += this.vx;
        if (this.checkMapCollision(map)) {
            this.x -= this.vx;
            this.vy = (dy > 0 ? 1 : -1) * this.speed;
            this.y += this.vy;
            if (this.checkMapCollision(map)) {
                this.y -= this.vy;
            }
        } else {
            this.y += this.vy;
            if (this.checkMapCollision(map)) {
                this.y -= this.vy;
            }
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
            if (tile !== CONSTANTS.TILE_EMPTY) {
                return true;
            }
        }
        return false;
    }

    draw(ctx, spriteLoader) {
        const sprite = spriteLoader ? spriteLoader.get('enemy') : null;
        
        if (sprite) {
            const frameW = sprite.width / 4;
            const frameH = sprite.height / 4;
            let row = 0;
            let col = this.animFrame;

            if (!this.isAlive) {
                row = 3; // Linha do efeito pop de morte
                col = Math.min(3, Math.floor(this.deathTimer / 100));
            }

            const drawX = this.x - (CONSTANTS.TILE_SIZE - this.width)/2;
            const drawY = this.y - (CONSTANTS.TILE_SIZE - this.height)/2;

            ctx.drawImage(
                sprite,
                col * frameW, row * frameH, frameW, frameH,
                drawX, drawY,
                CONSTANTS.TILE_SIZE, CONSTANTS.TILE_SIZE
            );
        } else {
            if (!this.isAlive) return;
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }
}
