// src/scenes/play/RandomMerge.ts
import PureDomX from '../../core/PureDomX';
import { G_EVT } from '../../events/EVT_HUB';
import { EVT_HUB_SAFE } from '../../events/SafeEventHub';
import { API_CONNECTOR } from '../../fetch/ApiConnector';
import {
    UIScale,
    CANVAS_ORIGINAL_WIDTH,
    CANVAS_ORIGINAL_HEIGHT,
} from '../../ui/UIScale';
import View from './View';
import { OptionBtn } from '../options/OptionBtn';

export class RandomMerge extends PureDomX {
    private optionBtn: OptionBtn | null = null;
    private readonly BUTTON_GAP = 16;

    private static instance: RandomMerge | null = null;
    private count: number = 0;
    private readonly MAX_ITEM_COUNT = 1;
    private btnElement!: HTMLButtonElement;
    private countDisplay!: HTMLDivElement;

    private readonly IMG_NORMAL = './assets/images/Random_Merge_s.png';
    private readonly IMG_PRESSED = './assets/images/Random_Merge_n.png';

    constructor(private view: View, optionBtn?: OptionBtn) {
        if (RandomMerge.instance) return RandomMerge.instance;

        const container = document.createElement('div');
        super(container);

        Object.assign(this.htmlElement.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: '1000',
            transform: 'none !important',
        });

        this.create();
        this.clickEvent();
        this.applyResize();

        const canvas = document.querySelector('canvas');
        const parent = canvas?.parentElement || document.body;
        parent.appendChild(this.htmlElement);

        EVT_HUB_SAFE.on(G_EVT.PLAY.SESSION_STARTED, (event: any) => {
            const data = event.data;
            if (data.isServerVerified) {
                this.count = Math.min(data.itemCount || 0, this.MAX_ITEM_COUNT);
                this.updateButtonVisual();
            }
        });

        EVT_HUB_SAFE.on(G_EVT.PLAY.MERGE_RESET, async () => {
            if (this.count >= this.MAX_ITEM_COUNT) {
                return;
            }
            this.count = Math.min(this.count + 1, this.MAX_ITEM_COUNT);
            this.updateButtonVisual();
            API_CONNECTOR.requestItemReward();
        });

        EVT_HUB_SAFE.on(G_EVT.PLAY.MERGE_FAIL, () => {
            this.count = Math.min(this.count + 1, this.MAX_ITEM_COUNT);
            this.updateButtonVisual();
            API_CONNECTOR.refundGiftItem();
        });

