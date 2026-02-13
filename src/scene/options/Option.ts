// Option.ts
import PureDomX from '../../core/PureDomX';
import { SoundMgr } from '../../manager/SoundMgr';
import { Score } from '../play/Score';
import { EVT_HUB_SAFE } from '../../events/SafeEventHub';
import { G_EVT } from '../../events/EVT_HUB';

const BGM_LIST = [
    { src: './assets/sounds/HOPEFUL.mp3', title: 'HOPEFUL' },
    { src: './assets/sounds/RHYTHMIC.mp3', title: 'RHYTHMIC' },
    { src: './assets/sounds/CHEERFUL.mp3', title: 'CHEERFUL' },
    { src: './assets/sounds/ENERGETIC.mp3', title: 'ENERGETIC' },
    { src: './assets/sounds/RETRO.mp3', title: 'RETRO' },
    { src: './assets/sounds/Happy.mp3', title: 'Happy' },
    { src: './assets/sounds/Warm.mp3', title: 'Warm' },
    { src: './assets/sounds/Jazz.mp3', title: 'Jazz' },
];

export class Option extends PureDomX {
    private overlay!: HTMLDivElement;
    private panel!: HTMLDivElement;
    private closeBtn!: HTMLButtonElement;
    private volumeSlider!: HTMLInputElement;
    private sfxSlider!: HTMLInputElement;
    private bgmMuteBtn!: HTMLButtonElement;
    private sfxMuteBtn!: HTMLButtonElement;
    private sliderStyle!: HTMLStyleElement;
    private isOpen = false;

    private btnBgm!: HTMLButtonElement;
    private titleElement!: HTMLDivElement;
    private currentBgmIndex: number = 0;
    private sparkleInterval: number | null = null;

    constructor(private score: Score) {
        super(document.createElement('div'));

        const savedBGM = localStorage.getItem('bgmVolume');
        const savedSFX = localStorage.getItem('sfxVolume');
        const savedBgmSrc = localStorage.getItem('bgm');
        const savedBgmMuted = localStorage.getItem('bgmMuted') === 'true';
        const savedBgmIndex = localStorage.getItem('bgmIndex');

        const bgmVolume = savedBGM !== null ? Number(savedBGM) : 20;
        const sfxVolume = savedSFX !== null ? Number(savedSFX) : 50;
        const bgmSrc = savedBgmSrc || 'assets/sounds/RETRO.mp3';

        if (savedBgmIndex) {
            this.currentBgmIndex = Number(savedBgmIndex);
        }

        SoundMgr.handle.bgmVolume = savedBgmMuted ? 0 : bgmVolume / 100;
        SoundMgr.handle.sfxVolume = sfxVolume / 100;
        SoundMgr.handle.playBGM(bgmSrc, bgmVolume);

        EVT_HUB_SAFE.on(G_EVT.BGM.CHANGE, (src: any) => {
            const currentBgmVolume = Number(
                localStorage.getItem('bgmVolume') || 20
            );
            const newBgmSrc = `${src.data}`;
            localStorage.setItem('bgm', newBgmSrc);
            SoundMgr.handle.playBGM(newBgmSrc, currentBgmVolume);
        });
    }

    public open() {
        if (this.isOpen) return;
        this.isOpen = true;

        this.buildUI();
        this.syncOverlay();

        document.body.appendChild(this.htmlElement);

        this.sparkleInterval = window.setInterval(
            () => this.sparkleTitle(),
            2800
        );
    }

    public close() {
        if (!this.isOpen) return;
        this.isOpen = false;

        if (this.sparkleInterval !== null) {
            window.clearInterval(this.sparkleInterval);
            this.sparkleInterval = null;
        }

        if (this.htmlElement.parentNode) {
            this.htmlElement.parentNode.removeChild(this.htmlElement);
        }
    }

