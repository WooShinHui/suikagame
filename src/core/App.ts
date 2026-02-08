import CoreApp, { AppConfig } from '../core/CoreApp';
import SceneX from './SceneX';
import WebFont from 'webfontloader';
import { SystemMgr } from '../manager/SystemMgr';
import { EventX } from './BaseComponent';
import { RscMgr } from '../manager/RscMgr';
import { TimeMgr } from '../manager/TimeMgr';
import { SoundMgr } from '../manager/SoundMgr';
import EVT from '../EVT';

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

                // ✅ 무조건 먼저 보여준다
                this.showLoadShot();

                // ✅ preload / create 완료까지 대기
                await scene.preload();
                await scene.create();

                // ✅ 끝났으면 즉시 제거
                this.hideLoadShot();

                scene.onMounted();
                break;
            }
        }

        if (!isValid) {
            console.error(
                `[Error] ${$sceneName} 이란 이름의 씬이 존재하지 않습니다.`
            );
        }
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
        const DESIGN_WIDTH = 1280;
        const DESIGN_HEIGHT = 800;

        const canvas = document.getElementById(
            'create_cvs'
        ) as HTMLCanvasElement;
        const loadShot = document.getElementById(
            'loadShot'
        ) as HTMLImageElement;

        if (!canvas || !loadShot) return;

        const rect = canvas.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        const scale = rect.width / DESIGN_WIDTH;

        Object.assign(loadShot.style, {
            left: `${rect.left + rect.width / 2}px`,
            top: `${rect.top + rect.height / 2}px`,
            transform: `translate(-50%, -50%) scale(${scale})`,
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
