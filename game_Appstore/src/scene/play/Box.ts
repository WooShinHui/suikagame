import ContainerX from '../../core/ContainerX';
import { UIScale, SAFE_WIDTH } from '../../ui/UIScale';

export class Box extends ContainerX {
    private boxMc: createjs.MovieClip;

    private readonly ASSET_WIDTH = 922;
    private readonly ASSET_HEIGHT = 939;

    constructor() {
        super();
        this.boxMc = this.resource.getLibrary('circle_2', 'mBox');

        // ✅ 중점을 에셋 중앙으로
        this.boxMc.regX = this.ASSET_WIDTH / 2;
        this.boxMc.regY = this.ASSET_HEIGHT / 2;

        this.addChild(this.boxMc);
        this.boxMc.gotoAndStop(0);

        this.applyScale();
        window.addEventListener('resize', () => this.applyScale());

        const b = this.boxMc.getBounds();
        console.log(b?.width, b?.height);
    }

    private applyScale(): void {
        const sw = window.innerWidth;
        const sh = window.innerHeight;

        const TARGET_RATIO = 9 / 16;
        const currentRatio = sw / sh;

        const effectiveScreenWidth =
            currentRatio > TARGET_RATIO ? sh * TARGET_RATIO : sw;

        const effectiveCanvasWidth = effectiveScreenWidth / UIScale.scale;
        const scale = effectiveCanvasWidth / this.ASSET_WIDTH;

        this.scaleX = scale;
        this.scaleY = scale;

        const canvasCenterX = UIScale.safeToCanvasX(SAFE_WIDTH / 2);

        // ✅ 박스 상단을 고정 Y에 앵커 → 상단 UI와 간격 일정하게 유지
        // 박스가 작아져도 상단은 고정, 아래로만 줄어듦
        const BOX_TOP_ANCHOR = UIScale.safeToCanvasY(280); // 상단 UI 아래 고정값
        const boxHalfHeight = (this.ASSET_HEIGHT / 2) * scale;

        this.x = canvasCenterX;
        this.y = BOX_TOP_ANCHOR + boxHalfHeight; // center = top + halfHeight
    }
    public showNext(type: number) {
        this.boxMc.gotoAndStop(type);
    }

    public getPhysicsParams(): {
        centerX: number;
        bottomY: number;
        basketWidth: number;
    } {
        const sw = window.innerWidth;
        const sh = window.innerHeight;

        const TARGET_RATIO = 9 / 16;
        const currentRatio = sw / sh;

        const effectiveScreenWidth =
            currentRatio > TARGET_RATIO ? sh * TARGET_RATIO : sw;
        const basketWidth = effectiveScreenWidth / UIScale.scale;
        const scale = basketWidth / this.ASSET_WIDTH;

        const centerX = UIScale.safeToCanvasX(SAFE_WIDTH / 2);

        // ✅ applyScale()에서 설정한 this.y를 그대로 사용 (하드코딩 제거)
        const bottomY = this.y + (this.ASSET_HEIGHT / 2) * scale;

        return { centerX, bottomY, basketWidth };
    }

    public get physicsScale(): number {
        const sw = window.innerWidth;
        const sh = window.innerHeight;
        const TARGET_RATIO = 9 / 16;
        const currentRatio = sw / sh;
        const effectiveScreenWidth =
            currentRatio > TARGET_RATIO ? sh * TARGET_RATIO : sw;
        return effectiveScreenWidth / UIScale.scale / this.ASSET_WIDTH;
    }

    public getBoxHeight(): number {
        return this.ASSET_HEIGHT;
    }
}
