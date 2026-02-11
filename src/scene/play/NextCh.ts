import ContainerX from '../../core/ContainerX';
import { UIScale, SAFE_WIDTH } from '../../ui/UIScale';

export class NextCh extends ContainerX {
    private nextMc: createjs.MovieClip;

    constructor() {
        super();

        this.nextMc = this.resource.getLibrary('circle_2', 'mNext');
        this.addChild(this.nextMc);

        this.scaleX = 0.8;
        this.scaleY = 0.8;
        this.x = UIScale.safeToCanvasX(SAFE_WIDTH - 250);
        this.y = UIScale.safeToCanvasY(0);

        this.nextMc.gotoAndStop(0);
    }

    public showNext(type: number) {
        this.nextMc.gotoAndStop(type);
    }
}
