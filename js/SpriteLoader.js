class SpriteLoader {
    constructor() {
        this.rawImages = {};
        this.sprites = {}; // Imagens com Chroma Key aplicado e prontas
    }

    loadImage(name, src, chromaType = 'green') {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = () => {
                this.rawImages[name] = img;
                let processed = img;
                if (chromaType === 'white') {
                    processed = this.applyWhiteChromaKey(img);
                } else if (chromaType === 'green') {
                    processed = this.applyChromaKey(img);
                }
                this.sprites[name] = processed;
                resolve(processed);
            };
            img.onerror = () => {
                console.warn(`Falha ao carregar ${name} de ${src}. Usando fallback.`);
                resolve(null);
            };
            img.src = src;
        });
    }

    async preloadAll() {
        const list = [
            { name: 'hero', src: 'assets/hero.jpg' },
            { name: 'hero_naruto', src: 'assets/hero_naruto.jpg' },
            { name: 'hero_sasuke', src: 'assets/hero_sasuke.jpg' },
            { name: 'hero_warrior', src: 'assets/char_a_p1_0bas_humn_v00.png', chromaType: 'none' },
            { name: 'enemy', src: 'assets/enemy.jpg' },
            { name: 'enemy_blue', src: 'assets/enemy_blue.jpg' },
            { name: 'enemy_orange', src: 'assets/enemy_orange.jpg' },
            { name: 'enemy_purple', src: 'assets/enemy_purple.jpg' },
            { name: 'boss', src: 'assets/boss.jpg' },
            { name: 'bomb_explosion', src: 'assets/bomb_explosion.jpg' },
            { name: 'tileset', src: 'assets/tileset.jpg' },
            { name: 'items', src: 'assets/items.jpg' },
            { name: 'door_and_key', src: 'assets/door_and_key.jpg' },
            { name: 'rasengan', src: 'assets/rasengan.jpg' }
        ];

        for (let item of list) {
            await this.loadImage(item.name, item.src, item.chromaType || (item.whiteKey ? 'white' : 'green'));
        }
        return this.sprites;
    }

    // Aplica Chroma Key inteligente para remover o verde do fundo mesmo com artefatos de compressão
    applyChromaKey(img) {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        ctx.drawImage(img, 0, 0);
        
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Distância para o verde puro (0, 255, 0)
            const isGreen = (g > 150 && g > (r * 1.35) && g > (b * 1.35)) || (g > 210 && r < 90 && b < 90);
            
            if (isGreen) {
                data[i + 3] = 0; // Transparente
            }
        }
        
        ctx.putImageData(imgData, 0, 0);
        return canvas;
    }

    // Remove fundo branco/quase-branco de sprites PNG com fundo claro
    applyWhiteChromaKey(img) {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        ctx.drawImage(img, 0, 0);
        
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Remove pixels brancos e tons muito claros (fundo do sprite sheet)
            const brightness = (r + g + b) / 3;
            const isWhiteish = brightness > 220 && r > 200 && g > 200 && b > 200;
            
            if (isWhiteish) {
                data[i + 3] = 0; // Transparente
            } else if (brightness > 180 && r > 170 && g > 170 && b > 170) {
                // Semitransparente para bordas suaves (anti-aliasing)
                const factor = (brightness - 180) / 40;
                data[i + 3] = Math.round((1 - factor) * 255);
            }
        }
        
        ctx.putImageData(imgData, 0, 0);
        return canvas;
    }

    get(name) {
        return this.sprites[name] || null;
    }
}
