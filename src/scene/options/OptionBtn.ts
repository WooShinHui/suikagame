import { EVT_HUB, G_EVT } from '../../events/EVT_HUB';
import { EVT_HUB_SAFE } from '../../events/SafeEventHub';
import DomX from '../../core/DomX';
import { SoundMgr } from '../../manager/SoundMgr';
import { UIScale } from '../../ui/UIScale';

export class OptionBtn extends DomX {
    private btn!: HTMLButtonElement;

    constructor() {
        super(document.createElement('div'));
        this.create();

        // canvas 부모에 붙이기
        const canvas = document.querySelector('canvas');
        const parent = canvas?.parentElement || document.body;
        parent.appendChild(this.htmlElement);

        this.applyResize();

        window.addEventListener('resize', () => {
            this.applyResize();
        });
    }

    private create() {
        this.btn = document.createElement('button');

        Object.assign(this.btn.style, {
            position: 'absolute',
            backgroundImage: 'url("./assets/images/setting_s.png")',
            backgroundColor: 'transparent',
            backgroundSize: 'cover',
            border: 'none',
            cursor: 'pointer',
            padding: '0',
        });

        // 클릭
        this.btn.addEventListener('click', () => {
            EVT_HUB_SAFE.emit(G_EVT.MENU.INGAME_OPEN_OPTION);
            SoundMgr.handle.playSound('btn');
        });

        // 눌림 상태
        this.btn.addEventListener('pointerdown', () => {
            this.btn.style.backgroundImage =
                'url("./assets/images/setting_n.png")';
        });
        this.btn.addEventListener('pointerleave', () => {
            this.btn.style.backgroundImage =
                'url("./assets/images/setting_s.png")';
        });
        this.btn.addEventListener('pointerup', () => {
            this.btn.style.backgroundImage =
                'url("./assets/images/setting_s.png")';
        });
        this.btn.addEventListener('pointercancel', () => {
            this.btn.style.backgroundImage =
                'url("./assets/images/setting_s.png")';
        });
        this.htmlElement.appendChild(this.btn);
    }

    private applyResize() {
        const canvas = document.querySelector('canvas');
        if (!canvas) return;

        const parent = canvas.parentElement || document.body;
        const canvasRect = canvas.getBoundingClientRect();
        const parentRect = parent.getBoundingClientRect();

        const offsetX = canvasRect.left - parentRect.left;
        const offsetY = canvasRect.top - parentRect.top;

        const scaleX = canvasRect.width / 720;
        const scaleY = canvasRect.height / 1280;
        const scale = Math.min(scaleX, scaleY);

        // 이미지 버튼 크기 및 위치 설정
        const btnSize = 60 * scale; // 이미지 크기에 맞춰 조정 가능
        this.btn.style.width = `${btnSize}px`;
        this.btn.style.height = `${btnSize}px`;

        // 우측 하단 적절한 위치 배치
        this.btn.style.top = `${offsetY + 20 * scaleY}px`;
        this.btn.style.left = `${offsetX + 560 * scaleX}px`;
    }
}
