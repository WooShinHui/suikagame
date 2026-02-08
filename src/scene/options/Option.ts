import DomX from '../../core/DomX';
import { SoundMgr } from '../../manager/SoundMgr';
import { Score } from '../play/Score';
import { EVT_HUB_SAFE } from '../../events/SafeEventHub';
import { G_EVT } from '../../events/EVT_HUB';

export class Option extends DomX {
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
    private syncOverlay!: () => void;

    constructor(private score: Score) {
        super(document.createElement('div'));

        const canvas = document.querySelector('canvas') as HTMLCanvasElement;
        if (!canvas) return;

        this.syncOverlay = () => {
            const rect = canvas.getBoundingClientRect();
            Object.assign(this.htmlElement.style, {
                position: 'fixed',
                left: `${rect.left}px`,
                top: `${rect.top}px`,
                width: `${rect.width}px`,
                height: `${rect.height}px`,
                zIndex: '999',
                pointerEvents: 'auto',
            });
        };
        const resizeOptionOverlay = () => {
            const rect = canvas.getBoundingClientRect();
            Object.assign(this.htmlElement.style, {
                position: 'fixed',
                left: `${rect.left}px`,
                top: `${rect.top}px`,
                width: `${rect.width}px`,
                height: `${rect.height}px`,
                zIndex: '999',
            });
        };

        // 로컬스토리지 값 가져오기
        const savedBGM = localStorage.getItem('bgmVolume');
        const savedSFX = localStorage.getItem('sfxVolume');
        const savedBgmSrc = localStorage.getItem('bgm');
        const savedBgmMuted = localStorage.getItem('bgmMuted') === 'true';

        const bgmVolume = savedBGM !== null ? Number(savedBGM) : 20;
        const sfxVolume = savedSFX !== null ? Number(savedSFX) : 50;
        const bgmSrc = savedBgmSrc || '/assets/sounds/bgm.mp3';

        // SoundMgr에 적용
        SoundMgr.handle.bgmVolume = savedBgmMuted ? 0 : bgmVolume / 100;
        SoundMgr.handle.sfxVolume = sfxVolume / 100;

        // BGM 재생
        SoundMgr.handle.playBGM(bgmSrc, bgmVolume);

        EVT_HUB_SAFE.on(G_EVT.BGM.CHANGE, (src: any) => {
            const currentBgmVolume = Number(
                localStorage.getItem('bgmVolume') || 20
            );
            const newBgmSrc = `/${src.data}`;
            localStorage.setItem('bgm', newBgmSrc);
            SoundMgr.handle.playBGM(newBgmSrc, currentBgmVolume);
        });
        window.addEventListener('resize', resizeOptionOverlay);
        resizeOptionOverlay(); // 초기 실행
    }

    /* ================= OPEN / CLOSE ================= */

    public open() {
        if (this.isOpen) return;
        this.isOpen = true;

        this.buildUI();
        this.syncOverlay();

        document.body.appendChild(this.htmlElement);
        window.addEventListener('resize', this.syncOverlay);
    }

    private close() {
        if (!this.isOpen) return;
        this.isOpen = false;

        window.removeEventListener('resize', this.syncOverlay);

        if (this.htmlElement.parentNode) {
            this.htmlElement.parentNode.removeChild(this.htmlElement);
        }
    }

    /* ================= UI BUILD ================= */

    public buildUI() {
        this.htmlElement.innerHTML = '';

        /* overlay */
        this.overlay = document.createElement('div');
        Object.assign(this.overlay.style, {
            width: '100%',
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.5)',
        });

        /* panel */
        this.panel = document.createElement('div');
        Object.assign(this.panel.style, {
            position: 'relative',
            background:
                'url("/assets/images/option.png") center/cover no-repeat',
            borderRadius: '24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
        });

