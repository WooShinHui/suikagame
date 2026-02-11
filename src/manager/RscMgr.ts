/**
 * 리소스 구조
 */
interface RSC {
    readonly id?: string;
    readonly key: string;
    readonly src: string;
    readonly sync?: boolean;
    readonly explan?: string;
}

interface ResourceTableScene {
    animate?: Array<RSC>;
    images?: Array<RSC>;
    sounds?: Array<RSC>;
    jsons?: Array<RSC>;
    video?: Array<RSC>;
}

/**
 * 매니페스트 JSON 구조
 */
interface ResourceTable {
    animate?: Array<RSC>;
    images?: Array<RSC>;
    sounds?: Array<RSC>;
    jsons?: Array<RSC>;
    video?: Array<RSC>;
    [key: string]: Array<RSC> | ResourceTableScene | undefined;
}

declare class AdobeAn {
    static getComposition(composition: string);
}

export class RscMgr {
    private static _handle: RscMgr;
    static get handle(): RscMgr {
        if (RscMgr._handle === undefined) {
            RscMgr._handle = new RscMgr();
        }
        return RscMgr._handle;
    }

    public MANIFEST: ResourceTable;
    private mURLRoot: string;
    private mCommonQueue: createjs.LoadQueue;
    private mLibrary: { [name: string]: string | any };

    // 블로킹 리소스 (로딩 중 다른 처리를 막는 리소스 / 로딩이 많이 걸려 비동기 처리 할 수 없는 리소스를 넣어준다.)
    private blockingRSC: Array<RSC>;

    constructor() {
        // this.mURLRoot = 'http://www.co.kr/';
        this.mURLRoot = '';
        createjs.Sound.alternateExtensions = ['mp3'];
        this.mCommonQueue = new createjs.LoadQueue(true);
        this.mCommonQueue.installPlugin(createjs.Sound);
        this.mLibrary = {};
        this.blockingRSC = [];
    }

    /**
     * 로드큐에 등록되어 있는 리소스를 제거한다.
     * @param $key 키값
     */
    public destory($key: string): void {
        this.mCommonQueue.remove($key);
        // 참조가 남아있을 경우를 대비.
        let rsc = this.mCommonQueue.getResult($key);
        if (rsc) rsc = null;
    }

    public getQueue(): createjs.LoadQueue {
        return this.mCommonQueue;
    }

    public getLibrary($fname: string, $link?: string): createjs.MovieClip {
        const lib = this.mLibrary[`${$fname}`];

        if (!lib) throw new Error(`[${$fname}] 라이브러리를 찾을 수 업습니다.`);

        if ($link && typeof lib != 'string') {
            try {
                const mc = new lib[$link]();
                return mc;
            } catch ($e: unknown) {
                throw new Error(
                    `[${$fname}] 라이브러리의 [${$link}] 링크를 찾을 수 업습니다.`
                );
            }
        } else {
            return lib;
        }
    }

    public getSound($key: string): createjs.AbstractSoundInstance {
        const snd = createjs.Sound.createInstance($key);
        if (!snd || typeof snd.src != 'string' || snd.duration === 0) {
            throw new Error(
                `[${$key}] 키 값을 찾을수 없거나 타입이 잘못되었습니다.`
            );
        }
        return createjs.Sound.createInstance($key);
    }

    public getImage($key: string): createjs.Bitmap {
        const item = this.mCommonQueue.getItem($key);

        if (!item || item['type'] != 'image') {
            throw new Error(
                `[${$key}] 키 값을 찾을수 없거나 타입이 잘못되었습니다.`
            );
        }

        const img = new createjs.Bitmap(
            this.mCommonQueue.getResult($key, false)
        );
        return img;
    }

    public getJSON($key: string): object {
        const item = this.mCommonQueue.getItem($key);

        if (!item || item['type'] != 'json') {
            throw new Error(
                `[${$key}] 키 값을 찾을수 없거나 타입이 잘못되었습니다.`
            );
        }

        return this.mCommonQueue.getResult($key, false);
    }

