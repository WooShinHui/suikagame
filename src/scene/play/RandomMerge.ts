import PureDomX from '../../core/PureDomX'; // ✅ 변경
import { G_EVT } from '../../events/EVT_HUB';
import { EVT_HUB_SAFE } from '../../events/SafeEventHub';
import { API_CONNECTOR } from '../../fetch/ApiConnector';
import { UIScale } from '../../ui/UIScale';
import View from './View';

export class RandomMerge extends PureDomX {
    private static instance: RandomMerge | null = null;
    private totalIndex: number = 1;
    private count: number = 1;
    private btnElement!: HTMLButtonElement;

    private readonly IMG_NORMAL = '/assets/images/bt_merge_s.png';
    private readonly IMG_PRESSED = '/assets/images/bt_merge_n.png';

    constructor(private view: View) {
        if (RandomMerge.instance) return RandomMerge.instance;

        // ✅ 순수 div 생성
        const container = document.createElement('div');
        super(container);

        // ✅ 컨테이너 스타일
        Object.assign(this.htmlElement.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: '1000',
            transform: 'none !important', // ✅ 강제
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
                this.count = data.itemCount !== undefined ? data.itemCount : 1;
                this.updateButtonVisual();
            }
        });

        EVT_HUB_SAFE.on(G_EVT.PLAY.MERGE_SUCCESS, () => {
            this.updateButtonVisual();
        });

        EVT_HUB_SAFE.on(G_EVT.PLAY.MERGE_RESET, async () => {
            if (this.count >= this.totalIndex) return;
            const success = await API_CONNECTOR.requestItemReward();
            if (success) {
                this.count++;
                this.updateButtonVisual();
                console.log('🎁 아이템 재충전 완료');
            }
        });

        EVT_HUB_SAFE.on(G_EVT.PLAY.MERGE_FAIL, async () => {
            console.warn('❌ 머지 불가 상태: 아이템 수량을 복구합니다.');
            const success = await API_CONNECTOR.refundGiftItem();
            if (success) {
                this.count = Math.min(this.totalIndex, this.count + 1);
                this.updateButtonVisual();
            }
        });

        window.addEventListener('resize', () => this.applyResize());
        RandomMerge.instance = this;
    }

    public reset(totalIndex: number = 1) {
        this.totalIndex = totalIndex;
        this.count = 1;
        this.updateButtonVisual();
    }

    private updateButtonVisual() {
        if (this.btnElement) {
            this.btnElement.style.opacity = this.count > 0 ? '1' : '0.5';
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
            transform: 'scale(1)', // ✅ 초기값
        });
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
    }

    private clickEvent() {
        this.btnElement.onclick = async () => {
            if (this.count <= 0) return;

            const isAllowed = await API_CONNECTOR.useGiftItem();

            if (isAllowed) {
                this.count = Math.max(0, this.count - 1);
                this.updateButtonVisual();
                EVT_HUB_SAFE.emit(G_EVT.PLAY.MERGE_REQUEST);
            } else {
                alert('아이템을 사용할 수 없습니다.');
                this.updateButtonVisual();
            }
        };
    }

    private applyResize() {
        // ✅ 비율 기반 크기
        const size = UIScale.getResponsiveSize(100, 80, 60);

        // ✅ 비율 기반 마진
        const marginX = UIScale.getResponsiveMargin(40);
        const marginY = UIScale.getResponsiveMargin(80);

        console.log('[RandomMerge]', { size, marginX, marginY });

        UIScale.layoutElementViewport(
            this.btnElement,
            'right',
            'bottom',
            marginX,
            marginY,
            size,
            size
        );
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