        // resize 이벤트: overlay + panel
        const resizeOverlayAndPanel = () => {
            const canvas = document.querySelector(
                'canvas'
            ) as HTMLCanvasElement;
            const rect = canvas.getBoundingClientRect();

            // overlay 크기 캔버스에 맞춤
            Object.assign(this.overlay.style, {
                left: `${rect.left}px`,
                top: `${rect.top}px`,
                width: `${rect.width}px`,
                height: `${rect.height}px`,
            });

            // panel은 overlay 대비 60%로 픽셀 계산
            const panelWidth = rect.width * 0.4;
            Object.assign(this.panel.style, {
                width: `${panelWidth}px`,
                height: `${panelWidth}px`, // 정사각형 유지
            });
        };

        window.addEventListener('resize', resizeOverlayAndPanel);
        resizeOverlayAndPanel(); // 초기 실
        /* close */
        this.closeBtn = this.createButton(
            { top: '4%', right: '4%', width: '8%' },
            '/assets/images/exit.png',
            () => {
                SoundMgr.handle.playSound('btn');
                this.close();
            }
        );

        /* give up */
        this.giveupBtn = this.createButton(
            { top: '40%', left: '45%', bottom: '40%', width: '35%' },
            '/assets/images/bt_giveup_s.png',
            () => this.onGiveUp()
        );

        /* sliders */
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

        // panel 크기에 따라 gap 설정
        const resizeSliderBox = () => {
            const panelHeight = this.panel.getBoundingClientRect().height;
            sliderBox.style.gap = `${Math.max(
                12,
                Math.min(64, panelHeight * 0.05)
            )}px`;
        };

        // 초기 적용
        resizeSliderBox();

        // resize 이벤트에 연결
        window.addEventListener('resize', resizeSliderBox);

        this.volumeSlider = this.createSlider(
            Number(localStorage.getItem('bgmVolume') ?? 20),
            (v) => {
                localStorage.setItem('bgmVolume', String(v));
                const muted = this.isMuted('bgm');

                // 볼륨 적용
                SoundMgr.handle.bgmVolume = muted ? 0 : v / 100;

                // 스타일 업데이트
                this.updateSliderStyle(this.volumeSlider, v, muted);

                // 아이콘: 음소거 상태 또는 0일 때 off
                this.bgmMuteBtn.style.backgroundImage =
                    muted || v === 0
                        ? 'url("/assets/images/sound_off.png")'
                        : 'url("/assets/images/sound_on.png")';
            }
        );

