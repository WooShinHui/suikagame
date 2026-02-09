import { EVT_HUB_SAFE } from '../../events/SafeEventHub';
import { G_EVT } from '../../events/EVT_HUB';
import PureDomX from '../../core/PureDomX';
import { SoundMgr } from '../../manager/SoundMgr';
import { UIScale } from '../../ui/UIScale';

export class OptionBtn extends PureDomX {
    // ✅ 변경
    private btn!: HTMLButtonElement;

    constructor() {
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

        const canvas = document.querySelector('canvas');
        const parent = canvas?.parentElement || document.body;
        parent.appendChild(this.htmlElement);

        this.applyResize();
        window.addEventListener('resize', () => this.applyResize());
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
            pointerEvents: 'auto',
            zIndex: '1000',
        });

        this.btn.addEventListener('click', () => {
            EVT_HUB_SAFE.emit(G_EVT.MENU.INGAME_OPEN_OPTION);
            SoundMgr.handle.playSound('btn');
        });

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
        // ✅ 비율 기반 크기
        const size = UIScale.getResponsiveSize(50, 40, 60);

        // ✅ 비율 기반 마진
        const marginX = UIScale.getResponsiveMargin(20);
        const marginY = UIScale.getResponsiveMargin(40);

        UIScale.layoutElementViewport(
            this.btn,
            'right',
            'top',
            marginX,
            marginY,
            size,
            size
        );
    }
}
