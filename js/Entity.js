class Entity {
    constructor(x, y, width, height) {
        this.x = x; // Posição absoluta em pixels
        this.y = y; // Posição absoluta em pixels
        this.width = width;
        this.height = height;
        
        this.speed = 2; // Velocidade base
        this.vx = 0;
        this.vy = 0;
        
        this.isAlive = true;
    }

    // Retorna a posição no grid baseada no centro da entidade
    getGridPos() {
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        return {
            col: Math.floor(centerX / CONSTANTS.TILE_SIZE),
            row: Math.floor(centerY / CONSTANTS.TILE_SIZE)
        };
    }

    // Verifica colisão genérica de retângulos
    checkCollision(otherEntity) {
        return (
            this.x < otherEntity.x + otherEntity.width &&
            this.x + this.width > otherEntity.x &&
            this.y < otherEntity.y + otherEntity.height &&
            this.y + this.height > otherEntity.y
        );
    }

    update(dt, map) {
        // Implementado nas classes filhas
    }

    draw(ctx) {
        // Fallback draw
        ctx.fillStyle = '#ff00ff';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}
