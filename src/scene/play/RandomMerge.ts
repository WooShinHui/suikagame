import DomX from '../../core/DomX';
import { G_EVT } from '../../events/EVT_HUB';
import { EVT_HUB_SAFE } from '../../events/SafeEventHub';
import { API_CONNECTOR } from '../../fetch/ApiConnector';
import View from './View';

export class RandomMerge extends DomX {
    private static instance: RandomMerge | null = null;
    private totalIndex: number = 1;
    private count: number = 1;
    private btnElement!: HTMLButtonElement;

    // 이미지 경로 설정
    private readonly IMG_NORMAL = '/assets/images/bt_merge_s.png'; // 기본 상태
    private readonly IMG_PRESSED = '/assets/images/bt_merge_n.png'; // 눌린 상태

    constructor(private view: View) {
        if (RandomMerge.instance) return RandomMerge.instance;

        super(document.createElement('div'));
        this.create();
        this.clickEvent();
        this.applyResize();

        // 캔버스 부모에 버튼 추가
        const canvas = document.querySelector('canvas');
        const parent = canvas?.parentElement || document.body;
        if (!parent.contains(this.htmlElement)) {
            parent.appendChild(this.htmlElement);
        }

        // 1. 세션 시작 시 서버 데이터와 동기화
        EVT_HUB_SAFE.on(G_EVT.PLAY.SESSION_STARTED, (event: any) => {
            const data = event.data;
            if (data.isServerVerified) {
                this.count = data.itemCount !== undefined ? data.itemCount : 1;
                this.updateButtonVisual();
            }
        });

        // 2. 머지 성공 시 (비주얼 업데이트용)
        EVT_HUB_SAFE.on(G_EVT.PLAY.MERGE_SUCCESS, () => {
            this.updateButtonVisual();
        });

        // 3. 아이템 보상/재충전 (MERGE_RESET 이벤트 시)
        EVT_HUB_SAFE.on(G_EVT.PLAY.MERGE_RESET, async () => {
            if (this.count >= this.totalIndex) return;

            const success = await API_CONNECTOR.requestItemReward();
            if (success) {
                this.count++;
                this.updateButtonVisual();
                console.log('🎁 아이템 재충전 완료');
            }
        });

        // 4. 🔥 머지 실패 시 아이템 수량 복구 (환불)
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
            // 개수가 0이면 버튼을 반투명하게 하거나 비활성화 느낌을 줄 수 있습니다.
            this.btnElement.style.opacity = this.count > 0 ? '1' : '0.5';
            // 필요한 경우 텍스트를 버튼 근처 Dom에 따로 표기할 수 있습니다.
            // 현재는 이미지가 버튼 전체를 덮는 구조입니다.
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
        });

        // 버튼 상호작용 (이미지 교체)
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

            // 서버에 사용 요청
            const isAllowed = await API_CONNECTOR.useGiftItem();

            if (isAllowed) {
                this.count = Math.max(0, this.count - 1);
                this.updateButtonVisual();
                // 실제 게임 로직(머지 실행) 요청
                EVT_HUB_SAFE.emit(G_EVT.PLAY.MERGE_REQUEST);
            } else {
                alert('아이템을 사용할 수 없습니다.');
                this.updateButtonVisual();
            }
        };
    }

    private applyResize() {
        const canvas = document.querySelector('canvas');
        if (!canvas) return;

        const parent = canvas.parentElement || document.body;
        const canvasRect = canvas.getBoundingClientRect();
        const parentRect = parent.getBoundingClientRect();

        const offsetX = canvasRect.left - parentRect.left;
        const offsetY = canvasRect.top - parentRect.top;

        const scaleX = canvasRect.width / 1280;
        const scaleY = canvasRect.height / 800;
        const scale = Math.min(scaleX, scaleY);

        // 이미지 버튼 크기 및 위치 설정
        const btnSize = 160 * scale; // 이미지 크기에 맞춰 조정 가능
        this.btnElement.style.width = `${btnSize}px`;
        this.btnElement.style.height = `${btnSize}px`;

        // 우측 하단 적절한 위치 배치
        this.btnElement.style.top = `${offsetY + 180 * scaleY}px`;
        this.btnElement.style.left = `${offsetX + 1040 * scaleX}px`;
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
