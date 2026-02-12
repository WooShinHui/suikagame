// src/scene/options/RankingBtn.ts
import { EVT_HUB_SAFE } from '../../events/SafeEventHub';
import { G_EVT } from '../../events/EVT_HUB';
import PureDomX from '../../core/PureDomX';
import { SoundMgr } from '../../manager/SoundMgr';
import { UIScale } from '../../ui/UIScale';
import type { OptionBtn } from './OptionBtn';

export class RankingBtn extends PureDomX {
    private btn!: HTMLButtonElement;
    private currentUserId: string | null = null;
    private optionBtn: OptionBtn | null = null;

    private readonly IMG_NORMAL = './assets/images/btn_ranking_s.png';
    private readonly IMG_PRESSED = './assets/images/btn_ranking_n.png';

    // ✅ 9:16 비율에서의 고정 간격 (화면 픽셀)
    private readonly BUTTON_GAP = 10;

    constructor(optionBtn?: OptionBtn) {
        const container = document.createElement('div');
        super(container);

        this.optionBtn = optionBtn || null;

        Object.assign(this.htmlElement.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: '100',
            transform: 'none !important',
        });

        this.create();

        const canvas = document.querySelector('canvas');
        const parent = canvas?.parentElement || document.body;
        parent.appendChild(this.htmlElement);

        EVT_HUB_SAFE.on(G_EVT.PLAY.SESSION_STARTED, (event: any) => {
            const data = event.data || {};
            this.currentUserId = data.userId;
        });

        this.applyResize();
        window.addEventListener('resize', () => this.applyResize());
    }

    private create() {
        this.btn = document.createElement('button');

        Object.assign(this.btn.style, {
            position: 'absolute',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0',
            pointerEvents: 'auto',
            zIndex: '1002',
            backgroundImage: `url("${this.IMG_NORMAL}")`,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            transition: 'transform 0.15s ease',
        });

        this.btn.addEventListener('click', () => {
            SoundMgr.handle.playSound('btn');
            EVT_HUB_SAFE.emit(G_EVT.PLAY.SHOW_RESULT, {
                mode: 'START',
                userId: this.currentUserId || 'guest',
            });
        });

        this.btn.addEventListener('pointerdown', () => {
            this.btn.style.backgroundImage = `url("${this.IMG_PRESSED}")`;
            this.btn.style.transform = 'scale(0.95)';
        });

        const release = () => {
            this.btn.style.backgroundImage = `url("${this.IMG_NORMAL}")`;
            this.btn.style.transform = 'scale(1)';
        };

        this.btn.addEventListener('pointerup', release);
        this.btn.addEventListener('pointerleave', release);
        this.btn.addEventListener('pointercancel', release);

        this.htmlElement.appendChild(this.btn);
    }

    private applyResize() {
        UIScale.update();

        const sw = window.innerWidth;
        const sh = window.innerHeight;
        const scale = UIScale.scale;

        const buttonSize = 100 * scale;

        // ✅ OptionBtn 기준으로 상대 배치
        let screenX: number;
        let screenY: number;

        if (this.optionBtn) {
            // OptionBtn의 오른쪽 끝 + 고정 간격
            const gapScaled = this.BUTTON_GAP * scale;
            screenX = this.optionBtn.getButtonRight() + gapScaled;
            screenY = this.optionBtn.getButtonTop();
        } else {
            // OptionBtn이 없으면 절대 배치 (fallback)
            const canvasRenderWidth = 900 * scale;
            const canvasLeft = (sw - canvasRenderWidth) / 2;
            const canvasTop = 0;
            const canvasX = 130;
            const canvasY = 20;

            screenX = canvasLeft + canvasX * scale;
            screenY = canvasTop + canvasY * scale;

            // 화면 비율 체크
            const aspectRatio = sw / sh;
            const targetAspectRatio = 9 / 16;

            if (aspectRatio < targetAspectRatio) {
                const canvasVisibleLeft = Math.max(0, canvasLeft);
                const canvasVisibleRight = Math.min(
                    sw,
                    canvasLeft + canvasRenderWidth
                );
                const margin = 10;

                if (screenX < canvasVisibleLeft) {
                    screenX = canvasVisibleLeft + margin;
                }

                if (screenX + buttonSize > canvasVisibleRight) {
                    screenX = canvasVisibleRight - buttonSize - margin;
                }
            }
        }

        this.btn.style.left = `${screenX}px`;
        this.btn.style.top = `${screenY}px`;
        this.btn.style.width = `${buttonSize}px`;
        this.btn.style.height = `${buttonSize}px`;
    }
}
