class SoundManager {
    constructor() {
        this.ctx = null;
        this.enabled = localStorage.getItem('bm_sound_enabled') !== 'false';
        this.bgmEnabled = localStorage.getItem('bm_bgm_enabled') !== 'false';
        this.currentBgmType = null;
        this.bgmInterval = null;
        this.bgmStep = 0;
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
            if (this.currentBgmType) {
                this.startBGM(this.currentBgmType);
            }
        } else {
            this.stopBGM();
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
        } catch (e) {}
    }

    playBGM(type = 'stage') {
        this.startBGM(type);
    }

    startBGM(type = 'stage') {
        this.currentBgmType = type;
        if (!this.enabled || !this.bgmEnabled) return;
        this.init();
        this.stopBGM();

        this.bgmStep = 0;
        const tempo = type === 'boss' ? 120 : (type === 'pvp' ? 130 : 160); // ms por compasso

        this.bgmInterval = setInterval(() => {
            if (!this.enabled || !this.ctx) return;

            if (type === 'stage') {
                this.playStageBgmStep(this.bgmStep);
            } else if (type === 'boss') {
                this.playBossBgmStep(this.bgmStep);
            } else if (type === 'pvp') {
                this.playPvpBgmStep(this.bgmStep);
            } else if (type === 'menu') {
                this.playMenuBgmStep(this.bgmStep);
            }
            this.bgmStep = (this.bgmStep + 1) % 32;
        }, tempo);
    }

    stopBGM() {
        if (this.bgmInterval) {
            clearInterval(this.bgmInterval);
            this.bgmInterval = null;
        }
    }

    playStageBgmStep(step) {
        // Melodia e Baixo alegre estilo Bomberman Clássico
        const bassline = [130.81, 130.81, 164.81, 196.00, 146.83, 146.83, 174.61, 220.00];
        const melody = [
            523.25, 0, 659.25, 0, 783.99, 659.25, 523.25, 0,
            587.33, 0, 698.46, 0, 880.00, 698.46, 587.33, 0,
            523.25, 0, 659.25, 0, 783.99, 880.00, 783.99, 659.25,
            587.33, 659.25, 587.33, 523.25, 493.88, 0, 523.25, 0
        ];

        const bassFreq = bassline[step % bassline.length];
        const noteFreq = melody[step];

        // Baixo pulsante
        this.playTone(bassFreq, 'triangle', 0.12, 0.08, 0.001);

        // Melodia Chiptune
        if (noteFreq > 0) {
            this.playTone(noteFreq, 'square', 0.1, 0.05, 0.001);
        }

        // Bateria sintética de ruído no tempo 4 e 12
        if (step % 4 === 2) {
            this.playSnare();
        }
    }

    playBossBgmStep(step) {
        // Melodia tensa e acelerada de batalha contra chefe
        const bass = [110, 110, 116.54, 110, 130.81, 110, 123.47, 110];
        const lead = [
            440, 466.16, 440, 392, 440, 523.25, 493.88, 440,
            880, 0, 830.61, 0, 783.99, 0, 739.99, 0
        ];

        this.playTone(bass[step % bass.length], 'sawtooth', 0.08, 0.09, 0.001);
        if (lead[step % lead.length] > 0 && step % 2 === 0) {
            this.playTone(lead[step % lead.length], 'square', 0.09, 0.07, 0.001);
        }
        if (step % 2 === 1) {
            this.playSnare(0.04);
        }
    }

    playPvpBgmStep(step) {
        const bass = [146.83, 146.83, 174.61, 196.00, 220.00, 196.00, 174.61, 146.83];
        const lead = [587.33, 0, 698.46, 0, 880.00, 783.99, 698.46, 587.33];

        this.playTone(bass[step % bass.length], 'triangle', 0.09, 0.08, 0.001);
        if (lead[step % lead.length] > 0) {
            this.playTone(lead[step % lead.length], 'square', 0.08, 0.06, 0.001);
        }
        if (step % 4 === 2) {
            this.playSnare();
        }
    }

    playMenuBgmStep(step) {
        const chords = [261.63, 329.63, 392.00, 523.25, 293.66, 349.23, 440.00, 587.33];
        const note = chords[step % chords.length];
        this.playTone(note, 'sine', 0.18, 0.06, 0.001);
    }

    playSnare(vol = 0.06) {
        if (!this.enabled || !this.ctx) return;
        try {
            const bufferSize = this.ctx.sampleRate * 0.05;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;
            const gain = this.ctx.createGain();
            const now = this.ctx.currentTime;
            gain.gain.setValueAtTime(vol, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            noise.connect(gain);
            gain.connect(this.ctx.destination);
            noise.start(now);
        } catch(e) {}
    }

    // ==========================================
    // EFEITOS SONOROS DE GAMEPLAY
    // ==========================================

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
            const bufferSize = this.ctx.sampleRate * 0.45;
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
            filter.frequency.exponentialRampToValueAtTime(45, now + 0.45);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.38, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            noise.start(now);
            noise.stop(now + 0.45);
        } catch (e) {}
    }

    playBrickCrumble() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(280, now);
            osc.frequency.exponentialRampToValueAtTime(60, now + 0.18);
            gain.gain.setValueAtTime(0.22, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.18);
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
            }, i * 50);
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

    playChidoriLaunch() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
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

    playWarriorSpin() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.linearRampToValueAtTime(850, now + 0.2);
            osc.frequency.linearRampToValueAtTime(200, now + 0.4);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.4);
        } catch (e) {}
    }

    playRemoteTrigger() {
        this.playTone(950, 'square', 0.08, 0.22, 0.01);
    }

    playCurseSkull() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        const freqs = [600, 480, 360, 240, 180];
        freqs.forEach((f, i) => {
            setTimeout(() => {
                this.playTone(f, 'sawtooth', 0.09, 0.2, 0.01);
            }, i * 60);
        });
    }

    playFreeze() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        const freqs = [1200, 1600, 2100, 2600];
        freqs.forEach((f, i) => {
            setTimeout(() => {
                this.playTone(f, 'sine', 0.07, 0.18, 0.005);
            }, i * 40);
        });
    }

    playMeteorWhoosh() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(1200, now);
            osc.frequency.exponentialRampToValueAtTime(150, now + 0.6);
            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.6);
        } catch (e) {}
    }

    playSuddenDeath() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                this.playTone(880, 'square', 0.15, 0.25, 0.01);
            }, i * 200);
        }
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

    playPause() {
        this.playTone(520, 'square', 0.1, 0.15, 0.01);
    }

    playGameOver() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        this.stopBGM();
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

    playVictory() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        this.stopBGM();
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

    playSpikeExplosion() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            // Impacto metálico penetrante
            const oscMetal = this.ctx.createOscillator();
            const gainMetal = this.ctx.createGain();
            oscMetal.type = 'square';
            oscMetal.frequency.setValueAtTime(880, now);
            oscMetal.frequency.exponentialRampToValueAtTime(110, now + 0.15);
            gainMetal.gain.setValueAtTime(0.25, now);
            gainMetal.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
            oscMetal.connect(gainMetal);
            gainMetal.connect(this.ctx.destination);
            oscMetal.start(now);
            oscMetal.stop(now + 0.18);

            // Explosão pesada
            this.playExplosion();
        } catch (e) {}
    }

    playPortalWarp() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.exponentialRampToValueAtTime(1400, now + 0.25);
            gain.gain.setValueAtTime(0.22, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.28);
        } catch (e) {}
    }

    playIceSlide() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        this.playTone(850, 'sine', 0.05, 0.08, 0.005);
    }

    playEditorPlace() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        this.playTone(540, 'triangle', 0.06, 0.12, 0.005);
    }

    playEditorErase() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        this.playTone(280, 'sawtooth', 0.05, 0.1, 0.005);
    }
}

window.soundManager = new SoundManager();