    public async loadManifestResource(): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            for (const category in this.MANIFEST) {
                if (
                    category === 'animate' ||
                    category === 'sounds' ||
                    category === 'images' ||
                    category === 'jsons' ||
                    category == 'video'
                ) {
                    console.log(
                        `%c공용 ${category} : 리소스 비동기 처리 로드 시작`,
                        'font-weight: bold;background: black; color: white; font-size: 20px;'
                    );
                    const rscArr = this.MANIFEST[category] as Array<RSC>;
                    let index = 0;
                    for (const rsc of rscArr) {
                        console.log(
                            `%ccategory:${category}[${index}] %c\nkey:${rsc.key}\nsrc:${rsc.src}`,
                            `color:blue`,
                            `color:green`
                        );

                        const item = this.mCommonQueue.getItem(rsc.key);
                        if (item)
                            console.log(
                                `${rsc.key}키 값이 존재합니다. 덮어쓰기 됩니다.`
                            );

                        // 무비클립인 경우엔 loadLibrary 그 외엔 loadResource를 사용한다.
                        if (category === 'animate') {
                            await this.loadLibrary(rsc.id, rsc.key, rsc.src);
                        } else {
                            if (rsc.sync === false && category === 'sounds') {
                                this.blockingRSC.push(rsc);
                            } else {
                                await this.loadResource(rsc.key, rsc.src);
                            }
                        }
                        index++;
                    }
                } else {
                    // 개별 씬 속성
                    const scene_table = this.MANIFEST[
                        category
                    ] as ResourceTable;

                    for (const scene_category in scene_table) {
                        console.log(
                            `%c${category} : ${scene_category} 리소스 비동기 처리 로드 시작`,
                            'font-weight: bold;background: black; color: white; font-size: 20px;'
                        );

                        const rscArr = scene_table[
                            scene_category
                        ] as Array<RSC>;
                        let index = 0;

                        for (const rsc of rscArr) {
                            console.log(
                                `%ccategory:${scene_category}[${index}] %c\nkey:${rsc.key}\nsrc:${rsc.src}`,
                                `color:blue`,
                                `color:green`
                            );

                            const item = this.mCommonQueue.getItem(rsc.key);
                            if (item)
                                console.log(
                                    `${rsc.key}키 값이 존재합니다. 덮어쓰기 됩니다.`
                                );

                            // 무비클립인 경우엔 loadLibrary 그 외엔 loadResource를 사용한다.
                            if (scene_category === 'animate') {
                                await this.loadLibrary(
                                    rsc.id,
                                    rsc.key,
                                    rsc.src
                                );
                            } else {
                                if (
                                    rsc.sync === false &&
                                    scene_category === 'sounds'
                                ) {
                                    this.blockingRSC.push(rsc);
                                } else {
                                    await this.loadResource(rsc.key, rsc.src);
                                }
                            }
                            index++;
                        }
                    }
                }
            }
            this.loadblockingSound();
            resolve();
        });
    }

    /**
     * 리소스를 로드하여 큐에 올린다.
     * @param $key 키값
     * @param $src 리소스 경로
     * @returns
     */
    public async loadResource($key: string, $src: string): Promise<void> {
        const item = this.mCommonQueue.getItem($key);
        if (item) {
            return; // 이미 등록됨
        }

        return new Promise<void>((resolve, reject) => {
            const onLoad = ($e: createjs.Event) => {
                if ($e.item.id === $key) {
                    this.mCommonQueue.removeEventListener('fileload', onLoad);
                    this.mCommonQueue.removeEventListener('error', onError);

                    // ❌ 아래의 registerSound 코드를 제거합니다.
                    // LoadQueue가 installPlugin(createjs.Sound) 상태라면
                    // 이미 내부적으로 등록이 완료된 상태입니다.
                    /*
                    if (extension === 'mp3') {
                        createjs.Sound.registerSound($src, $key);
                    }
                    */
                    resolve();
                }
            };

            const onError = ($e: createjs.Event) => {
                if ($e.item.id === $key) {
                    this.mCommonQueue.removeEventListener('fileload', onLoad);
                    this.mCommonQueue.removeEventListener('error', onError);
                    reject(new Error(`로드 실패: ${$src}`));
                }
            };

            this.mCommonQueue.addEventListener('fileload', onLoad);
            this.mCommonQueue.addEventListener('error', onError);

            this.mCommonQueue.loadFile({
                id: `${$key}`,
                src: `${this.mURLRoot}${$src}`,
            });
        });
    }

    /**
     * 비동기 로드 처리를 하지 않는 사운드  로딩
     */
    private loadblockingSound(): void {
        const len = this.blockingRSC.length;
        for (let i = 0; i < len; i++) {
            const key = this.blockingRSC[i].key;
            const src = this.blockingRSC[i].src;

            if (createjs.Sound.loadComplete(key)) {
                console.error(`해당 키 ${key} 는 등록된 키 입니다.`);
            } else {
                createjs.Sound.registerSound(src, key);
            }
        }
    }

    async loadLibrary($id: string, $key: string, $src: string): Promise<void> {
        await this.loadJsFile($src);
        this.mLibrary[$key] = await this.loadAnimate($id, $key);
    }

    private async loadJsFile(src: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const themejs = document.createElement('script');
            themejs.setAttribute('src', src);
            document.head.appendChild(themejs);
            themejs.onload = () => {
                resolve();
            };
        });
    }

    private async loadAnimate(id: string, name?: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const comp = AdobeAn.getComposition(id);
            const lib = comp.getLibrary();
            const loader = new createjs.LoadQueue(false);
            loader.installPlugin(createjs.Sound);
            loader.on('fileload', (evt: any) => {
                const images = comp.getImages();
                if (evt && evt.item.type == 'image') {
                    images[evt.item.id] = evt.result;
                }
            });

            loader.on('complete', (evt: any) => {
                const ss = comp.getSpriteSheet();
                const queue = evt.target;
                const ssMetadata = lib.ssMetadata;
                for (let i = 0; i < ssMetadata.length; i++) {
                    ss[ssMetadata[i].name] = new createjs.SpriteSheet({
                        images: [queue.getResult(ssMetadata[i].name)],
                        frames: ssMetadata[i].frames,
                    });
                }
                console.log(`로드 성공`);
                resolve(lib);
            });

            if (lib.properties.manifest.length > 0) {
                loader.loadManifest(lib.properties.manifest);
            } else {
                resolve(lib);
            }
        });
    }

    // private typeCheck($key: string): void {
    //     const result = this.mCommonQueue.getResult($key);
    //     const item = this.mCommonQueue.getItem($key);
    // }
}
