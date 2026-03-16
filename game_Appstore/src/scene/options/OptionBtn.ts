// src/scene/options/OptionBtn.ts
import { EVT_HUB_SAFE } from '../../events/SafeEventHub';
import { G_EVT } from '../../events/EVT_HUB';
import PureDomX from '../../core/PureDomX';
import { SoundMgr } from '../../manager/SoundMgr';
import {
    UIScale,
    CANVAS_ORIGINAL_WIDTH,
    CANVAS_ORIGINAL_HEIGHT,
} from '../../ui/UIScale';

export class OptionBtn extends PureDomX {
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

    // OptionBtn.ts - applyResize() 수정
    public applyResize() {
        UIScale.update();
        const sw = window.innerWidth;
        const scale = UIScale.scale;
        const uiScale = UIScale.uiScale;

        const logicalWidth = UIScale.logicalWidth;
        const canvasLeft = (sw - logicalWidth * scale) / 2;

        const buttonSize = 80 * scale * uiScale; // ✅
        const screenX = canvasLeft + 36 * scale;
        const screenY = 30 * scale;

        this.btn.style.left = `${screenX}px`;
        this.btn.style.top = `${screenY}px`;
        this.btn.style.width = `${buttonSize}px`;
        this.btn.style.height = `${buttonSize}px`;
    }

    // ✅ RankingBtn에서 참조할 수 있도록 위치 반환
    public getButtonRight(): number {
        return (
            parseFloat(this.btn.style.left) + parseFloat(this.btn.style.width)
        );
    }

    public getButtonTop(): number {
        return parseFloat(this.btn.style.top);
    }
}
