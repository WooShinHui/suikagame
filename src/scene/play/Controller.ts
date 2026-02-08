/**
 * Controller
 * PC / Mobile 공통 CreateJS 입력 처리
 */
import ContainerX from '../../core/ContainerX';
import View from './View';

class Controller extends ContainerX {
    private bActive: boolean = true;

    constructor($view: View) {
        super();

        this.enableInput();
        this.bindStageEvents($view);
    }

    private enableInput(): void {
        const stage = this.system.stage;

        // 모바일 터치 활성화 (PC에서도 문제 없음)
        createjs.Touch.enable(stage, true);

        // 모바일에서 hover 의미 없고 성능 이슈 방지
        stage.enableMouseOver(0);

        // 드래그 중 캔버스 밖 나가도 이벤트 유지 (선택)
        stage.mouseMoveOutside = true;
    }

    private bindStageEvents($view: View): void {
        if (!this.bActive) return;

        const stage = this.system.stage;

        stage.on('stagemousedown', (e: createjs.MouseEvent) => {
            $view.interaction_DOWN(e.stageX, e.stageY);
        });

        stage.on('stagemousemove', (e: createjs.MouseEvent) => {
            $view.interaction_MOVE(e.stageX, e.stageY);
        });

        stage.on('stagemouseup', (e: createjs.MouseEvent) => {
            $view.interaction_UP(e.stageX, e.stageY);
        });
    }
}

export default Controller;
