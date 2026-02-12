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

export class RandomMerge extends PureDomX {
    private static instance: RandomMerge | null = null;
    private count: number = 0;
    private readonly MAX_ITEM_COUNT = 1;
    private btnElement!: HTMLButtonElement;
    private countDisplay!: HTMLDivElement;

    private readonly IMG_NORMAL = './assets/images/Random_Merge_s.png';
    private readonly IMG_PRESSED = './assets/images/Random_Merge_n.png';

    constructor(private view: View) {
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

        // 1. 기준 비율 및 현재 비율 계산
        const targetRatio = 9 / 16;
        const currentRatio = sw / sh;

        // ✅ 가로가 좁아지면 반응하는 비율
        const ratioScale =
            currentRatio < targetRatio ? currentRatio / targetRatio : 1;
        const sizeScale = Math.max(0.5, ratioScale);

        // 2. 캔버스 렌더링 영역 및 오프셋 계산
        const canvasRenderWidth = CANVAS_ORIGINAL_WIDTH * scale;
        const canvasRenderHeight = CANVAS_ORIGINAL_HEIGHT * scale;
        const canvasTop = (sh - canvasRenderHeight) / 2; // 캔버스의 실제 상단 시작점

        // 3. 버튼 크기 계산 (271x172 비율)
        const imgAspectRatio = 172 / 271;
        const baseWidth = 200;
        const buttonWidth = baseWidth * scale * sizeScale;
        const buttonHeight = buttonWidth * imgAspectRatio;

        // 4. 좌표 계산
        const canvasX = 60;
        const canvasY = 220;

        // ✅ 가로(X): 화면 중앙 기준에서 ratioScale에 따라 수평 이동
        const distanceFromCenter =
            (CANVAS_ORIGINAL_WIDTH / 2 - canvasX) * scale * ratioScale;
        let screenX = sw / 2 - distanceFromCenter;

        // ✅ 세로(Y): ratioScale을 제거하여 위아래 이동을 막고 위치 고정
        let screenY = canvasTop + canvasY * scale;

        // 5. 가시 영역(화면 끝) 경계값 보정
        const margin = 15;
        const leftLimit = margin;
        const rightLimit = sw - buttonWidth - margin;

        if (screenX < leftLimit) {
            screenX = leftLimit;
        }
        if (screenX > rightLimit) {
            screenX = rightLimit;
        }

        // 6. DOM 스타일 적용
        Object.assign(this.btnElement.style, {
            left: `${screenX}px`,
            top: `${screenY}px`,
            width: `${buttonWidth}px`,
            height: `${buttonHeight}px`,
            position: 'absolute',
        });

        // 7. 카운트 뱃지 조정
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
