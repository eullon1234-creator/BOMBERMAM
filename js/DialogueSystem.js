class DialogueSystem {
    constructor() {
        this.dialogueBox = null;
        this.avatarImg = null;
        this.speakerNameEl = null;
        this.dialogueTextEl = null;
        this.nextBtn = null;
        this.skipBtn = null;

        this.currentScript = [];
        this.currentLineIdx = 0;
        this.currentText = "";
        this.targetText = "";
        this.charIdx = 0;
        this.isTyping = false;
        this.typingInterval = null;
        this.onCompleteCallback = null;
        this.heroKey = 'hero';

        this.initDOM();
    }

    initDOM() {
        this.dialogueBox = document.getElementById('dialogue-overlay');
        this.avatarImg = document.getElementById('dialogue-avatar-img');
        this.speakerNameEl = document.getElementById('dialogue-speaker-name');
        this.dialogueTextEl = document.getElementById('dialogue-text');
        this.nextBtn = document.getElementById('dialogue-next-btn');
        this.skipBtn = document.getElementById('dialogue-skip-btn');

        if (this.nextBtn) {
            this.nextBtn.addEventListener('click', () => this.advance());
        }
        if (this.skipBtn) {
            this.skipBtn.addEventListener('click', () => this.skip());
        }
        if (this.dialogueBox) {
            this.dialogueBox.addEventListener('click', (e) => {
                if (e.target !== this.skipBtn) {
                    this.advance();
                }
            });
        }
    }

    getHeroInfo(heroKey) {
        switch(heroKey) {
            case 'hero_naruto':
                return { name: 'Naruto Uzumaki', portrait: 'assets/portrait_naruto.jpg', tag: 'NINJA DE FOLHA' };
            case 'hero_sasuke':
                return { name: 'Sasuke Uchiha', portrait: 'assets/portrait_sasuke.jpg', tag: 'SHINOBI DO SHARINGAN' };
            case 'hero_warrior':
                return { name: 'Guerreiro Ancestral', portrait: 'assets/portrait_warrior.jpg', tag: 'DEFENSOR DA CHAMA' };
            case 'hero':
            default:
                return { name: 'Bomberman', portrait: 'assets/portrait_bomberman.jpg', tag: 'HERÓI DAS BOMBAS' };
        }
    }

    getDialogues(heroKey) {
        const hero = this.getHeroInfo(heroKey);

        return {
            // ==========================================
            // CAPÍTULO 1: FLORESTA ANCESTRAL (INTRO)
            // ==========================================
            'ch1_intro': [
                {
                    speaker: 'Mestre Ancião',
                    portrait: 'assets/portrait_sensei.jpg',
                    text: `Ouça com atenção, ${hero.name}! O império das máquinas de Giga Mech Titan invadiu nosso reino pacífico.`
                },
                {
                    speaker: 'Mestre Ancião',
                    portrait: 'assets/portrait_sensei.jpg',
                    text: 'Eles roubaram as Esferas de Chakra e corromperam os animais da floresta, transformando-os em monstros perigosos!'
                },
                {
                    speaker: hero.name,
                    portrait: hero.portrait,
                    text: 'Não se preocupe, Mestre! Vou usar minhas habilidades para limpar a floresta e recuperar as esferas!'
                },
                {
                    speaker: 'Mestre Ancião',
                    portrait: 'assets/portrait_sensei.jpg',
                    text: 'Destrua os tijolos para encontrar a Chave Mística e abra a Porta Secreta para entrar nas Cavernas de Cristal. Boa sorte!'
                }
            ],

            // ==========================================
            // CAPÍTULO 2: CAVERNAS DE CRISTAL (INTRO)
            // ==========================================
            'ch2_intro': [
                {
                    speaker: hero.name,
                    portrait: hero.portrait,
                    text: 'Chegamos às profundezas das Cavernas de Cristal! A energia aqui é densa e brilhante.'
                },
                {
                    speaker: 'Mestre Ancião',
                    portrait: 'assets/portrait_sensei.jpg',
                    text: 'Cuidado! Os Golems Dahl e os Slimes Oneals patrulham estas galerias. Eles são inteligentes e resistem a mais dano!'
                },
                {
                    speaker: hero.name,
                    portrait: hero.portrait,
                    text: 'Meu Chakra está carregado. Vou quebrar cada obstáculo no meu caminho!'
                }
            ],

            // ==========================================
            // CAPÍTULO 3: FORJA VULCÂNICA (INTRO)
            // ==========================================
            'ch3_intro': [
                {
                    speaker: hero.name,
                    portrait: hero.portrait,
                    text: 'Uau... Que calor insuportável! As rochas de magma estão derretendo ao redor!'
                },
                {
                    speaker: 'Mestre Ancião',
                    portrait: 'assets/portrait_sensei.jpg',
                    text: 'Esta é a Forja Vulcânica! O Titã está usando a energia do magma para fabricar armas de destruição em massa.'
                },
                {
                    speaker: 'Mestre Ancião',
                    portrait: 'assets/portrait_sensei.jpg',
                    text: 'Morcegos Minvo conseguem flutuar através dos blocos aqui. Fique alerta para não ser encurralado!'
                }
            ],

            // ==========================================
            // CAPÍTULO 4: LABORATÓRIO CIBERNÉTICO (INTRO)
            // ==========================================
            'ch4_intro': [
                {
                    speaker: 'Transmissão Holográfica',
                    portrait: 'assets/portrait_boss.jpg',
                    text: 'HA-HA-HA! Você realmente acreditou que pequenos truques poderiam deter o poder absoluto do Titã Mecânico?'
                },
                {
                    speaker: hero.name,
                    portrait: hero.portrait,
                    text: 'Giga Mech Titan! Suas máquinas não vão dominar este mundo. Estou chegando para acabar com seus planos!'
                },
                {
                    speaker: 'Giga Mech Titan',
                    portrait: 'assets/portrait_boss.jpg',
                    text: 'Tolo orgulhoso... Meus sentinelas de elite vão pulverizar seus passos antes mesmo que você alcance minha sala do trono!'
                }
            ],

            // ==========================================
            // CAPÍTULO 5: O TRONO DO TITÃ (PRÉ-BOSS)
            // ==========================================
            'ch5_boss_intro': [
                {
                    speaker: 'Giga Mech Titan',
                    portrait: 'assets/portrait_boss.jpg',
                    text: 'Impressionante... Você sobreviveu a todos os setores da minha fortaleza. Mas aqui, diante do meu trono, será seu fim!'
                },
                {
                    speaker: hero.name,
                    portrait: hero.portrait,
                    text: 'Devolva as Esferas de Chakra e desligue seus reatores, Titã! Esta é a sua última chance de recuar!'
                },
                {
                    speaker: 'Giga Mech Titan',
                    portrait: 'assets/portrait_boss.jpg',
                    text: 'RECUAR?! EU SOU A MÁQUINA SUPREMA! Sinta o impacto dos meus meteoros e o poder do plasma estelar!'
                },
                {
                    speaker: hero.name,
                    portrait: hero.portrait,
                    text: 'É hora da batalha final! VAMOS NESSA!'
                }
            ],

            // ==========================================
            // EPÍLOGO: VITÓRIA TOTAL
            // ==========================================
            'victory_epilogue': [
                {
                    speaker: 'Giga Mech Titan',
                    portrait: 'assets/portrait_boss.jpg',
                    text: 'S-Sistema... corrompido... Reatores... entrando em colapso crítico... Como... você... pôde...'
                },
                {
                    speaker: hero.name,
                    portrait: hero.portrait,
                    text: 'A união da estratégia, coragem e o poder do Chakra sempre vencerão a tirania!'
                },
                {
                    speaker: 'Mestre Ancião',
                    portrait: 'assets/portrait_sensei.jpg',
                    text: `Você conseguiu, ${hero.name}! O Titã foi derrotado e a paz retornou ao reino! Você é a verdadeira lenda de Bomberman!`
                }
            ]
        };
    }

    startDialogue(dialogueKey, heroKey, onComplete) {
        this.heroKey = heroKey || 'hero';
        this.onCompleteCallback = onComplete;
        const allDialogues = this.getDialogues(this.heroKey);
        this.currentScript = allDialogues[dialogueKey] || [];
        this.currentLineIdx = 0;

        if (this.currentScript.length === 0) {
            if (this.onCompleteCallback) this.onCompleteCallback();
            return;
        }

        if (this.dialogueBox) {
            this.dialogueBox.classList.remove('hidden');
        }

        this.showCurrentLine();
    }

    showCurrentLine() {
        if (this.currentLineIdx >= this.currentScript.length) {
            this.finishDialogue();
            return;
        }

        const line = this.currentScript[this.currentLineIdx];
        if (this.speakerNameEl) this.speakerNameEl.innerText = line.speaker;
        if (this.avatarImg) this.avatarImg.src = line.portrait;

        this.targetText = line.text;
        this.currentText = "";
        this.charIdx = 0;
        this.isTyping = true;

        if (this.typingInterval) clearInterval(this.typingInterval);

        // Efeito de digitação letra a letra
        this.typingInterval = setInterval(() => {
            if (this.charIdx < this.targetText.length) {
                this.currentText += this.targetText[this.charIdx];
                if (this.dialogueTextEl) this.dialogueTextEl.innerText = this.currentText;
                this.charIdx++;

                // Toca som sutil de fala retrô a cada 3 letras
                if (this.charIdx % 3 === 0 && window.soundManager) {
                    window.soundManager.playTone(400 + (this.charIdx % 4) * 50, 'sine', 0.03, 0.04, 0.001);
                }
            } else {
                this.isTyping = false;
                clearInterval(this.typingInterval);
                this.typingInterval = null;
            }
        }, 22);
    }

    advance() {
        if (this.isTyping) {
            // Se ainda estiver digitando, exibe a frase completa imediatamente
            if (this.typingInterval) clearInterval(this.typingInterval);
            this.typingInterval = null;
            this.isTyping = false;
            if (this.dialogueTextEl) this.dialogueTextEl.innerText = this.targetText;
        } else {
            // Avança para a próxima linha
            this.currentLineIdx++;
            if (this.currentLineIdx < this.currentScript.length) {
                this.showCurrentLine();
                window.soundManager?.playSelect();
            } else {
                this.finishDialogue();
            }
        }
    }

    skip() {
        if (this.typingInterval) clearInterval(this.typingInterval);
        this.typingInterval = null;
        this.isTyping = false;
        this.finishDialogue();
    }

    finishDialogue() {
        if (this.dialogueBox) {
            this.dialogueBox.classList.add('hidden');
        }
        if (this.onCompleteCallback) {
            const cb = this.onCompleteCallback;
            this.onCompleteCallback = null;
            cb();
        }
    }
}

window.dialogueSystem = new DialogueSystem();
