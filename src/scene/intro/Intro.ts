import SceneX from '../../core/SceneX';
import IntroManager from './introManager';
import IntroMenu from './IntroMenu';
import { EVT_HUB, G_EVT } from '../../events/EVT_HUB';
import { EVT_HUB_SAFE } from '../../events/SafeEventHub';
import { Option } from '../options/Option';
import { Login } from './Login';
import { Result } from '../../result/Result';
import ProfileManager from './ProfileManager';
import { IntroBtn } from './IntroBtn';

class Intro extends SceneX {
    private introManager!: IntroManager;
    private introMenu!: IntroMenu;
    private introBtn: IntroBtn;
    private option: Option;
    private login: Login; // 이 변수 초기화 로직은 제거 가능
    private profileManager: ProfileManager;
    private isSkipped: boolean;
    private userId: string = '';
    private _result: Result;

    private rankingBtn: HTMLButtonElement;
    private container: HTMLElement;

    constructor() {
        super();

        const APP_VERSION = 'waterMelon-3.0.0'; // 배포할 때 숫자만 올리면 됨
        const SAVED_VERSION = localStorage.getItem('app_version');

        if (SAVED_VERSION !== APP_VERSION) {
            localStorage.clear(); // 전체 초기화
            localStorage.setItem('app_version', APP_VERSION);
        }

        // this.initBtn();
    }

    public async create() {
        this.introManager = new IntroManager();
        this.introManager.create();

        this._result = new Result();

        // this.login = new Login(); // 🚨 Login UI 클래스 사용 제거 🚨

        // this.profileManager = new ProfileManager();

        // 1. 로그인 성공 시 -> showMenu() 호출
        EVT_HUB_SAFE.once(G_EVT.LOGIN.LOGIN_SUCCESS, (e) => {
            this.userId = e.data.userId;
            // 여기서 IntroMenu를 생성하고 표시하는 로직을 추가해야 합니다.
            // this.introMenu = new IntroMenu(this.userId);
            // this.introMenu.create();
        });

        // 2. 인트로 스킵 또는 종료 시 이벤트 핸들러 수정
        EVT_HUB_SAFE.once(G_EVT.INTRO.SKIP, () => {
            console.log('⚡️ 탭하여 스킵 감지. 자동 로그인 시도.');
            this.handleAutoLogin(); // ⬅️ 수정
            this.goScene('PLAY');
        });

        EVT_HUB_SAFE.once(G_EVT.INTRO.FINISHED, () => {
            console.log('▶️ 인트로 영상 종료. 자동 로그인 시도.');
            this.handleAutoLogin(); // ⬅️ 수정
            this.goScene('PLAY');
        });
    }

    private handleAutoLogin() {
        if (this.isSkipped) return;
        this.isSkipped = true; // 중복 호출 방지

        // 1. 게스트 ID 생성 (이전 Login.ts의 로직을 그대로 가져옴)
        let guestId = localStorage.getItem('guest_user_id');
        if (!guestId) {
            const randomSuffix = Math.random().toString(36).substring(2, 10);
            guestId = `auto_guest_${randomSuffix}`;
            localStorage.setItem('guest_user_id', guestId);
        }
        EVT_HUB_SAFE.emit(G_EVT.LOGIN.LOGIN_SUCCESS, {
            userId: guestId,
        });
    }
}

export default Intro;