        window.addEventListener('resize', () => this.applyResize());
        RandomMerge.instance = this;
        this.optionBtn = optionBtn || null;
    }

    public async reset() {
        const itemCount = await API_CONNECTOR.getItemCount();
        if (itemCount !== null) {
            this.count = Math.min(itemCount, this.MAX_ITEM_COUNT);
            this.updateButtonVisual();
        }
    }

    private updateButtonVisual() {
        if (this.btnElement) {
            this.btnElement.style.opacity = this.count > 0 ? '1' : '0.5';
            this.btnElement.style.cursor =
                this.count > 0 ? 'pointer' : 'not-allowed';
        }

        if (this.countDisplay) {
            this.countDisplay.textContent = `${this.count}`;
            this.countDisplay.style.display = this.count > 0 ? 'flex' : 'none';
        }
    }

    private create() {
        this.btnElement = document.createElement('button');
        Object.assign(this.btnElement.style, {
            position: 'absolute',
            background: 'none',
            border: 'none',
            backgroundImage: `url("${this.IMG_NORMAL}")`,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            cursor: 'pointer',
            userSelect: 'none',
            pointerEvents: 'auto',
            zIndex: '100',
            transform: 'scale(1)',
        });

        this.countDisplay = document.createElement('div');
        Object.assign(this.countDisplay.style, {
            position: 'absolute',
            top: '-8px',
            right: '-8px',
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #ff6b6b, #ff3838)',
            color: 'white',
            fontSize: '14px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(255, 59, 48, 0.4)',
            border: '2px solid white',
            pointerEvents: 'none',
            zIndex: '101',
        });
        this.countDisplay.textContent = '0';

        this.btnElement.addEventListener('pointerdown', () => {
            if (this.count <= 0) return;
            this.btnElement.style.backgroundImage = `url("${this.IMG_PRESSED}")`;
            this.btnElement.style.transform = 'scale(0.95)';
        });

        const release = () => {
            this.btnElement.style.backgroundImage = `url("${this.IMG_NORMAL}")`;
            this.btnElement.style.transform = 'scale(1)';
        };

        this.btnElement.addEventListener('pointerup', release);
        this.btnElement.addEventListener('pointerleave', release);
        this.btnElement.addEventListener('pointercancel', release);

        this.htmlElement.appendChild(this.btnElement);
        this.btnElement.appendChild(this.countDisplay);
    }

    private clickEvent() {
        this.btnElement.onclick = () => {
            if (this.count <= 0) {
                return;
            }

            this.count = Math.max(0, this.count - 1);
            this.updateButtonVisual();
            EVT_HUB_SAFE.emit(G_EVT.PLAY.MERGE_REQUEST);

            API_CONNECTOR.useGiftItem()
                .then((success) => {
                    if (!success) {
                        this.count = Math.min(
                            this.count + 1,
                            this.MAX_ITEM_COUNT
                        );
                        this.updateButtonVisual();
                    }
                })
                .catch((error) => {
                    console.error('❌ Firebase 오류:', error);
                    this.count = Math.min(this.count + 1, this.MAX_ITEM_COUNT);
                    this.updateButtonVisual();
                });
        };
    }

    private applyResize() {
        UIScale.update();
        const sw = window.innerWidth;
        const sh = window.innerHeight;
        const scale = UIScale.scale;

        const imgAspectRatio = 172 / 271;

        const uiScale = UIScale.uiScale; // ✅ 추가
        const buttonWidth = 200 * scale * uiScale;
        const buttonHeight = buttonWidth * imgAspectRatio;

        const logicalWidth = UIScale.logicalWidth;
        const canvasLeft = (sw - logicalWidth * scale) / 2;

        const VERTICAL_GAP = 18; // ✅ 옵션/랭킹 버튼 하단과의 간격 (px)

        let screenX: number;
        let screenY: number;

        if (this.optionBtn) {
            (this.optionBtn as any).applyResize?.();
            // X는 옵션버튼 왼쪽에 맞춤
            screenX = canvasLeft + 30 * scale;
            // ✅ Y는 옵션버튼 하단 + 고정 gap
            screenY =
                this.optionBtn.getButtonTop() +
                parseFloat(this.optionBtn['btn'].style.height) +
                VERTICAL_GAP;
        } else {
            const canvasTop = (sh - CANVAS_ORIGINAL_HEIGHT * scale) / 2;
            screenX = canvasLeft + 30 * scale;
            screenY = canvasTop + 140 * scale;
        }

        Object.assign(this.btnElement.style, {
            left: `${screenX}px`,
            top: `${screenY}px`,
            width: `${buttonWidth}px`,
            height: `${buttonHeight}px`,
        });

        Object.assign(this.btnElement.style, {
            left: `${screenX}px`,
            top: `${screenY}px`,
            width: `${buttonWidth}px`,
            height: `${buttonHeight}px`,
        });

        const badgeSize = Math.min(buttonWidth, buttonHeight) * 0.35;
        Object.assign(this.countDisplay.style, {
            width: `${badgeSize}px`,
            height: `${badgeSize}px`,
            fontSize: `${badgeSize * 0.5}px`,
            top: `${-badgeSize * 0.25}px`,
            right: `${-badgeSize * 0.25}px`,
            border: `${Math.max(2, badgeSize * 0.08)}px solid white`,
        });
    }

    public static getInstance(view?: View) {
        if (!RandomMerge.instance) {
            if (!view)
                throw new Error('View is required for first instantiation');
            new RandomMerge(view);
        }
        return RandomMerge.instance!;
    }
}
