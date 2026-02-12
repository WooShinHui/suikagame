// PLAY.ts
import View from './View';
import Controller from './Controller';
import SceneX from '../../core/SceneX';
import { SoundMgr } from '../../manager/SoundMgr';
import { EVT_HUB, G_EVT } from '../../events/EVT_HUB';
import { Result } from '../../result/Result';
import { Option } from '../options/Option';
import { OptionBtn } from '../options/OptionBtn';
import { RankingBtn } from '../options/RankingBtn'; // ✅ 추가
import { WarningOverlay } from './WarningOverlay';
import { RandomMerge } from './RandomMerge';
import { EVT_HUB_SAFE } from '../../events/SafeEventHub';
import { API_CONNECTOR } from '../../fetch/ApiConnector';

class PLAY extends SceneX {
    private _view!: View | null;
    private _result!: Result | null;
    private _controller!: Controller | null;
    private _optionBtn!: OptionBtn | null;
    private _rankingBtn!: RankingBtn | null; // ✅ 추가
    private _option!: Option | null;
    private _warningOverlay!: WarningOverlay | null;
    private _randomMerge!: RandomMerge | null;

    private currentId: string | null = null;
    private currentUsername: string | null = null;

    private readonly onLoginSuccess = (event: any) =>
        this.handleLoginSuccess(event);

    private readonly onOpenOption = () => {
        this._option?.buildUI();
        this._option.open();
    };

    private readonly onRestart = () => {
        this.dispose();
        this.goScene('PLAY');
    };

    constructor() {
        super();

        EVT_HUB_SAFE.on(G_EVT.LOGIN.LOGIN_SUCCESS, this.onLoginSuccess);

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
        console.log('🎮 PLAY.onMounted() 시작');
        EVT_HUB_SAFE.on(G_EVT.RE.START, this.onRestart);
        EVT_HUB_SAFE.on(G_EVT.MENU.INGAME_OPEN_OPTION, this.onOpenOption);
        this.buildView();
        this.buildResult();
        this.buildController();
        this.buildOptionBtn();
        this.buildRankingBtn(); // ✅ 추가
        this.buildOption();
        this.buildWarningOverlay();
        this.buildRandomMerge();

        this.startNewGameSession().then(() => {
            this._view?.startGame();
        });
    }

    public dispose(): void {
        console.log('[PLAY] Scene Dispose: 리스너 및 컴포넌트 정리 시작');

        EVT_HUB_SAFE.off(G_EVT.LOGIN.LOGIN_SUCCESS, this.onLoginSuccess);
        EVT_HUB_SAFE.off(G_EVT.MENU.INGAME_OPEN_OPTION, this.onOpenOption);
        EVT_HUB_SAFE.off(G_EVT.RE.START, this.onRestart);

        if (this._controller) {
            this._controller.dispose();
        }

        if (this._view) {
            this._view.dispose();
        }

        if (this._warningOverlay) {
            this._warningOverlay.dispose();
        }

        if (this._result) {
            this._result.dispose();
        }

        this.removeAllChildren();

        this._view = null;
        this._result = null;
        this._controller = null;
        this._optionBtn = null;
        this._rankingBtn = null; // ✅ 추가
        this._option = null;
        this._warningOverlay = null;
        this._randomMerge = null;

        console.log('[PLAY] Scene Dispose: 정리 완료');
    }

    private buildView(): void {
        if (this._view) {
            this._view.dispose();
        }
        this._view = new View();
        this.addChild(this._view);
    }

    private buildResult(): void {
        console.log('🎬 buildResult() 호출');
        if (this._result) {
            console.warn('⚠️ Result 이미 존재함 - 재사용');
            return;
        }
        this._result = new Result();
        console.log('✅ Result 인스턴스 생성 완료');
    }

    private buildController(): void {
        this._controller = new Controller(this._view!);
    }

    private buildOptionBtn(): void {
        this._optionBtn = new OptionBtn();
    }

    // ✅ 추가
    private buildRankingBtn(): void {
        this._rankingBtn = new RankingBtn(this._optionBtn);
    }

    private buildWarningOverlay(): void {
        this._warningOverlay = new WarningOverlay(this._view);
        this.addChild(this._warningOverlay);
    }

    private buildRandomMerge(): void {
        this._randomMerge = new RandomMerge(this._view!);
    }

    private buildOption() {
        this._option = new Option(this._view!.scoreDisplay);

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

    public async startNewGameSession(): Promise<void> {
        const savedName = localStorage.getItem('guest_user_name');

        if (!savedName || savedName === 'null' || savedName === 'undefined') {
            this.currentUsername = 'guest_' + Date.now();
            console.warn(
                '[WARN] guest_user_name 없음 → guest 자동 지정:',
                this.currentUsername,
            );
        } else {
            this.currentUsername = savedName;
        }

        if (!this.currentId) {
            this.currentId = 'guest_id_' + Date.now();
            console.warn(
                '[WARN] userId 없음 → guest_id 자동 지정:',
                this.currentId,
            );
        }

        console.log('🔹 Firebase 세션 생성 시작');
        await API_CONNECTOR.setCrazyGamesUser({
            userId: this.currentId,
            username: this.currentUsername,
            countryCode: 'KR',
            profilePicture: null,
        });
        console.log('✅ Firebase 세션 생성 완료');
    }
}

export default PLAY;