        // SFX 슬라이더
        this.sfxSlider = this.createSlider(
            Number(localStorage.getItem('sfxVolume') ?? 50),
            (v) => {
                localStorage.setItem('sfxVolume', String(v));
                const muted = this.isMuted('sfx');

                // 볼륨 적용
                SoundMgr.handle.sfxVolume = muted ? 0 : v / 100;

                // 스타일 업데이트
                this.updateSliderStyle(this.sfxSlider, v, muted);

                // 아이콘: 음소거 상태 또는 0일 때 off
                this.sfxMuteBtn.style.backgroundImage =
                    muted || v === 0
                        ? 'url("/assets/images/sound_off.png")'
                        : 'url("/assets/images/sound_on.png")';
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

        // → 바로 로컬스토리지 값 기반으로 UI 업데이트
        const savedBgmMuted = localStorage.getItem('bgmMuted') === 'true';
        const savedSfxMuted = localStorage.getItem('sfxMuted') === 'true';
        this.updateMuteIcon(this.bgmMuteBtn, savedBgmMuted);
        this.updateMuteIcon(this.sfxMuteBtn, savedSfxMuted);

        // 슬라이더 초기화도 동일하게 적용
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
            sliderBox,
            this.giveupBtn,
            this.bgmMuteBtn,
            this.sfxMuteBtn
        );
        this.overlay.appendChild(this.panel);
        this.htmlElement.appendChild(this.overlay);
        requestAnimationFrame(() => {
            const panelWidth = this.panel.getBoundingClientRect().width;
            const thumbSize = Math.max(24, Math.min(64, panelWidth * 0.08));
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

            // sliderBox gap resize
            const panelHeight = this.panel.getBoundingClientRect().height;
            sliderBox.style.gap = `${Math.max(
                12,
                Math.min(64, panelHeight * 0.05)
            )}px`;

            // slider input height
            const newHeight = Math.max(10, Math.min(64, panelHeight * 0.06));
            this.volumeSlider.style.height = `${newHeight}px`;
            this.sfxSlider.style.height = `${newHeight}px`;
        });

        this.injectSliderStyle();
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

    private createSlider(
        value: number,
        onChange: (v: number) => void,
        muteBtn?: HTMLButtonElement
    ) {
        const input = document.createElement('input');
        input.type = 'range';
        input.min = '0';
        input.max = '100';
        input.value = String(value);
        Object.assign(input.style, {
            width: '100%',
            height: '36px', // 초기값, 나중에 resize에서 바꿀 예정
        });

        const resizeHeight = () => {
            if (!this.panel) return;
            const panelHeight = this.panel.getBoundingClientRect().height;
            const newHeight = Math.max(10, Math.min(64, panelHeight * 0.06));
            input.style.height = `${newHeight}px`;
        };

        window.addEventListener('resize', resizeHeight);
        resizeHeight(); // 초기 적용

        input.oninput = (e) => {
            const val = Number((e.target as HTMLInputElement).value);
            this.updateSliderStyle(input, val); // 배경 스타일만 업데이트

            // 음소거 아이콘 처리
            if (muteBtn) {
                muteBtn.style.backgroundImage =
                    val === 0
                        ? 'url("/assets/images/sound_off.png")'
                        : 'url("/assets/images/sound_on.png")';
            }

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
            // 완전히 회색으로 덮는 대신, 투명도만 줄여서 흐리게
            slider.style.opacity = '0.5'; // 0.4~0.6 정도 적당
            slider.style.pointerEvents = 'none';
        } else {
            slider.style.opacity = '1';
            slider.style.pointerEvents = 'auto';
            // 배경 다시 업데이트 (슬라이더 값 기준)
            const val = Number(slider.value);
            this.updateSliderStyle(slider, val);
        }
    }

    private updateMuteIcon(btn: HTMLButtonElement, muted: boolean) {
        btn.style.backgroundImage = muted
            ? 'url("/assets/images/sound_off.png")'
            : 'url("/assets/images/sound_on.png")';
    }
    private updateSliderStyle(
        input: HTMLInputElement,
        val: number,
        muted = false
    ) {
        const isZero = val === 0;
        if (muted) {
            input.style.opacity = '0.4';
            return;
        }

        const min = Number(input.min);
        const max = Number(input.max);
        let percent = ((val - min) / (max - min)) * 100;
        percent = ((val - min) / (max - min)) * 100;
        percent = percent * 0.92 + 4; // 0~100% 범위를 thumb 중심에 맞춰 약간 보정
        input.style.background = `linear-gradient(
            90deg,
            rgb(92,83,216) ${percent}%,
            #e2e2e2 ${percent}%
        )`;
        input.style.opacity = '1';
        const btn =
            input.dataset.muteBtn &&
            (document.querySelector(
                input.dataset.muteBtn
            ) as HTMLButtonElement);
        if (btn) {
            btn.style.backgroundImage = isZero
                ? 'url("/assets/images/sound_off.png")'
                : 'url("/assets/images/sound_on.png")';
        }
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

        // panel 크기에 맞춰 thumb 사이즈 조정
        const resizeThumb = () => {
            if (!this.panel) return; // panel 없으면 바로 return
            const panelWidth = this.panel.getBoundingClientRect().width;
            const thumbSize = Math.max(24, Math.min(64, panelWidth * 0.08)); // panel 대비 8% 크기
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
        };

        // 초기 적용
        resizeThumb();

        // resize 이벤트에 연결
        window.addEventListener('resize', resizeThumb);
    }

    private onGiveUp() {
        if (confirm('정말 포기하시겠습니까?')) {
            console.log('포기');
            EVT_HUB_SAFE.emit(G_EVT.PLAY.GAME_OVER, {
                finalScore: this.score.getFinalScore(),
            });
            this.close();
        }
    }

    private isMuted(type: 'bgm' | 'sfx') {
        return localStorage.getItem(`${type}Muted`) === 'true';
    }
}
