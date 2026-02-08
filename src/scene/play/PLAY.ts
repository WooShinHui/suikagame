import View from './View';
import Controller from './Controller';
// SceneX가 CreateJS.Container를 상속받는다고 가정합니다.
import SceneX from '../../core/SceneX';
import { SoundMgr } from '../../manager/SoundMgr';
import { EVT_HUB, G_EVT } from '../../events/EVT_HUB';
import { Result } from '../../result/Result';
import { Option } from '../options/Option';
import { OptionBtn } from '../options/OptionBtn';
import { ChangeBgm } from '../options/ChangeBgm';
import { WarningOverlay } from './WarningOverlay';
import { RandomMerge } from './RandomMerge';
import { EVT_HUB_SAFE } from '../../events/SafeEventHub';
import { API_CONNECTOR } from '../../fetch/ApiConnector';

class PLAY extends SceneX {
    // 씬 내부에 정의된 자식 컴포넌트들
    private _view!: View | null;
    private _result!: Result | null;
    private _controller!: Controller | null;
    private _optionBtn!: OptionBtn | null;
    private _changeBgm!: ChangeBgm | null;
    private _option!: Option | null;
    private _warningOverlay!: WarningOverlay | null;
    private _randomMerge!: RandomMerge | null;

    // 사용자/세션 정보
    private currentId: string | null = null;
    private currentUsername: string | null = null;

    // 🔥 1. 이벤트를 해제하기 위해 멤버 메서드(리스너)를 정의합니다.
    private readonly onLoginSuccess = (event: any) =>
        this.handleLoginSuccess(event);
    private onOpenOption() {
        this._option?.buildUI();
        this._option.open();
    }

    // 🔥 2. RE_START 발생 시 현재 씬을 청소하고 새로운 씬으로 전환합니다.
    private readonly onRestart = () => {
        // 씬 전환 전에 현재 씬의 모든 리스너와 화면을 해제합니다.
        this.dispose();
        this.goScene('PLAY');
    };

    constructor() {
        super();

        // 🔥 3. 모든 이벤트 등록
        EVT_HUB_SAFE.on(G_EVT.LOGIN.LOGIN_SUCCESS, this.onLoginSuccess);
        EVT_HUB_SAFE.on(G_EVT.MENU.INGAME_OPEN_OPTION, () => {
            this.onOpenOption();
        });
        EVT_HUB_SAFE.on(G_EVT.RE.START, this.onRestart);
        // EVT_HUB_SAFE.on(G_EVT.PLAY.SESSION_STARTED, this.onSessionStarted);
        API_CONNECTOR.refreshSession();
        this.create();
    }

    private handleLoginSuccess(event: any) {
        this.currentId = event.data?.userId || null;
        this.currentUsername = event.data?.username || 'guest';

        if (this.currentId) {
            EVT_HUB_SAFE.emit(G_EVT.DATA.DATA_SEND, {
                userId: this.currentId,
                username: this.currentUsername,
            });
        }
    }

    public async preload(): Promise<void> {}

    public async create(): Promise<void> {}

    public onMounted(): void {
        // 이 onMounted()는 씬이 새로 로드될 때마다 한 번씩만 호출됩니다.
        this.buildView();
        this.buildController();
        this.buildOptionBtn();
        this.buildOption();
        this.buildChangeBgm();
        this.buildWarningOverlay();
        this.buildRandomMerge();

        this.startNewGameSession();
        this._view?.startGame();
    }

