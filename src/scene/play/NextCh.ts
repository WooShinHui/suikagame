import ContainerX from '../../core/ContainerX';

export class NextCh extends ContainerX {
    private nextMc: createjs.MovieClip;

    constructor() {
        super();

        // FLA에서 미리보기용 무비클립
        this.nextMc = this.resource.getLibrary('circle_2', 'mNext');
        this.addChild(this.nextMc);

        // 위치 (화면 오른쪽 위 예시)
        this.x = 955;
        this.y = 120;

        this.nextMc.gotoAndStop(0); // 초기값
    }

    /** 다음 과일 타입으로 갱신 */
    public showNext(type: number) {
        this.nextMc.gotoAndStop(type);
    }
}