    public buildUI() {
        this.htmlElement.innerHTML = '';

        const canvas = document.querySelector('canvas') as HTMLCanvasElement;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();

        this.overlay = document.createElement('div');
        Object.assign(this.overlay.style, {
            position: 'fixed',
            left: `${rect.left}px`,
            top: `${rect.top}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: '1001',
        });

        this.panel = document.createElement('div');
        const panelWidth = Math.min(rect.width * 0.75, 600);
        const panelHeight = panelWidth * 1.1;

        Object.assign(this.panel.style, {
            position: 'relative',
            background:
                'url("./assets/images/option.png") center/100% 100% no-repeat',
            borderRadius: '24px',
            width: `${panelWidth}px`,
            height: `${panelHeight}px`,
        });

        const resizeHandler = () => {
            const newRect = canvas.getBoundingClientRect();

            Object.assign(this.overlay.style, {
                left: `${newRect.left}px`,
                top: `${newRect.top}px`,
                width: `${newRect.width}px`,
                height: `${newRect.height}px`,
            });

            const newPanelWidth = Math.min(newRect.width * 0.75, 600);
            const newPanelHeight = newPanelWidth * 1.1;

            Object.assign(this.panel.style, {
                width: `${newPanelWidth}px`,
                height: `${newPanelHeight}px`,
            });

            // ✅ BGM Title 폰트 크기 반응형 조정
            if (this.titleElement) {
                const titleFontSize = Math.max(
                    16,
                    Math.min(24, newPanelWidth * 0.04)
                );
                this.titleElement.style.fontSize = `${titleFontSize}px`;
            }

            // ✅ 화면 비율 체크 (9:16 이하일 때 슬라이더 위로 이동)
            const sw = window.innerWidth;
            const sh = window.innerHeight;
            const aspectRatio = sw / sh;
            const targetAspectRatio = 9 / 16;

            // 슬라이더 위치 조정값 (9:16 이하일 때 위로 이동)
            const sliderOffsetAdjustment =
                aspectRatio < targetAspectRatio ? -2 : 0;

            // ✅ SFX 슬라이더 위치 조정
            if (this.sfxSlider) {
                const sfxSliderTop = 60 + sliderOffsetAdjustment;
                this.sfxSlider.style.top = `${sfxSliderTop}%`;
            }

            // ✅ BGM 슬라이더 위치 조정
            if (this.volumeSlider) {
                const bgmSliderTop = 77 + sliderOffsetAdjustment;
                this.volumeSlider.style.top = `${bgmSliderTop}%`;
            }

            // Slider 높이 계산
            const sliderHeight = Math.max(
                24,
                Math.min(36, newPanelWidth * 0.05)
            );

            if (this.sfxSlider) {
                this.sfxSlider.style.height = `${sliderHeight}px`;
            }
            if (this.volumeSlider) {
                this.volumeSlider.style.height = `${sliderHeight}px`;
            }

            // Thumb 크기
            if (this.sliderStyle) {
                const thumbSize = Math.max(30, sliderHeight * 1.3);
                const borderWidth = Math.round(thumbSize * 0.15);

                this.sliderStyle.innerHTML = `
                    input[type="range"] {
                        -webkit-appearance: none;
                        appearance: none;
                        border-radius: 20px;
                    }
                    input[type="range"]::-webkit-slider-thumb {
                        -webkit-appearance: none;
                        width: ${thumbSize}px;
                        height: ${thumbSize}px;
                        background: rgb(92,83,216);
                        border: ${borderWidth}px solid #fff;
                        border-radius: 50%;
                        cursor: pointer;
                    }
                    input[type="range"]::-moz-range-thumb {
                        width: ${thumbSize}px;
                        height: ${thumbSize}px;
                        background: rgb(92,83,216);
                        border: ${borderWidth}px solid #fff;
                        border-radius: 50%;
                        cursor: pointer;
                    }
                `;
            }
        };

        window.addEventListener('resize', resizeHandler);

        this.closeBtn = this.createButton(
            { top: '3%', right: '3%', width: '10%' },
            '/assets/images/exit.png',
            () => {
                SoundMgr.handle.playSound('btn');
                this.close();
            }
        );

        this.btnBgm = this.createButton(
            {
                top: '19.5%',
                left: '50%',
                width: '35%',
                aspectRatio: '306/126', // ✅ 추가
                transform: 'translateX(-50%)',
            },
            './assets/images/bt_bgm_s.png',
            () => {
                SoundMgr.handle.playSound('btn');
                this.changeNextBGM();
                this.sparkleTitle();
            }
        );

        this.btnBgm.addEventListener('pointerdown', () => {
            this.btnBgm.style.backgroundImage =
                'url("./assets/images/bt_bgm_n.png")';
        });
        this.btnBgm.addEventListener('pointerup', () => {
            this.btnBgm.style.backgroundImage =
                'url("./assets/images/bt_bgm_s.png")';
        });
        this.btnBgm.addEventListener('pointerleave', () => {
            this.btnBgm.style.backgroundImage =
                'url("./assets/images/bt_bgm_s.png")';
        });

        this.titleElement = document.createElement('div');
        Object.assign(this.titleElement.style, {
            position: 'absolute',
            top: '39%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '70%',
            fontFamily:
                '"SchoolSafeDungGeunMiSo", "PressStart2P-Regular", sans-serif',
            fontSize: '20px',
            fontWeight: 'bold',
            letterSpacing: '1px',
            color: '#ffffff', // ✅ 변경: '#2d1810' → '#ffffff'
            textAlign: 'center',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            pointerEvents: 'none',
            // ✅ 변경: 엠보스 효과
            textShadow: `
                0px 2px 0px rgba(0, 0, 0, 0.3),
                0px 3px 0px rgba(0, 0, 0, 0.2),
                0px 4px 0px rgba(0, 0, 0, 0.1),
                0px 1px 3px rgba(0, 0, 0, 0.5),
                0px -1px 1px rgba(255, 255, 255, 0.3)
            `,
            filter: 'drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.2))',
        });
        this.titleElement.textContent = BGM_LIST[this.currentBgmIndex].title;

        this.sfxMuteBtn = this.createButton(
            {
                left: '12%',
                top: '55%',
                width: '14%',
            },
            '/assets/images/sound_on.png',
            () => this.toggleMute('sfx')
        );

        this.sfxSlider = this.createSlider(
            Number(localStorage.getItem('sfxVolume') ?? 50),
            (v) => {
                localStorage.setItem('sfxVolume', String(v));
                const muted = this.isMuted('sfx');
                SoundMgr.handle.sfxVolume = muted ? 0 : v / 100;
                this.updateSliderStyle(this.sfxSlider, v, muted);
                this.sfxMuteBtn.style.backgroundImage =
                    muted || v === 0
                        ? 'url("./assets/images/sound_off.png")'
                        : 'url("./assets/images/sound_on.png")';
            }
        );

        Object.assign(this.sfxSlider.style, {
            position: 'absolute',
            left: '50%',
            top: '60%',
            width: '35%',
        });

        this.bgmMuteBtn = this.createButton(
            {
                left: '12%',
                top: '72%',
                width: '14%',
            },
            '/assets/images/sound_on.png',
            () => this.toggleMute('bgm')
        );

        this.volumeSlider = this.createSlider(
            Number(localStorage.getItem('bgmVolume') ?? 20),
            (v) => {
                localStorage.setItem('bgmVolume', String(v));
                const muted = this.isMuted('bgm');
                SoundMgr.handle.bgmVolume = muted ? 0 : v / 100;
                this.updateSliderStyle(this.volumeSlider, v, muted);
                this.bgmMuteBtn.style.backgroundImage =
                    muted || v === 0
                        ? 'url("./assets/images/sound_off.png")'
                        : 'url("./assets/images/sound_on.png")';
            }
        );

        Object.assign(this.volumeSlider.style, {
            position: 'absolute',
            left: '50%',
            top: '77%',
            width: '35%',
        });

        const savedBgmMuted = localStorage.getItem('bgmMuted') === 'true';
        const savedSfxMuted = localStorage.getItem('sfxMuted') === 'true';
        this.updateMuteIcon(this.bgmMuteBtn, savedBgmMuted);
        this.updateMuteIcon(this.sfxMuteBtn, savedSfxMuted);

        const savedBgmVolume = Number(localStorage.getItem('bgmVolume') ?? 20);
        const savedSfxVolume = Number(localStorage.getItem('sfxVolume') ?? 50);
        this.updateSliderStyle(
            this.volumeSlider,
            savedBgmVolume,
            savedBgmMuted
        );
        this.updateSliderStyle(this.sfxSlider, savedSfxVolume, savedSfxMuted);
        this.setSliderMuted(this.volumeSlider, this.isMuted('bgm'));
        this.setSliderMuted(this.sfxSlider, this.isMuted('sfx'));

        this.panel.append(
            this.closeBtn,
            this.btnBgm,
            this.titleElement,
            this.sfxMuteBtn,
            this.sfxSlider,
            this.bgmMuteBtn,
            this.volumeSlider
        );

        this.overlay.appendChild(this.panel);
        this.htmlElement.appendChild(this.overlay);

        requestAnimationFrame(() => {
            resizeHandler();
        });

        this.injectSliderStyle();
    }

    private changeNextBGM() {
        this.currentBgmIndex = (this.currentBgmIndex + 1) % BGM_LIST.length;
        const nextBGM = BGM_LIST[this.currentBgmIndex];
        EVT_HUB_SAFE.emit(G_EVT.BGM.CHANGE, nextBGM.src);
        localStorage.setItem('bgmIndex', String(this.currentBgmIndex));
        this.titleElement.textContent = nextBGM.title;
    }

    private sparkleTitle() {
        if (!this.titleElement) return;
        // ✅ 변경: 반짝임 효과 (엠보스 유지)
        this.titleElement.style.textShadow = `
            0px 2px 0px rgba(0, 0, 0, 0.3),
            0px 3px 0px rgba(0, 0, 0, 0.2),
            0px 4px 0px rgba(0, 0, 0, 0.1),
            0px 1px 3px rgba(255, 255, 100, 0.8),
            0px 0px 15px rgba(255, 220, 160, 1),
            0px -1px 1px rgba(255, 255, 255, 0.5)
        `;
        setTimeout(() => {
            if (this.titleElement) {
                this.titleElement.style.textShadow = `
                    0px 2px 0px rgba(0, 0, 0, 0.3),
                    0px 3px 0px rgba(0, 0, 0, 0.2),
                    0px 4px 0px rgba(0, 0, 0, 0.1),
                    0px 1px 3px rgba(0, 0, 0, 0.5),
                    0px -1px 1px rgba(255, 255, 255, 0.3)
                `;
            }
        }, 900);
    }
    private syncOverlay() {
        const canvas = document.querySelector('canvas') as HTMLCanvasElement;
        if (!canvas || !this.overlay) return;

        const rect = canvas.getBoundingClientRect();
        Object.assign(this.overlay.style, {
            left: `${rect.left}px`,
            top: `${rect.top}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`,
        });
    }

    private createButton(
        pos: Partial<CSSStyleDeclaration>,
        img: string,
        onClick: () => void
    ) {
        const btn = document.createElement('button');
        Object.assign(btn.style, {
            position: 'absolute',
            background: `url("${img}") center/contain no-repeat`,
            border: 'none',
            cursor: 'pointer',
            aspectRatio: '1',
            ...pos,
        });
        btn.onclick = onClick;
        return btn;
    }

    private createSlider(value: number, onChange: (v: number) => void) {
        const input = document.createElement('input');
        input.type = 'range';
        input.min = '0';
        input.max = '100';
        input.value = String(value);
        Object.assign(input.style, {
            width: '100%',
            height: '30px',
        });

        input.oninput = (e) => {
            const val = Number((e.target as HTMLInputElement).value);
            onChange(val);
        };

        this.updateSliderStyle(input, value);
        return input;
    }

    private toggleMute(type: 'bgm' | 'sfx') {
        const muted = this.isMuted(type);
        const newMuted = !muted;
        localStorage.setItem(`${type}Muted`, String(newMuted));

        if (type === 'bgm') {
            SoundMgr.handle.bgmMuted = newMuted;
            this.updateMuteIcon(this.bgmMuteBtn, newMuted);
            this.setSliderMuted(this.volumeSlider, newMuted);
        } else {
            SoundMgr.handle.sfxMuted = newMuted;
            this.updateMuteIcon(this.sfxMuteBtn, newMuted);
            this.setSliderMuted(this.sfxSlider, newMuted);
        }
    }

    private setSliderMuted(slider: HTMLInputElement, muted: boolean) {
        if (muted) {
            slider.style.opacity = '0.5';
            slider.style.pointerEvents = 'none';
        } else {
            slider.style.opacity = '1';
            slider.style.pointerEvents = 'auto';
            const val = Number(slider.value);
            this.updateSliderStyle(slider, val);
        }
    }

    private updateMuteIcon(btn: HTMLButtonElement, muted: boolean) {
        btn.style.backgroundImage = muted
            ? 'url("./assets/images/sound_off.png")'
            : 'url("./assets/images/sound_on.png")';
    }

    private updateSliderStyle(
        input: HTMLInputElement,
        val: number,
        muted = false
    ) {
        if (muted) {
            input.style.opacity = '0.4';
            return;
        }

        const min = Number(input.min);
        const max = Number(input.max);
        let percent = ((val - min) / (max - min)) * 100;
        percent = percent * 0.92 + 4;
        input.style.background = `linear-gradient(
            90deg,
            rgb(92,83,216) ${percent}%,
            #e2e2e2 ${percent}%
        )`;
        input.style.opacity = '1';
    }

    private injectSliderStyle() {
        this.sliderStyle = document.createElement('style');
        this.sliderStyle.innerHTML = `
            input[type="range"] {
                -webkit-appearance: none;
                appearance: none;
                border-radius: 20px;
            }
            input[type="range"]::-webkit-slider-thumb {
                -webkit-appearance: none;
                background: rgb(92,83,216);
                border: 6px solid #fff;
                border-radius: 50%;
                cursor: pointer;
            }
            input[type="range"]::-moz-range-thumb {
                background: rgb(92,83,216);
                border: 6px solid #fff;
                border-radius: 50%;
                cursor: pointer;
            }
        `;
        document.head.appendChild(this.sliderStyle);
    }

    private isMuted(type: 'bgm' | 'sfx') {
        return localStorage.getItem(`${type}Muted`) === 'true';
    }
}
