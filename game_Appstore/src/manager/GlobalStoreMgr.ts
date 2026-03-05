/**
 * 전역 저장소
 */

export class GlobalStoreMgr {
    private static _handle: GlobalStoreMgr;

    public APP_KEY: string = 'MY_APP_KEY';
    public MENU_INDEX: number = 1;

    private _progress: number = 1; // 서브 모듈 진행 index값

    static get handle(): GlobalStoreMgr {
        if (GlobalStoreMgr._handle === undefined) {
            GlobalStoreMgr._handle = new GlobalStoreMgr();
        }
        return GlobalStoreMgr._handle;
    }

    set progress($index: number) {
        if ($index > this._progress) this._progress = $index;
    }

    get progress(): number {
        return this._progress;
    }

    constructor() {}
}
