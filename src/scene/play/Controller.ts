/**
 * Controller
 * PC / Mobile 공통 CreateJS 입력 처리
 */
import ContainerX from '../../core/ContainerX';
import View from './View';

class Controller extends ContainerX {
    private bActive: boolean = true;
    private view: View;

    constructor($view: View) {
        super();
        this.view = $view;

        this.enableInput();
        this.bindStageEvents();
    }

    private enableInput(): void {
        const stage = this.system.stage;
        createjs.Touch.enable(stage, true);
        stage.enableMouseOver(0);
        stage.mouseMoveOutside = true;
    }

    /**
     * 핸들러들을 화살표 함수 프로퍼티로 정의 (자동 바인딩 및 참조 보존)
     */
    private handleMouseDown = (e: createjs.MouseEvent) => {
        if (!this.bActive) return;
        this.view.interaction_DOWN(e.stageX, e.stageY);
    };

    private handleMouseMove = (e: createjs.MouseEvent) => {
        if (!this.bActive) return;
        this.view.interaction_MOVE(e.stageX, e.stageY);
    };

    private handleMouseUp = (e: createjs.MouseEvent) => {
        if (!this.bActive) return;
        this.view.interaction_UP(e.stageX, e.stageY);
    };

    private bindStageEvents(): void {
        const stage = this.system.stage;

        // on으로 등록 (참조: handleMouseDown)
        stage.on('stagemousedown', this.handleMouseDown);
        stage.on('stagemousemove', this.handleMouseMove);
        stage.on('stagemouseup', this.handleMouseUp);
    }

    /**
     * 리소스 해제
     */
    public dispose(): void {
        const stage = this.system.stage;

        if (stage) {
            // 등록했던 동일한 참조로 off 호출
            stage.off('stagemousedown', this.handleMouseDown);
            stage.off('stagemousemove', this.handleMouseMove);
            stage.off('stagemouseup', this.handleMouseUp);
        }

        this.bActive = false;
        // 추가적으로 필요한 정리 로직 (예: view 참조 제거)
        // this.view = null;

        console.log('🧹 Controller - Input Events Off 완료');
    }
}

export default Controller;
