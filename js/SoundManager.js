class SoundManager {
    constructor() {
        this.ctx = null;
        this.enabled = localStorage.getItem('bm_sound_enabled') !== 'false';
    }

    init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggle() {
        this.enabled = !this.enabled;
        localStorage.setItem('bm_sound_enabled', this.enabled);
        if (this.enabled) {
            this.init();
            this.playSelect();
        }
        return this.enabled;
    }

    playTone(freq, type, duration, startVol = 0.2, endVol = 0.001) {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const now = this.ctx.currentTime;

            osc.type = type;
            osc.frequency.setValueAtTime(freq, now);

            gain.gain.setValueAtTime(startVol, now);
            gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, endVol), now + duration);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + duration);
        } catch (e) {
            console.warn("Audio error", e);
        }
    }

    playHover() {
        this.playTone(480, 'sine', 0.06, 0.08, 0.001);
    }

    playSelect() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(320, now);
            osc.frequency.exponentialRampToValueAtTime(640, now + 0.12);

            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.14);
        } catch (e) {}
    }

    playGameStart() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const notes = [
            { f: 261.63, d: 0.1 },  // C4
            { f: 329.63, d: 0.1 },  // E4
            { f: 392.00, d: 0.1 },  // G4
            { f: 523.25, d: 0.25 }  // C5
        ];

        let offset = 0;
        notes.forEach((n) => {
            setTimeout(() => {
                this.playTone(n.f, 'square', n.d, 0.15, 0.01);
            }, offset * 1000);
            offset += n.d * 0.85;
        });
    }

    playBombDrop() {
        this.playTone(180, 'sine', 0.15, 0.2, 0.01);
    }

    playExplosion() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            // Ruído branco para simular explosão clássica
            const bufferSize = this.ctx.sampleRate * 0.4;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(800, now);
            filter.frequency.exponentialRampToValueAtTime(50, now + 0.4);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.35, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            noise.start(now);
            noise.stop(now + 0.4);
        } catch (e) {}
    }

    playPowerUp() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const freqs = [350, 440, 580, 880];
        freqs.forEach((f, i) => {
            setTimeout(() => {
                this.playTone(f, 'sine', 0.08, 0.15, 0.01);
            }, i * 60);
        });
    }

    playRasenganCollect() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const freqs = [400, 600, 900, 1200];
        freqs.forEach((f, i) => {
            setTimeout(() => {
                this.playTone(f, 'sine', 0.1, 0.2, 0.005);
            }, i * 50);
        });
    }

    playRasenganLaunch() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.exponentialRampToValueAtTime(1100, now + 0.35);

            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.35);
        } catch (e) {}
    }

    playGameOver() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const notes = [
            { f: 400, d: 0.2 },
            { f: 350, d: 0.2 },
            { f: 300, d: 0.2 },
            { f: 220, d: 0.5 }
        ];

        let offset = 0;
        notes.forEach((n) => {
            setTimeout(() => {
                this.playTone(n.f, 'sawtooth', n.d, 0.18, 0.01);
            }, offset * 1000);
            offset += n.d;
        });
    }

    playBombKick() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(140, now);
            osc.frequency.exponentialRampToValueAtTime(360, now + 0.1);

            gain.gain.setValueAtTime(0.28, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.12);
        } catch (e) {}
    }

    playChidoriLaunch() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            // Ruído agudo + onda dente de serra para simular o chiado do "pássaro relâmpago" (Chidori)
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.linearRampToValueAtTime(2400, now + 0.25);
            osc.frequency.linearRampToValueAtTime(1200, now + 0.4);

            gain.gain.setValueAtTime(0.22, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.4);
        } catch (e) {}
    }

    playChidoriZap() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'square';
            osc.frequency.setValueAtTime(1800, now);
            osc.frequency.exponentialRampToValueAtTime(120, now + 0.15);

            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.15);
        } catch (e) {}
    }

    playVictory() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const notes = [
            { f: 392, d: 0.15 }, // G4
            { f: 523, d: 0.15 }, // C5
            { f: 659, d: 0.15 }, // E5
            { f: 784, d: 0.35 }  // G5
        ];

        let offset = 0;
        notes.forEach((n) => {
            setTimeout(() => {
                this.playTone(n.f, 'triangle', n.d, 0.22, 0.01);
            }, offset * 1000);
            offset += n.d * 0.8;
        });
    }
}

window.soundManager = new SoundManager();
