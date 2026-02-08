import SceneX from '../core/SceneX';
import ContainerX from '../core/ContainerX';
import LogX from '../core/LogX';

export class SystemMgr {
    private static _handle: SystemMgr;

    private _currentSceneName: string;

    public _canvas: HTMLCanvasElement;
    public _context: CanvasRenderingContext2D;
    public _stage: createjs.Stage;

    public _stageWidth: number;
    public _stageHeight: number;

    private _webviewVersion: string;
    private _isOldDevice: boolean;

    public _scenes: Array<SceneX>;

    public totalScenes: number = 0;

    public _sceneTypes: (typeof SceneX)[];

    public _sceneContainer: ContainerX;
    public _bottomContainer: ContainerX;
    public _naviContainer: ContainerX;
    public _coverContainer: ContainerX;

    public _logX: LogX;

    public bgm: HTMLAudioElement;

    static get handle(): SystemMgr {
        if (SystemMgr._handle === undefined) {
            SystemMgr._handle = new SystemMgr();
        }
        return SystemMgr._handle;
    }

    constructor() {
        this._scenes = [];
        this.bgm = new Audio();
        this.bgm.loop = true;
    }

    public pushScene($scene: any): void {
        $scene.index = this._scenes.length;
        this._scenes.push($scene);
        this.totalScenes = this._scenes.length;
    }

    public playBGM($src: string, $volume?: number): void {
        this.bgm.pause();
        this.bgm.src = $src;
        if ($volume) this.bgm.volume = $volume;
        this.bgm.load();
        this.bgm.play();
    }

    public stopBGM(): void {
        this.bgm.pause();
    }

    public useOutputWindow(): void {
        this._logX = new LogX();
    }

    public showLog($log: any) {
        if (this._logX) this._logX.showLog($log);
    }

    set webviewVersion($ver: string) {
        this._webviewVersion = $ver;
    }

    get webviewVersion(): string {
        return this._webviewVersion;
    }

    set isOldDevice($bool: boolean) {
        this._isOldDevice = $bool;
    }

    get isOldDevice(): boolean {
        return this._isOldDevice;
    }

    set currentSceneName($name: string) {
        this._currentSceneName = $name;
    }
    get currentScenName(): string {
        return this._currentSceneName;
    }

    get canvas(): HTMLCanvasElement {
        return this._canvas;
    }

    get context(): CanvasRenderingContext2D {
        return this._context;
    }

    get stage(): createjs.Stage {
        return this._stage;
    }

    get stageWidth(): number {
        return this._stageWidth;
    }

    get stageHeight(): number {
        return this._stageHeight;
    }

    get sceneTypes(): (typeof SceneX)[] {
        return this._sceneTypes;
    }

    get sceneCt(): ContainerX {
        return this._sceneContainer;
    }

    get bottomCt(): ContainerX {
        return this._bottomContainer;
    }

    get naviCt(): ContainerX {
        return this._naviContainer;
    }

    get coverCt(): ContainerX {
        return this._coverContainer;
    }

    // get scene(): SceneExtends {
    //     reutrn
    // }
}
