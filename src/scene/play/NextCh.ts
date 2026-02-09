import ContainerX from '../../core/ContainerX';
import { UIScale, SAFE_WIDTH } from '../../ui/UIScale';

export class NextCh extends ContainerX {
    private nextMc: createjs.MovieClip;

    constructor() {
        super();

        this.nextMc = this.resource.getLibrary('circle_2', 'mNext');
        this.addChild(this.nextMc);

        // ✅ Safe Area 기준 좌표 (우측 상단)
        // 원본: Safe Area X=580, Y=120
        // 우측에서 140px(720-580) 마진
        this.x = UIScale.safeToCanvasX(SAFE_WIDTH - 300);
        this.y = UIScale.safeToCanvasY(120);

        this.nextMc.gotoAndStop(0);
    }

    public showNext(type: number) {
        this.nextMc.gotoAndStop(type);
    }
}
