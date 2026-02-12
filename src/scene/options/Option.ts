// Option.ts
import PureDomX from '../../core/PureDomX'; // ✅ DomX → PureDomX
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
    // ✅ DomX → PureDomX
    private overlay!: HTMLDivElement;
    private panel!: HTMLDivElement;
    private closeBtn!: HTMLButtonElement;
    private giveupBtn!: HTMLButtonElement;
    private volumeSlider!: HTMLInputElement;
    private sfxSlider!: HTMLInputElement;
    private bgmMuteBtn!: HTMLButtonElement;
    private sfxMuteBtn!: HTMLButtonElement;
    private sliderStyle!: HTMLStyleElement;
    private isOpen = false;

    // ✅ ChangeBgm 관련 추가
    private btnBgm!: HTMLButtonElement;
    private titleElement!: HTMLElement;
    private currentBgmIndex: number = 0;
    private sparkleInterval: number | null = null;

    constructor(private score: Score) {
        super(document.createElement('div'));

        // ✅ 로컬스토리지에서 BGM 설정 로드
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

        // SoundMgr에 적용
        SoundMgr.handle.bgmVolume = savedBgmMuted ? 0 : bgmVolume / 100;
        SoundMgr.handle.sfxVolume = sfxVolume / 100;

        // BGM 재생
        SoundMgr.handle.playBGM(bgmSrc, bgmVolume);

        // BGM 변경 이벤트
        EVT_HUB_SAFE.on(G_EVT.BGM.CHANGE, (src: any) => {
            const currentBgmVolume = Number(
                localStorage.getItem('bgmVolume') || 20
            );
            const newBgmSrc = `./${src.data}`;
            localStorage.setItem('bgm', newBgmSrc);
            SoundMgr.handle.playBGM(newBgmSrc, currentBgmVolume);
        });
    }

    /* ================= OPEN / CLOSE ================= */

    public open() {
        if (this.isOpen) return;
        this.isOpen = true;

        this.buildUI();
        this.syncOverlay();

        document.body.appendChild(this.htmlElement);

        // ✅ BGM 제목 반짝임 시작
        this.sparkleInterval = window.setInterval(
            () => this.sparkleTitle(),
            2800
        );
    }

    public close() {
        if (!this.isOpen) return;
        this.isOpen = false;

        // ✅ BGM 반짝임 정지
        if (this.sparkleInterval !== null) {
            window.clearInterval(this.sparkleInterval);
            this.sparkleInterval = null;
        }

        if (this.htmlElement.parentNode) {
            this.htmlElement.parentNode.removeChild(this.htmlElement);
        }
    }

    /* ================= UI BUILD ================= */

    public buildUI() {
        this.htmlElement.innerHTML = '';

        const canvas = document.querySelector('canvas') as HTMLCanvasElement;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();

        // ✅ overlay를 Canvas 영역에 정확히 맞춤
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

        // ✅ panel
        this.panel = document.createElement('div');
        const panelWidth = rect.width * 0.4;
        Object.assign(this.panel.style, {
            position: 'relative',
            background:
                'url("./assets/images/option.png") center/cover no-repeat',
            borderRadius: '24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: `${panelWidth}px`,
            height: `${panelWidth}px`, // 정사각형
        });

        // ✅ resize 이벤트
        const resizeHandler = () => {
            const newRect = canvas.getBoundingClientRect();

            // Overlay를 Canvas에 맞춤
            Object.assign(this.overlay.style, {
                left: `${newRect.left}px`,
                top: `${newRect.top}px`,
                width: `${newRect.width}px`,
                height: `${newRect.height}px`,
            });

            // Panel 크기 조정
            const newPanelWidth = newRect.width * 0.4;
            Object.assign(this.panel.style, {
                width: `${newPanelWidth}px`,
                height: `${newPanelWidth}px`,
            });

            // Slider box gap
            if (sliderBox) {
                const panelHeight = this.panel.getBoundingClientRect().height;
                sliderBox.style.gap = `${Math.max(
                    12,
                    Math.min(64, panelHeight * 0.05)
                )}px`;
            }

            // Slider height
            if (this.volumeSlider && this.sfxSlider) {
                const panelHeight = this.panel.getBoundingClientRect().height;
                const newHeight = Math.max(
                    10,
                    Math.min(64, panelHeight * 0.06)
                );
                this.volumeSlider.style.height = `${newHeight}px`;
                this.sfxSlider.style.height = `${newHeight}px`;
            }

            // Thumb size
            if (this.sliderStyle) {
                const thumbSize = Math.max(
                    24,
                    Math.min(64, newPanelWidth * 0.08)
                );
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
                        border: ${Math.round(thumbSize * 0.136)}px solid #fff;
                        border-radius: 50%;
                        cursor: pointer;
                    }
                `;
            }
        };

        window.addEventListener('resize', resizeHandler);

        /* ================= Buttons ================= */

        // Close button
        this.closeBtn = this.createButton(
            { top: '4%', right: '4%', width: '8%' },
            '/assets/images/exit.png',
            () => {
                SoundMgr.handle.playSound('btn');
                this.close();
            }
        );

        // Give up button
        // this.giveupBtn = this.createButton(
        //     { top: '40%', left: '45%', bottom: '40%', width: '35%' },
        //     '/assets/images/bt_giveup_s.png',
        //     () => this.onGiveUp()
        // );

        /* ================= BGM Button (NEW) ================= */
        this.btnBgm = this.createButton(
            { top: '50%', left: '10%', width: '12%' },
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

        /* ================= BGM Title (NEW) ================= */
        this.titleElement = document.createElement('div');
        Object.assign(this.titleElement.style, {
            position: 'absolute',
            top: '50%',
            left: '25%',
            transform: 'translateY(-50%)',
            fontFamily: '"PressStart2P-Regular", monospace',
            fontSize: '10px',
            letterSpacing: '1px',
            textTransform: 'uppercase',
            color: '#F8E6B8',
            background: 'rgba(90, 65, 40, 0.78)',
            padding: '8px 14px',
            borderRadius: '8px',
            textAlign: 'center',
            whiteSpace: 'nowrap',
            transition: 'text-shadow 0.8s ease',
            pointerEvents: 'none',
            boxShadow: `
                0 0 0 2px #7a5a28,
                0 0 0 4px #e6c87a,
                0 0 0 6px #b08a3a,
                inset -2px -2px 3px rgba(0,0,0,0.35)
            `,
        });
        this.titleElement.textContent = BGM_LIST[this.currentBgmIndex].title;

        /* ================= Sliders ================= */

        const sliderBox = document.createElement('div');
        Object.assign(sliderBox.style, {
            position: 'absolute',
            top: '75%',
            left: '66%',
            transform: 'translate(-50%, -50%)',
            width: '40%',
            display: 'flex',
            flexDirection: 'column',
        });

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

        sliderBox.append(this.sfxSlider, this.volumeSlider);

        this.bgmMuteBtn = this.createButton(
            { left: '13%', top: '76%', width: '10%' },
            '/assets/images/sound_on.png',
            () => this.toggleMute('bgm')
        );
        this.sfxMuteBtn = this.createButton(
            { left: '13%', top: '63%', width: '10%' },
            '/assets/images/sound_on.png',
            () => this.toggleMute('sfx')
        );

        // 초기 UI 상태 적용
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

        // ✅ Panel에 모든 요소 추가
        this.panel.append(
            this.closeBtn,
            this.btnBgm, // ✅ BGM 버튼 추가
            this.titleElement, // ✅ BGM 제목 추가
            sliderBox,
            this.bgmMuteBtn,
            this.sfxMuteBtn
        );
        this.overlay.appendChild(this.panel);
        this.htmlElement.appendChild(this.overlay);

        requestAnimationFrame(() => {
            resizeHandler(); // 초기 resize 실행
        });

        this.injectSliderStyle();
    }

    /* ================= BGM 관련 (NEW) ================= */

    private changeNextBGM() {
        this.currentBgmIndex = (this.currentBgmIndex + 1) % BGM_LIST.length;
        const nextBGM = BGM_LIST[this.currentBgmIndex];
        EVT_HUB_SAFE.emit(G_EVT.BGM.CHANGE, nextBGM.src);
        localStorage.setItem('bgmIndex', String(this.currentBgmIndex));
        this.titleElement.textContent = nextBGM.title;
    }

    private sparkleTitle() {
        if (!this.titleElement) return;
        this.titleElement.style.textShadow = `
            0 0 4px rgba(255, 220, 160, 0.45),
            0 0 8px rgba(255, 200, 120, 0.25)
        `;
        setTimeout(() => {
            if (this.titleElement) {
                this.titleElement.style.textShadow = '0 0 1px rgba(0,0,0,0.7)';
            }
        }, 900);
    }

    /* ================= Sync Overlay ================= */

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

    /* ================= HELPERS ================= */

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
            height: '36px',
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
        `;
        document.head.appendChild(this.sliderStyle);
    }

    // private onGiveUp() {
    //     if (confirm('정말 포기하시겠습니까?')) {
    //         console.log('포기');
    //         EVT_HUB_SAFE.emit(G_EVT.PLAY.GAME_OVER, {
    //             finalScore: this.score.getFinalScore(),
    //             mode: 'GIVE_UP',
    //         });
    //         this.close();
    //     }
    // }

    private isMuted(type: 'bgm' | 'sfx') {
        return localStorage.getItem(`${type}Muted`) === 'true';
    }
}
