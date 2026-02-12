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
        this.nextMc.x += 40;

        this.applyResize();
        window.addEventListener('resize', () => this.applyResize());
    }

    private applyResize(): void {
        UIScale.update();

        const sw = window.innerWidth;
        const sh = window.innerHeight;
        const scale = UIScale.scale;

        const canvasRenderWidth = CANVAS_ORIGINAL_WIDTH * scale;
        const canvasLeft = (sw - canvasRenderWidth) / 2;

        // 1. 스케일 결정 (조건문 없이 연속적으로 계산)
        // 화면이 좁아질수록 0.9에서 0.5까지 부드럽게 줄어듦
        const visibleRatio = Math.min(1, sw / canvasRenderWidth);
        const targetScale = Math.max(0.5, 0.9 * visibleRatio);
        this.scaleX = this.scaleY = targetScale;

        // 2. 캔버스 내 기준 좌표
        const canvasX = CANVAS_ORIGINAL_WIDTH;
        const canvasY = 260;

        // 3. 요소의 현재 시각적 너비 (스케일 반영)
        // 원본 크기가 200이라 가정할 때
        const currentWidth = 200 * targetScale;

        // 4. 화면상 가용한 경계값 계산 (가로 한정)
        const viewLeft = Math.max(0, canvasLeft) / scale;
        const viewRight = Math.min(sw, canvasLeft + canvasRenderWidth) / scale;

        // 5. 로컬 캔버스 좌표계 내에서의 마진
        const localMargin = 0;

        // 6. 위치 계산 및 보정 (Canvas 좌표계 기준)
        let finalX = canvasX;

        // 오른쪽 경계 밖으로 나가는지 체크 (Canvas 좌표계 기준)
        // canvasLeft를 고려한 상대적 위치 보정
        const relativeCanvasRight =
            (Math.min(sw, canvasLeft + canvasRenderWidth) - canvasLeft) / scale;

        if (finalX + currentWidth > relativeCanvasRight) {
            finalX = relativeCanvasRight - currentWidth - localMargin;
        }

        this.x = finalX;
        this.y = canvasY;
    }

    public showNext(type: number) {
        this.nextMc.gotoAndStop(type);
    }
}
