export class TimeMgr {
    private static _handle: TimeMgr;

    private _intervalIdCounter = 0;
    private _timeoutIdCounter = 0;

    private _arr_delay: Array<createjs.Tween>;

    // setInterval obj
    private _intervalMap: { [key: number]: createjs.Tween };
    // setTimeOut obj
    private _timeoutMap: { [key: number]: createjs.Tween };

    static get handle(): TimeMgr {
        if (TimeMgr._handle === undefined) {
            TimeMgr._handle = new TimeMgr();
        }
        return TimeMgr._handle;
    }

    constructor() {
        this._arr_delay = [];
        this._intervalMap = {};
        this._timeoutMap = {};
    }

    /**
     * 딜레이를 준다.
     * @param {number} $ms // 1000 = 1초
     */
    public delay($ms: number): Promise<void> {
        return new Promise((resolve) => {
            const dummy = {};
            const tween = createjs.Tween.get(dummy)
                .wait($ms)
                .call(() => {
                    resolve();
                });

            this._arr_delay.push(tween);
        });
    }

    /**
     * createjs.Tween을 사용한 setInterval() 대체 함수
     * @param $callback
     * @param $time
     * @returns
     */
    public setIntervalX($callback: Function, $time: number): number {
        const id = ++this._intervalIdCounter;
        const tween = createjs.Tween.get({}, { loop: -1 })
            .wait($time)
            .call(() => $callback());

        this._intervalMap[id] = tween;
        return id;
    }

    /**
     *  createjs.Tween을 사용한 clearInterval() 대체 함수
     * @param $id
     */
    public clearIntervalX($id: number): void {
        const tween = this._intervalMap[$id];
        if (tween) {
            tween.pause();
            createjs.Tween.removeTweens(tween.target);
            delete this._intervalMap[$id];
        }
    }

    /**
     * createjs.Tween을 사용한 setTimeout() 대체 함수
     * @param $callback
     * @param $time
     * @returns
     */
    public setTimeoutX($callback: Function, $time: number): number {
        const id = ++this._timeoutIdCounter;

        const tween = createjs.Tween.get({})
            .wait($time)
            .call(() => {
                $callback();
                this.clearTimeoutX(id); // 완료 후 정리
            });

        this._timeoutMap[id] = tween;
        return id;
    }

    /**
     * createjs.Tween을 사용한 clearTimeout() 대체 함수
     * @param $id
     */
    public clearTimeoutX($id: number): void {
        const tween = this._timeoutMap[$id];
        if (tween) {
            tween.pause();
            createjs.Tween.removeTweens(tween.target);
            delete this._timeoutMap[$id];
        }
    }

    /**
     * 해당 매니저에서 등록된 모든 비동기 처리 객체들을 초기화 한다.
     */
    public cleartAllTimeValue(): void {
        // delay 제거
        for (const delay of this._arr_delay) {
            createjs.Tween.removeTweens(delay);
        }
        this._arr_delay = [];

        // intervalMap에 등록된 모든 interval 제거
        for (const intervalId in this._intervalMap) {
            if (this._intervalMap.hasOwnProperty(intervalId)) {
                this.clearIntervalX(+intervalId); // +intervalId: string → number 변환
            }
        }

        // timeoutMap에 등록된 모든 timeout 제거
        for (const timeoutId in this._timeoutMap) {
            if (this._timeoutMap.hasOwnProperty(timeoutId)) {
                this.clearTimeoutX(+timeoutId);
            }
        }
    }

    // [밀크T 포커스 인,아웃]
    public onPauseContents(): void {}

    public onResumeContents(): void {}
}
