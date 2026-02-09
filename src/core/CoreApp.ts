/**
 * 밀크T초등용 CreateJS 기반 캔버스 프레임워크
 * 넘겨받은 캔버스 태그에 렌더링을 하는 실질적인 클래스
 * Author: 김태신
 * Date: 2025-01-02
 */
import BaseComponentExtends from './BaseComponent';
import SceneX from './SceneX';
import ContainerX from './ContainerX';
import { SystemMgr } from '../manager/SystemMgr';
import { TimeMgr } from '../manager/TimeMgr';
import 'reset-css';
import { SoundMgr } from '../manager/SoundMgr';
import { UIScale, SAFE_WIDTH, SAFE_HEIGHT } from '../ui/UIScale';
/**
 * 무비 클립안에 심어둔 사운드 재생을 위한 전역 함수
 */
declare global {
    interface Window {
        onPauseContents: () => void;
        onResumeContents: () => void;
        playSound: (
            id: string,
            loop?: number,
            offset?: number
        ) => createjs.AbstractSoundInstance;
    }
}

window.playSound = function (
    id: string,
    loop: number = 0,
    offset: number = 0
): createjs.AbstractSoundInstance {
    return createjs.Sound.play(id, {
        interrupt: createjs.Sound.INTERRUPT_EARLY,
        loop: loop,
        offset: offset,
    });

    /*
    const soundPath = `sounds/${id}.mp3`;

    // 사운드가 등록되어 있는지 확인
    if (!createjs.Sound.loadComplete(id)) {
        console.log(`사운드 ${id} 등록되지 않음. 등록 후 재생.`);

        // 사운드 등록
        createjs.Sound.registerSound(soundPath, id);

        // 로드 완료 후 재생
        createjs.Sound.on('fileload', function onLoad($e) {
            if ($e['id'] === id) {
                console.log(`사운드 ${id} 로드 완료. 재생 시작.`);
                createjs.Sound.off('fileload', onLoad); // 이벤트 중복 방지
                window.playSound(id, loop, offset); // 다시 실행
            }
        });

        return null; // 로드 후 재생되도록 일단 null 반환
    }

    // 사운드 인스턴스 생성 후 재생
    const soundInstance = createjs.Sound.createInstance(id);
    return soundInstance.play({
        interrupt: createjs.Sound.INTERRUPT_EARLY,
        loop: loop,
        offset: offset,
    });
    */
};

// -----------------------------------------------------

export interface AppConfig {
    readonly canvas: HTMLCanvasElement;
    readonly width: number;
    readonly height: number;
    readonly context?: CanvasRenderingContext2D | null;
    outputWindow?: boolean;
    background?: string;
    transparent?: boolean;
    scene: (typeof SceneX)[];
}

class CoreApp extends BaseComponentExtends {
    private _canvas: HTMLCanvasElement;
    private _stage: createjs.Stage;

    public sceneContainer: ContainerX;
    public bottomContainer: ContainerX;
    public naviContainer: ContainerX;
    public coverContainer: ContainerX;

