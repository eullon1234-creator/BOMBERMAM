class ParticleSystem {
    constructor() {
        this.particles = [];
        this.floatingTexts = [];
        this.shockwaves = [];
        this.shakeIntensity = 0;
        this.shakeDuration = 0;
        this.shakeOffsetX = 0;
        this.shakeOffsetY = 0;
    }

    // Adiciona tremor de tela (Screen Shake)
    addScreenShake(intensity = 8, duration = 250) {
        this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
        this.shakeDuration = Math.max(this.shakeDuration, duration);
    }

    // Estilhaços de tijolos quando uma caixa de tijolo é destruída
    createBrickDebris(x, y, biome = 0) {
        const colors = biome === 1 ? ['#5a5a6a', '#3a3a48', '#8a8a9a', '#222228'] // Dungeon
                     : biome === 2 ? ['#00e5ff', '#1a237e', '#00b0ff', '#e0e0e0'] // Cyber
                     : ['#b35d24', '#d97736', '#8a4114', '#e68a47'];             // Clássico

        const count = 12 + Math.floor(Math.random() * 6);
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1.5 + Math.random() * 4.5;
            this.particles.push({
                type: 'brick',
                x: x + 12 + Math.random() * 24,
                y: y + 12 + Math.random() * 24,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 1.5, // Leve impulso para cima
                gravity: 0.18,
                size: 3 + Math.random() * 5,
                rotation: Math.random() * Math.PI,
                vRot: (Math.random() - 0.5) * 0.3,
                color: colors[Math.floor(Math.random() * colors.length)],
                alpha: 1.0,
                decay: 0.02 + Math.random() * 0.02
            });
        }

        // Adiciona pequena nuvem de poeira
        this.createSmokePuff(x + 24, y + 24, 6);
    }

    // Faíscas de explosão / choque
    createExplosionSparks(x, y, color = '#ffcc00', count = 14) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2.0 + Math.random() * 5.0;
            this.particles.push({
                type: 'spark',
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                gravity: 0.06,
                size: 2 + Math.random() * 3,
                color,
                alpha: 1.0,
                decay: 0.03 + Math.random() * 0.03
            });
        }
    }

    // Nuvem de fumaça suave
    createSmokePuff(x, y, count = 5) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.5 + Math.random() * 1.5;
            this.particles.push({
                type: 'smoke',
                x: x + (Math.random() - 0.5) * 12,
                y: y + (Math.random() - 0.5) * 12,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 0.4,
                gravity: -0.01, // Flutua suavemente para cima
                size: 8 + Math.random() * 10,
                color: 'rgba(200, 200, 210, 0.4)',
                alpha: 0.7,
                decay: 0.025
            });
        }
    }

    // Onda de choque circular (Shockwave)
    createShockwave(x, y, maxRadius = 50, color = 'rgba(255, 170, 0, 0.8)') {
        this.shockwaves.push({
            x,
            y,
            radius: 4,
            maxRadius,
            speed: 4.5,
            lineWidth: 4,
            color,
            alpha: 1.0
        });
    }

    // Texto de pontuação ou combo flutuante (+100, BOMB KICK!, DOUBLE KILL!)
    addFloatingText(x, y, text, color = '#ffd54f', fontSize = 13, isSpecial = false) {
        this.floatingTexts.push({
            x,
            y,
            text,
            color,
            fontSize,
            isSpecial,
            vy: -1.2,
            alpha: 1.0,
            life: isSpecial ? 1200 : 900,
            maxLife: isSpecial ? 1200 : 900
        });
    }

    update(dt) {
        // 1. Atualiza Screen Shake
        if (this.shakeDuration > 0) {
            this.shakeDuration -= dt;
            const progress = Math.max(0, this.shakeDuration / 250);
            const currentIntensity = this.shakeIntensity * progress;
            this.shakeOffsetX = (Math.random() - 0.5) * 2 * currentIntensity;
            this.shakeOffsetY = (Math.random() - 0.5) * 2 * currentIntensity;
        } else {
            this.shakeIntensity = 0;
            this.shakeOffsetX = 0;
            this.shakeOffsetY = 0;
        }

        // 2. Atualiza Partículas
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            if (p.gravity) p.vy += p.gravity;
            if (p.rotation !== undefined) p.rotation += p.vRot || 0;
            p.alpha -= p.decay;

            if (p.alpha <= 0) {
                this.particles.splice(i, 1);
            }
        }

        // 3. Atualiza Ondas de Choque
        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            const sw = this.shockwaves[i];
            sw.radius += sw.speed;
            sw.alpha = Math.max(0, 1 - (sw.radius / sw.maxRadius));
            if (sw.radius >= sw.maxRadius || sw.alpha <= 0) {
                this.shockwaves.splice(i, 1);
            }
        }

        // 4. Atualiza Textos Flutuantes
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.y += ft.vy;
            ft.life -= dt;
            ft.alpha = Math.max(0, ft.life / ft.maxLife);
            if (ft.life <= 0) {
                this.floatingTexts.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        // Desenha Ondas de Choque
        for (let sw of this.shockwaves) {
            ctx.save();
            ctx.globalAlpha = sw.alpha;
            ctx.strokeStyle = sw.color;
            ctx.lineWidth = sw.lineWidth;
            ctx.shadowColor = sw.color;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // Desenha Partículas
        for (let p of this.particles) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, p.alpha);

            if (p.type === 'brick') {
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
                // Borda de contraste
                ctx.strokeStyle = 'rgba(0,0,0,0.4)';
                ctx.lineWidth = 1;
                ctx.strokeRect(-p.size / 2, -p.size / 2, p.size, p.size);
            } else if (p.type === 'spark') {
                ctx.fillStyle = p.color;
                ctx.shadowColor = p.color;
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            } else if (p.type === 'smoke') {
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }

        // Desenha Textos Flutuantes
        for (let ft of this.floatingTexts) {
            ctx.save();
            ctx.globalAlpha = ft.alpha;
            ctx.font = `${ft.isSpecial ? '900' : 'bold'} ${ft.fontSize}px 'Outfit', 'Press Start 2P', sans-serif`;
            ctx.textAlign = 'center';
            
            // Sombra e Contorno
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#000000';
            ctx.strokeText(ft.text, ft.x, ft.y);

            ctx.fillStyle = ft.color;
            if (ft.isSpecial) {
                ctx.shadowColor = ft.color;
                ctx.shadowBlur = 12;
            }
            ctx.fillText(ft.text, ft.x, ft.y);
            ctx.restore();
        }
    }

    clear() {
        this.particles = [];
        this.floatingTexts = [];
        this.shockwaves = [];
        this.shakeIntensity = 0;
        this.shakeDuration = 0;
        this.shakeOffsetX = 0;
        this.shakeOffsetY = 0;
    }
}
