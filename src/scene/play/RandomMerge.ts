import PureDomX from '../../core/PureDomX';
import { G_EVT } from '../../events/EVT_HUB';
import { EVT_HUB_SAFE } from '../../events/SafeEventHub';
import { API_CONNECTOR } from '../../fetch/ApiConnector';
import { UIScale } from '../../ui/UIScale';
import View from './View';

export class RandomMerge extends PureDomX {
    private static instance: RandomMerge | null = null;
    private count: number = 0;
    private readonly MAX_ITEM_COUNT = 1; // ✅ 최대 개수 제한
    private btnElement!: HTMLButtonElement;
    private countDisplay!: HTMLDivElement;

    private readonly IMG_NORMAL = '/assets/images/bt_merge_s.png';
    private readonly IMG_PRESSED = '/assets/images/bt_merge_n.png';

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

        // ✅ 머지 성공 후 Firebase 동기화
        EVT_HUB_SAFE.on(G_EVT.PLAY.MERGE_SUCCESS, async () => {
            await this.syncItemCount();
        });

        // ✅ 리셋 시 아이템 재충전 (최대 개수 제한)
        EVT_HUB_SAFE.on(G_EVT.PLAY.MERGE_RESET, async () => {
            // 이미 최대 개수면 보상 안줌
            if (this.count >= this.MAX_ITEM_COUNT) {
                console.log('⚠️ 아이템이 이미 최대 개수입니다:', this.count);
                return;
            }

            const success = await API_CONNECTOR.requestItemReward();
            if (success) {
                await this.syncItemCount();
                // ✅ 최대 개수 초과 방지
                if (this.count > this.MAX_ITEM_COUNT) {
                    this.count = this.MAX_ITEM_COUNT;
                    this.updateButtonVisual();
                }
                console.log('🎁 아이템 재충전 완료:', this.count);
            }
        });

        // ✅ 머지 실패 시 아이템 환불
        EVT_HUB_SAFE.on(G_EVT.PLAY.MERGE_FAIL, async () => {
            console.warn('❌ 머지 불가: 아이템 환불');
            const success = await API_CONNECTOR.refundGiftItem();
            if (success) {
                await this.syncItemCount();
                // ✅ 최대 개수 초과 방지
                if (this.count > this.MAX_ITEM_COUNT) {
                    this.count = this.MAX_ITEM_COUNT;
                    this.updateButtonVisual();
                }
            }
        });

        window.addEventListener('resize', () => this.applyResize());
        RandomMerge.instance = this;
    }

    // ✅ Firebase에서 현재 아이템 개수 가져오기 (최대 개수 제한)
    private async syncItemCount() {
        try {
            const itemCount = await API_CONNECTOR.getItemCount();
            if (itemCount !== null) {
                this.count = Math.min(itemCount, this.MAX_ITEM_COUNT);
                this.updateButtonVisual();
                console.log('🔄 아이템 동기화:', this.count);
            }
        } catch (error) {
            console.error('❌ 아이템 동기화 실패:', error);
        }
    }

    // ✅ 게임 리셋
    public async reset() {
        await this.syncItemCount();
    }

    private updateButtonVisual() {
        if (this.btnElement) {
            this.btnElement.style.opacity = this.count > 0 ? '1' : '0.5';
            this.btnElement.style.cursor =
                this.count > 0 ? 'pointer' : 'not-allowed';
        }

        // ✅ 개수 표시 업데이트
        if (this.countDisplay) {
            this.countDisplay.textContent = `${this.count}`;
            this.countDisplay.style.display = this.count > 0 ? 'flex' : 'none';
        }
    }

    private create() {
        // ✅ 버튼 생성
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

        // ✅ 아이템 개수 표시 배지
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

        // ✅ 버튼 이벤트
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
        this.btnElement.onclick = async () => {
            if (this.count <= 0) {
                console.log('⚠️ 아이템이 없습니다');
                return;
            }

            // ✅ Firebase에서 아이템 사용
            const isAllowed = await API_CONNECTOR.useGiftItem();

            if (isAllowed) {
                // ✅ 즉시 UI 업데이트 (낙관적 업데이트)
                this.count = Math.max(0, this.count - 1);
                this.updateButtonVisual();

                // ✅ 머지 요청
                EVT_HUB_SAFE.emit(G_EVT.PLAY.MERGE_REQUEST);

                // ✅ Firebase와 동기화
                await this.syncItemCount();
            } else {
                alert('아이템을 사용할 수 없습니다.');
            }
        };
    }

    private applyResize() {
        const size = UIScale.getResponsiveSize(60, 50, 70);
        const marginX = UIScale.getResponsiveMargin(40);
        const marginY = UIScale.getResponsiveMargin(80);

        UIScale.layoutElementViewport(
            this.btnElement,
            'right',
            'bottom',
            marginX,
            marginY,
            size,
            size
        );

        // ✅ 배지 크기 조정
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
