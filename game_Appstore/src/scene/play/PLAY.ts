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
import { AUTH_SERVICE } from '../../auth/AuthService';
import { API_CONNECTOR } from '../../fetch/ApiConnector';
import { App as CapacitorApp } from '@capacitor/app';

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
        EVT_HUB_SAFE.on(G_EVT.RE.START, this.onRestart);
        EVT_HUB_SAFE.on(G_EVT.MENU.INGAME_OPEN_OPTION, this.onOpenOption);
        this.buildView();
        this.buildResult();
        this.buildController();
        this.buildOptionBtn();
        this.buildRankingBtn();
        this.buildOption();
        this.buildWarningOverlay();
        this.buildRandomMerge();

        // ✅ 게임 즉시 시작 (Auth 기다리지 않음)
        this._view?.startGame();
        (window as any).LoadingScreen?.finish();

        // ✅ Auth는 백그라운드에서 조용히 처리
        this.startNewGameSession().catch((err) => {
            console.error('세션 초기화 실패:', err);
        });
        CapacitorApp.addListener('backButton', () => {
            this.showExitDialog();
        });
    }

    public dispose(): void {
        console.log('[PLAY] Scene Dispose: 리스너 및 컴포넌트 정리 시작');

        CapacitorApp.removeAllListeners();

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

        if (this._option) {
            this._option.dispose();
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
    }

    private buildRandomMerge(): void {
        this._randomMerge = new RandomMerge(this._view!, this._optionBtn);
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
        console.log('🔐 통합 인증 시작...');

        const userInfo = await AUTH_SERVICE.authenticate();

        this.currentId = userInfo.userId;
        this.currentUsername = userInfo.username;

        console.log('✅ 인증 완료:', userInfo);

        // ✅ API_CONNECTOR에 유저 정보 등록 (currentId 세팅)
        await API_CONNECTOR.setUser({
            userId: userInfo.userId,
            username: userInfo.username,
            countryCode: userInfo.countryCode,
            profilePicture: userInfo.profilePicture,
        });
    }
    private showExitDialog(): void {
        if (document.getElementById('exit-dialog')) return;

        const dialog = document.createElement('div');
        dialog.id = 'exit-dialog';
        dialog.innerHTML = `
            <div style="
                position:fixed; top:0; left:0; width:100%; height:100%;
                background:rgba(0,0,0,0.7); z-index:9999;
                display:flex; align-items:center; justify-content:center;
            ">
                <div style="
                    background:linear-gradient(180deg,#fffbe8,#fff3c8);
                    border:4px solid #e8a020;
                    border-radius:24px;
                    padding:44px 52px;
                    text-align:center;
                    box-shadow:0 6px 0 #7a4a05, 0 10px 30px rgba(0,0,0,0.3);
                    font-family:'SchoolSafeDungGeunMiSo', sans-serif;
                    color:#5a3000;
                    width:80%;
                    max-width:360px;
                ">
                    <div style="font-size:24px; font-weight:800; margin-bottom:32px; letter-spacing:1px;">
                        게임을 종료할까요?
                    </div>
                    <div style="display:flex; gap:16px;">
                        <button id="exit-cancel" style="
                            flex:1; padding:16px;
                            background:linear-gradient(180deg,#f0c060,#c47010);
                            border:none; border-radius:14px;
                            box-shadow:0 4px 0 #7a4a05;
                            color:#fff; font-size:17px; font-weight:700;
                            cursor:pointer; font-family:inherit; letter-spacing:0.5px;
                        ">계속하기</button>
                        <button id="exit-confirm" style="
                            flex:1; padding:16px;
                            background:linear-gradient(180deg,#ff7070,#cc3030);
                            border:none; border-radius:14px;
                            box-shadow:0 4px 0 #880000;
                            color:#fff; font-size:17px; font-weight:700;
                            cursor:pointer; font-family:inherit; letter-spacing:0.5px;
                        ">종료</button>
                    </div>
                </div>
            </div>`;

        document.body.appendChild(dialog);

        document.getElementById('exit-cancel')!.onclick = () => dialog.remove();
        document.getElementById('exit-confirm')!.onclick = () => {
            dialog.remove();
            CapacitorApp.exitApp();
        };
    }
}

export default PLAY;
