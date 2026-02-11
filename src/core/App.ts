import CoreApp, { AppConfig } from '../core/CoreApp';
import SceneX from './SceneX';
import WebFont from 'webfontloader';
import { SystemMgr } from '../manager/SystemMgr';
import { EventX } from './BaseComponent';
import { RscMgr } from '../manager/RscMgr';
import { TimeMgr } from '../manager/TimeMgr';
import { SoundMgr } from '../manager/SoundMgr';
import EVT from '../EVT';
import { UIScale } from '../ui/UIScale';
class App extends CoreApp {
    constructor($config: AppConfig) {
        super($config);

        window.addEventListener('resize', () => {
            this.updateLoadShot();
        });

        this.observeCanvasResize();
        this.onInit();
    }

    private async onInit() {
        this.createScene();
        await this.loadManifest();
        await this.loadResource();
        await this.loadFonts();

        // ✅ [추가] 리소스 로드 완료 후 resize 한번 더
        requestAnimationFrame(() => {
            const canvas = SystemMgr.handle._canvas;
            if (canvas && canvas.offsetWidth > 0) {
                // DOM이 완전히 렌더링된 후 실행
                (this as any).handleResize?.(); // CoreApp의 handleResize 호출
            }
        });

        this.startFirstScene();
    }

    // 씬을 동적으로 생성한다.
    private createScene(): void {
        // 시스템 매니저 _sceneTypes 들어있는 데이타는 씬이 아닌 씬의 타입.
        const scenes: (typeof SceneX)[] = [...SystemMgr.handle._sceneTypes];
        // const scenes: (typeof SceneExtends)[] = SystemMgr.handle.scenes;

        // 해당 타입의 씬을 생성해서 시스템 매니저의 배열에 넣어준다.
        scenes.map((SceneClass) => {
            const scene = new SceneClass();
            SystemMgr.handle.pushScene(scene);
        });
    }

