import ContainerX from '../../core/ContainerX';
import { UIScale, SAFE_WIDTH } from '../../ui/UIScale';

export class Box extends ContainerX {
    private boxMc: createjs.MovieClip;

    constructor() {
        super();

        this.boxMc = this.resource.getLibrary('circle_2', 'mBox');
        this.addChild(this.boxMc);

        this.scaleX = 0.7;
        this.scaleY = 0.7;

        this.x = UIScale.safeToCanvasX(SAFE_WIDTH - 684);
        this.y = UIScale.safeToCanvasY(540);

        this.boxMc.gotoAndStop(0);
    }

    public showNext(type: number) {
        this.boxMc.gotoAndStop(type);
    }
}
