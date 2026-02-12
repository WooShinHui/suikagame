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

    private applyResize() {
        UIScale.update();

        const sw = window.innerWidth;
        const sh = window.innerHeight;
        const scale = UIScale.scale;

        // Canvas 렌더링 영역
        const canvasRenderWidth = CANVAS_ORIGINAL_WIDTH * scale;

        // Canvas 화면 위치
        const canvasLeft = (sw - canvasRenderWidth) / 2;
        const canvasTop = 0;

        // Canvas 논리 좌표
        const canvasX = 20;
        const canvasY = 20;
        const buttonSize = 100 * scale;

        // Canvas 좌표 → 화면 좌표
        let screenX = canvasLeft + canvasX * scale;
        let screenY = canvasTop + canvasY * scale;

        // ✅ 화면 비율 체크
        const aspectRatio = sw / sh;
        const targetAspectRatio = 9 / 16;

        // 가로가 좁을 때만 조정
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
