class LightingSystem {
    constructor() {
        this.lights = [];
        this.ambientLevels = {
            [CONSTANTS.BIOMES.FOREST]: 'rgba(0, 0, 0, 0.08)',     // Floresta: Iluminação diurna clara
            [CONSTANTS.BIOMES.CRYSTAL]: 'rgba(5, 12, 35, 0.38)',   // Caverna: Azul escuro místico
            [CONSTANTS.BIOMES.VOLCANO]: 'rgba(30, 8, 2, 0.42)',    // Vulcão: Avermelhado escuro
            [CONSTANTS.BIOMES.CYBER]: 'rgba(2, 8, 20, 0.45)',      // Cyber: Sci-fi neon
            [CONSTANTS.BIOMES.THRONE]: 'rgba(18, 5, 25, 0.48)'     // Trono: Sombrio dramático
        };
    }

    clear() {
        this.lights = [];
    }

    addLight(x, y, radius, color = '#ffffff', intensity = 1.0) {
        this.lights.push({ x, y, radius, color, intensity });
    }

    // Desenha sombras suaves projetadas (Drop Shadows) APENAS sob entidades ativas
    drawDropShadows(ctx, map, players, enemies, boss, bombs) {
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';

        // Sombras sob os jogadores
        if (players) {
            for (let p of players) {
                if (p && p.isAlive) {
                    ctx.beginPath();
                    ctx.ellipse(p.x + p.width/2, p.y + p.height - 2, p.width * 0.44, 4.5, 0, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        // Sombras sob os inimigos
        if (enemies) {
            for (let e of enemies) {
                if (e.isAlive) {
                    ctx.beginPath();
                    ctx.ellipse(e.x + e.width/2, e.y + e.height - 2, e.width * 0.40, 4.5, 0, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        // Sombra sob o Boss
        if (boss && boss.isAlive) {
            ctx.beginPath();
            ctx.ellipse(boss.x + boss.width/2, boss.y + boss.height - 4, boss.width * 0.38, 12, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Sombras sob bombas ativas
        if (bombs) {
            for (let b of bombs) {
                if (!b.exploded && !b.toBeRemoved) {
                    ctx.beginPath();
                    ctx.ellipse(b.x + 24, b.y + 40, 14, 5, 0, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        ctx.restore();
    }

    render(ctx, biome = CONSTANTS.BIOMES.FOREST) {
        const w = CONSTANTS.CANVAS_WIDTH;
        const h = CONSTANTS.CANVAS_HEIGHT;

        // 1. Tonalidade de ambiente por bioma
        const ambientColor = this.ambientLevels[biome];
        if (ambientColor && biome !== CONSTANTS.BIOMES.FOREST) {
            ctx.save();
            ctx.fillStyle = ambientColor;
            ctx.fillRect(0, 0, w, h);
            ctx.restore();
        }

        // 2. Auras luminosas neon (Blend Mode: 'screen')
        if (this.lights.length > 0) {
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            for (let i = 0; i < this.lights.length; i++) {
                const light = this.lights[i];
                if (!light.color) continue;
                const rad = Math.min(160, light.radius * light.intensity);
                
                const grad = ctx.createRadialGradient(light.x, light.y, 0, light.x, light.y, rad);
                grad.addColorStop(0, light.color);
                grad.addColorStop(1, 'transparent');

                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(light.x, light.y, rad, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        // 3. Vinheta cinematográfica leve nas bordas
        this.renderVignette(ctx);
    }

    renderVignette(ctx) {
        ctx.save();
        const w = CONSTANTS.CANVAS_WIDTH;
        const h = CONSTANTS.CANVAS_HEIGHT;
        const cx = w / 2;
        const cy = h / 2;
        const radius = Math.sqrt(cx * cx + cy * cy);

        const vignette = ctx.createRadialGradient(cx, cy, radius * 0.6, cx, cy, radius);
        vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vignette.addColorStop(1, 'rgba(0, 0, 0, 0.45)');

        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
    }
}