    constructor($config: AppConfig) {
        super();
        // 캔버스 할당 및 크기기 설정
        $config.canvas.style.position = 'absolute';
        $config.canvas.width = $config.width;
        $config.canvas.height = $config.height;

        // if ($config.background)
        //   this._canvas.style.backgroundColor = $config.background;

        // 스테이지 생성 및 설정
        this._stage = new createjs.Stage($config.canvas);
        console.log(this._stage);
        this._stage.mouseMoveOutside = true;

        this._stage.autoClear = true;

        //this._stage.enableMouseOver();
        createjs.Touch.enable(this._stage, true, false);
        // createjs.Ticker.timingMode = createjs.Ticker.RAF;
        createjs.Ticker.framerate = 30;
        createjs.Ticker.timingMode = createjs.Ticker.RAF_SYNCHED;
        createjs.Ticker.addEventListener('tick', ($e: createjs.Ticker) => {
            this.tick($e);
        });

        createjs.MotionGuidePlugin.install();
        createjs['RotationPlugin'].install();

        this.sceneContainer = new ContainerX();
        this.bottomContainer = new ContainerX();
        this.naviContainer = new ContainerX();
        this.coverContainer = new ContainerX();
        this._stage.addChild(this.bottomContainer);
        this._stage.addChild(this.sceneContainer);
        this._stage.addChild(this.naviContainer);
        this._stage.addChild(this.coverContainer);

        // 구동되는 웹뷰 버전을 체크한다.
        const userAgent = navigator.userAgent;
        const match = userAgent.match(/Chrome\/(\d+\.\d+\.\d+\.\d+)/);

        let fullVersion = '0.0.0.0';
        let majorVersion = 0;

        if (match && match[1]) {
            // 1. Chrome 기반 웹뷰인 경우: 기존 로직 그대로 수행 (하위 호환 유지)
            fullVersion = match[1];
            majorVersion = Number(fullVersion.split('.')[0]);
        } else {
            // 2. Chrome이 아닌 경우 (Safari, Firefox 등):
            // iOS 사파리는 성능이 충분하므로 최신 기기로 간주하여 에러 방지
            fullVersion = 'Non-Chrome';
            majorVersion = 100;
        }

        // App이 아닌 다른 클래스에서도 가져올 수 있게 System 매니저에 등록
        SystemMgr.handle.webviewVersion = fullVersion;
        // App이 아닌 다른 클래스에서도 가져올수 있게 System 매니저에 등록
        SystemMgr.handle._canvas = $config.canvas;
        SystemMgr.handle._context = $config.canvas.getContext('2d');
        SystemMgr.handle._stage = this._stage;
        SystemMgr.handle._sceneTypes = $config.scene;
        SystemMgr.handle._stageWidth = $config.width;
        SystemMgr.handle._stageHeight = $config.height;
        SystemMgr.handle._sceneContainer = this.sceneContainer;
        SystemMgr.handle._bottomContainer = this.bottomContainer;
        SystemMgr.handle._naviContainer = this.naviContainer;
        SystemMgr.handle._coverContainer = this.coverContainer;

        // 버전 및 구형 여부 (크롬 웹뷰 버전이 60 미만이면 구형으로 판단)
        SystemMgr.handle.webviewVersion = fullVersion;
        SystemMgr.handle.isOldDevice = majorVersion < 60 ? true : false;

        // 밀크T 포커스 인,아웃을 판단하는 이벤트 설정
        /**
         * 플레이어 deactive 상태 호출: Pause
         */
        window.onPauseContents = () => {
            createjs.Ticker.paused = true;
            // SoundMgr.handle.onPauseContents();
            TimeMgr.handle.onPauseContents();
        };

        /**
         * 플레이어 active 상태 호출: Resume
         */
        window.onResumeContents = () => {
            createjs.Ticker.paused = false;
            // SoundMgr.handle.onResumeContents();
            TimeMgr.handle.onResumeContents();
        };

        // 기기에 출력창 적용
        if ($config.outputWindow) SystemMgr.handle.useOutputWindow();
        window.addEventListener('resize', () => this.handleResize());

        // ✅ [추가] 생성 직후 즉시 실행
        this.handleResize();

        // ⚠️ [중요] requestAnimationFrame으로 한번 더 실행 (DOM 완전 로드 대기)
        requestAnimationFrame(() => {
            this.handleResize();
        });
    }

    private tick($e: createjs.Ticker): void {
        this._stage.update($e);
    }

    // 스테이지 리턴
    get stage(): createjs.Stage {
        return this._stage;
    }
    private handleResize(): void {
        const canvas = SystemMgr.handle._canvas;
        if (!canvas) return;

        UIScale.update();

        const sw = window.innerWidth;
        const sh = window.innerHeight;
        const dpr = window.devicePixelRatio || 1;

        canvas.width = sw * dpr;
        canvas.height = sh * dpr;

        // ✅ 세로 높이에 딱 맞춰 스케일 적용
        this._stage.scaleX = this._stage.scaleY = UIScale.scale * dpr;

        // ✅ 가로 중앙 정렬 (양옆 레터박스 생성)
        this._stage.x = UIScale.canvasOffsetX * UIScale.scale * dpr;
        this._stage.y = 0; // 세로는 항상 꽉 차있음

        this._stage.update();
    }
}

export default CoreApp;