    /**
     * 🔥 4. 씬이 메모리에서 해제될 때 호출되는 클린업(Cleanup) 메서드.
     * 누적 문제 방지를 위해 반드시 구현해야 합니다.
     */
    public dispose(): void {
        console.log('[PLAY] Scene Dispose: 리스너 및 컴포넌트 정리 시작');

        // 1. **글로벌 이벤트 해제 (가장 중요: 누적 방지)**
        EVT_HUB_SAFE.off(G_EVT.LOGIN.LOGIN_SUCCESS, this.onLoginSuccess);

        // EVT_HUB_SAFE.off(G_EVT.MENU.INGAME_OPEN_OPTION, this.onOpenOption);
        // EVT_HUB_SAFE.off(G_EVT.RE.START, this.onRestart);

        // 2. View 컴포넌트 정리 (View 내부의 리스너까지 정리)
        if (this._view) {
            this._view.dispose(); // View 내부에 정의된 리스너 정리
        }
        if (this._warningOverlay) {
            this._warningOverlay.dispose();
        }

        // 3. **🔥[핵심 수정] CreateJS Container의 기능을 사용하여 현재 씬에 붙어있는 모든 자식 요소를 화면에서 제거**
        // build* 함수들이 생성한 모든 DisplayObject들이 화면에서 사라집니다.
        this.removeAllChildren();

        // 4. 인스턴스 변수 참조 끊기 (선택 사항이지만 메모리 관리에 좋음)
        this._view = null;
        this._controller = null;
        this._optionBtn = null;
        this._changeBgm = null;
        this._option = null;
        this._warningOverlay = null;
        this._randomMerge = null;

        console.log('[PLAY] Scene Dispose: 정리 완료');
    }

    private buildView(): void {
        // 이미 View가 존재한다면 (이전 인스턴스) dispose를 호출합니다.
        // 하지만 dispose()가 goScene 전에 호출되므로, 이 곳에 들어올 때는 _view가 null이거나 곧 덮어씌워질 상태여야 합니다.
        if (this._view) {
            this._view.dispose();
        }
        this._view = new View();
        this.addChild(this._view);
        // this.emitInitialGameData();
    }

    // 이 build 함수들은 onMounted()가 실행될 때마다 한 번씩만 호출됩니다.
    // 기존 씬이 dispose()에서 removeAllChildren()을 통해 화면에서 사라졌기 때문에,
    // 새 씬이 addChild() 할 때 화면 요소가 겹치는 문제가 발생하지 않습니다.
    private buildController(): void {
        // View가 null일 수 있으므로 옵셔널 체이닝 또는 non-null assertion 사용
        this._controller = new Controller(this._view!);
    }

    private buildOptionBtn(): void {
        this._optionBtn = new OptionBtn();
        this.addChild(this._optionBtn);
    }

    private buildChangeBgm(): void {
        this._changeBgm = new ChangeBgm();
        this.addChild(this._changeBgm);
    }

    private buildWarningOverlay(): void {
        this._warningOverlay = new WarningOverlay(this._view);
        this.addChild(this._warningOverlay);
    }

    private buildRandomMerge(): void {
        this._randomMerge = new RandomMerge(this._view!);
        this.addChild(this._randomMerge);
        this._randomMerge.reset(1);
    }

    private buildOption() {
        this._option = new Option(this._view!.scoreDisplay);
        this.addChild(this._option);

        // ... (오디오 설정 로직은 동일) ...
        const rawBGM = localStorage.getItem('bgmVolume');
        const bgmVolume = rawBGM !== null ? Number(rawBGM) : 20;
        const bgmMuted = localStorage.getItem('bgmMuted') === 'true';

        const rawSFX = localStorage.getItem('sfxVolume');
        const sfxVolume = rawSFX !== null ? Number(rawSFX) : 50;
        const sfxMuted = localStorage.getItem('sfxMuted') === 'true';

        SoundMgr.handle.bgmVolume = bgmVolume / 100;
        SoundMgr.handle.bgmMuted = bgmMuted;

        SoundMgr.handle.sfxVolume = sfxVolume / 100;
        SoundMgr.handle.sfxMuted = sfxMuted;
    }

    public startNewGameSession(): void {
        // ... (세션 시작 로직은 동일) ...
        const savedName = localStorage.getItem('guest_user_name');

        if (!savedName || savedName === 'null' || savedName === 'undefined') {
            this.currentUsername = 'guest_' + Date.now();
            console.warn(
                '[WARN] guest_user_name 없음 → guest 자동 지정:',
                this.currentUsername
            );
        } else {
            this.currentUsername = savedName;
        }

        if (!this.currentId) {
            this.currentId = 'guest_id_' + Date.now();
            console.warn(
                '[WARN] userId 없음 → guest_id 자동 지정:',
                this.currentId
            );
        }
    }
}

export default PLAY;
