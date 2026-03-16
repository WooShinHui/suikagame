// src/scenes/play/NextCh.ts
import ContainerX from '../../core/ContainerX';
import { UIScale, CANVAS_ORIGINAL_WIDTH } from '../../ui/UIScale';

export class NextCh extends ContainerX {
    private nextMc: createjs.MovieClip;

    constructor() {
        super();
        this.nextMc = this.resource.getLibrary('circle_2', 'mNext');
        this.addChild(this.nextMc);
        this.nextMc.gotoAndStop(0);

        const bounds = this.nextMc.getBounds();
        if (bounds) {
            this.nextMc.regX = bounds.x + bounds.width; // 오른쪽 끝
            this.nextMc.regY = bounds.y; // ✅ 상단 끝
        }

        this.applyResize();
        window.addEventListener('resize', () => this.applyResize());
    }

    private applyResize(): void {
        UIScale.update();
        const logicalWidth = UIScale.logicalWidth;
        const uiScale = UIScale.uiScale;

        this.scaleX = this.scaleY = 0.9 * uiScale;

        const RIGHT_MARGIN = 20;
        const TOP_Y = 30; // 원하는 상단 마진

        this.x = (CANVAS_ORIGINAL_WIDTH + logicalWidth) / 2 - RIGHT_MARGIN; // 오른쪽 고정
        this.y = TOP_Y; // ✅ 상단 고정
    }

    public showNext(type: number) {
        this.nextMc.gotoAndStop(type);
    }
}
