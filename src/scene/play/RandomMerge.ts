import PureDomX from '../../core/PureDomX';
import { G_EVT } from '../../events/EVT_HUB';
import { EVT_HUB_SAFE } from '../../events/SafeEventHub';
import { API_CONNECTOR } from '../../fetch/ApiConnector';
import { UIScale } from '../../ui/UIScale';
import View from './View';

export class RandomMerge extends PureDomX {
    private static instance: RandomMerge | null = null;
    private count: number = 0;
    private readonly MAX_ITEM_COUNT = 1;
    private btnElement!: HTMLButtonElement;
    private countDisplay!: HTMLDivElement;

    private readonly IMG_NORMAL = './assets/images/bt_merge_s.png';
    private readonly IMG_PRESSED = './assets/images/bt_merge_n.png';

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

        // ✅ Firebase 세션에서 아이템 개수 받기
        EVT_HUB_SAFE.on(G_EVT.PLAY.SESSION_STARTED, (event: any) => {
            const data = event.data;
            if (data.isServerVerified) {
                this.count = Math.min(data.itemCount || 0, this.MAX_ITEM_COUNT);
                this.updateButtonVisual();
                console.log('🎮 아이템 초기화:', this.count);
            }
        });

        // ❌ 제거: MERGE_SUCCESS 시 동기화 (불필요)

        // ✅ 리셋 시 아이템 재충전
        EVT_HUB_SAFE.on(G_EVT.PLAY.MERGE_RESET, async () => {
            if (this.count >= this.MAX_ITEM_COUNT) {
                console.log('⚠️ 아이템이 이미 최대 개수입니다:', this.count);
                return;
            }

            // 🚀 즉시 UI 업데이트
            this.count = Math.min(this.count + 1, this.MAX_ITEM_COUNT);
            this.updateButtonVisual();
            console.log('🎁 아이템 재충전:', this.count);

            // 📡 Firebase는 백그라운드 처리
            API_CONNECTOR.requestItemReward();
        });

        // ✅ 머지 실패 시 아이템 환불
        EVT_HUB_SAFE.on(G_EVT.PLAY.MERGE_FAIL, () => {
            console.warn('❌ 머지 실패: 아이템 환불');

            // 🚀 즉시 UI 복구
            this.count = Math.min(this.count + 1, this.MAX_ITEM_COUNT);
            this.updateButtonVisual();

            // 📡 Firebase는 백그라운드 처리
            API_CONNECTOR.refundGiftItem();
        });

        window.addEventListener('resize', () => this.applyResize());
        RandomMerge.instance = this;
    }

    // ✅ 게임 시작/리셋 시에만 동기화
    public async reset() {
        const itemCount = await API_CONNECTOR.getItemCount();
        if (itemCount !== null) {
            this.count = Math.min(itemCount, this.MAX_ITEM_COUNT);
            this.updateButtonVisual();
            console.log('🔄 아이템 초기화:', this.count);
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
            zIndex: '1000',
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
            zIndex: '1001',
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
                console.log('⚠️ 아이템이 없습니다');
                return;
            }

            // 🚀 1️⃣ 즉시 로컬 차감 + 머지 실행 (0ms 지연)
            this.count = Math.max(0, this.count - 1);
            this.updateButtonVisual();
            EVT_HUB_SAFE.emit(G_EVT.PLAY.MERGE_REQUEST);
            console.log('✨ 머지 실행 (낙관적 업데이트)');

            // 📡 2️⃣ Firebase는 백그라운드 처리 (결과를 기다리지 않음)
            API_CONNECTOR.useGiftItem()
                .then((success) => {
                    if (!success) {
                        // 실패 시 롤백
                        console.error('❌ Firebase 아이템 사용 실패 - 롤백');
                        this.count = Math.min(
                            this.count + 1,
                            this.MAX_ITEM_COUNT
                        );
                        this.updateButtonVisual();

                        // 머지 취소 이벤트 (필요 시)
                        // EVT_HUB_SAFE.emit(G_EVT.PLAY.MERGE_CANCEL);
                    } else {
                        console.log('✅ Firebase 아이템 차감 완료');
                    }
                })
                .catch((error) => {
                    console.error('❌ Firebase 오류:', error);
                    // 네트워크 오류 시에도 롤백
                    this.count = Math.min(this.count + 1, this.MAX_ITEM_COUNT);
                    this.updateButtonVisual();
                });
        };
    }

    private applyResize() {
        const size = UIScale.getResponsiveSize(80, 50, 70);
        const marginX = UIScale.getResponsiveMargin(20);
        const marginY = UIScale.getResponsiveMargin(120);

        UIScale.layoutElementViewport(
            this.btnElement,
            'left',
            'top',
            marginX,
            marginY,
            size,
            size
        );

        const badgeSize = size * 0.25;
        this.countDisplay.style.width = `${badgeSize}px`;
        this.countDisplay.style.height = `${badgeSize}px`;
        this.countDisplay.style.fontSize = `${badgeSize * 0.5}px`;
        this.countDisplay.style.top = `${-badgeSize * 0.3}px`;
        this.countDisplay.style.right = `${-badgeSize * 0.3}px`;
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