    // 폰트 로드
    private loadFonts(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            WebFont.load({
                custom: {
                    // families: ['HUGoth350', 'HUNemogulim170', 'HUSun160'],
                    families: ['HUGoth370'],
                    urls: ['fonts/fonts.css'],
                },
                active: () => {
                    // console.log(" font loaded");
                    resolve();
                },
                fontloading: (fontname: string) => {
                    // console.log('fontLoading', fontname);
                    // resolve();
                },
            });
        });
    }

    /**
     * 매니페스트 목록을 가지고 있는 JSON 파일을 로드 한다.
     * 로드가 성공되면 매니저의 MANIFEST 변수에 담아 둔다.
     * MANIFEST는 상수로 취급한다.
     * @returns
     */
    private async loadManifest(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const queue = new createjs.LoadQueue(true);
            queue.addEventListener('fileload', ($e: createjs.Event) => {
                const result = $e.result as any;
                RscMgr.handle.MANIFEST = result;
                console.log(
                    `%c매니페스트 로드 성공`,
                    'font-weight: bold;background: yellow; color: blue; font-size: 20px;'
                );
                resolve();
            });

            queue.addEventListener('error', ($e: createjs.ErrorEvent) => {
                console.error('매니페스트 로드 실패', $e);
                reject();
            });

            queue.loadFile({
                id: 'manifest',
                src: 'assets/manifest.json',
                type: 'json',
            });
        });
    }

    /**
     * 매니페스트 목록의 리소스를 로드한다.
     * @returns
     */
    private async loadResource(): Promise<void> {
        if (RscMgr.handle.MANIFEST === null) return;
        try {
            await RscMgr.handle.loadManifestResource();
        } catch ($err: unknown) {
            console.error(
                `[Error] 매니페스트에 등록된 리소스 로드에 실패 했습니다. msg:${$err}`
            );
        }
    }

    // 최초 씬을 렌더링 한다.
    private startFirstScene(): void {
        if (SystemMgr.handle._scenes.length === 0) {
            console.log('생성된 Scene이 없습니다.');
            return;
        }

        const sceneName = SystemMgr.handle._scenes[0].name;
        this.start(sceneName);
    }

    // App.ts
    private async start($sceneName: string) {
        let isValid = false;

        document.querySelectorAll('canvas').forEach((c) => {
            if (c.id !== 'create_cvs') c.remove();
        });

        for (const scene of SystemMgr.handle._scenes) {
            if ($sceneName === scene.name) {
                isValid = true;

                createjs.Sound.stop();
                TimeMgr.handle.cleartAllTimeValue();
                SoundMgr.handle.clearSoundInstance();

                this.removeNavi();
                this.naviContainer.removeAllChildren();

                this.removeScean();
                this.sceneContainer.removeAllChildren();

                this.sceneContainer.addChild(scene);

                scene.addEventListenerX(
                    EVT.SCENE_START,
                    async ($e: EventX) => {
                        await this.start($e.sceneName);
                    },
                    this
                );

                SystemMgr.handle.currentSceneName = scene.name;

                // ✅ 씬 추가 직후 강제 resize
                console.log('🔧 씬 추가 직후 강제 resize');
                this.handleResize();

                this.showLoadShot();

                await scene.preload();
                await scene.create();

                this.hideLoadShot();

                // ✅ onMounted 직전에도 한번 더
                console.log('🔧 onMounted 직전 강제 resize');
                this.handleResize();

                scene.onMounted();

                // ✅ onMounted 직후에도 한번 더 (안전장치)
                requestAnimationFrame(() => {
                    console.log('🔧 onMounted 직후 강제 resize');
                    this.handleResize();
                });

                break;
            }
        }

        if (!isValid) {
            console.error(
                `[Error] ${$sceneName} 이란 이름의 씬이 존재하지 않습니다.`
            );
        }
    }

    // ✅ handleResize를 public으로 변경 (외부 호출 가능)
    public handleResize(): void {
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

        console.log('📐 handleResize 실행:', {
            scale: UIScale.scale,
            stageScaleX: this._stage.scaleX,
            stageX: this._stage.x,
            canvasWidth: canvas.width,
            canvasHeight: canvas.height,
        });
    }

    private observeCanvasResize() {
        const canvas = document.getElementById('create_cvs');
        if (!canvas) return;

        const observer = new ResizeObserver(() => {
            this.updateLoadShot();
        });

        observer.observe(canvas);
    }
    private updateLoadShot() {
        const canvas = document.getElementById(
            'create_cvs'
        ) as HTMLCanvasElement;
        const loadShot = document.getElementById(
            'loadShot'
        ) as HTMLImageElement;

        if (!canvas || !loadShot) return;

        const rect = canvas.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        // ✅ UIScale 업데이트
        UIScale.update();

        Object.assign(loadShot.style, {
            left: `${rect.left + rect.width / 2}px`,
            top: `${rect.top + rect.height / 2}px`,
            transform: `translate(-50%, -50%) scale(${UIScale.scale})`,
            opacity: 1,
        });
    }
    private showLoadShot() {
        const loadShot = document.getElementById(
            'loadShot'
        ) as HTMLImageElement;
        if (!loadShot) return;

        this.updateLoadShot();
    }

    private hideLoadShot() {
        const loadShot = document.getElementById(
            'loadShot'
        ) as HTMLImageElement;
        if (!loadShot) return;

        loadShot.style.display = 'none'; // 🔥 이게 핵심
    }

    private removeScean() {
        if (this.sceneContainer.children.length > 0) {
            this.sceneContainer.children.forEach((child) => {
                if (child instanceof SceneX) {
                    child.removeAllEventListeners();
                    child.onUnmounted();
                    this.sceneContainer.removeChild(child);
                }
            });
        }
    }

    private removeNavi() {
        if (this.naviContainer.children.length > 0) {
            this.naviContainer.children.forEach((child) => {
                if (child instanceof SceneX) {
                    child.removeAllEventListeners();
                    this.naviContainer.removeChild(child);
                }
            });
        }
    }
}

export default App;
