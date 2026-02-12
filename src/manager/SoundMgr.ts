import { RscMgr } from './RscMgr';

interface ISound {
    snd: createjs.AbstractSoundInstance;
    tween: createjs.Tween;
}

export class SoundMgr {
    private static _handle: SoundMgr;

    private _sfxVolume: number = 0.5;
    private _bgmVolume: number = 0.2;

    private _bgm: HTMLAudioElement | null = null;
    private _narration: HTMLAudioElement | null = null;

    private _arr_snd: Array<ISound> = [];

    private soundCache: Record<string, HTMLAudioElement> = {};

    private readonly SOUND_TABLE: string[] = [
        'pu_0',
        'pu_1',
        'pu_2',
        'pu_3',
        'pu_4',
        'beori',
        'nyangi',
        'tori',
        'dogi',
        'deumi',
        'clear',
        'warning',
        'beads',
        'btn',
    ];

    private _bgmMuted: boolean = false;
    private _sfxMuted: boolean = false;

    static get handle(): SoundMgr {
        if (!SoundMgr._handle) {
            SoundMgr._handle = new SoundMgr();
        }
        return SoundMgr._handle;
    }

    constructor() {
        this.preloadSfx();
        // this._bgm = new Audio('assets/sounds/bgm.mp3');
    }

    /* =======================================================
        🔊 BGM 볼륨
    ======================================================= */
    public set bgmVolume(v: number) {
        this._bgmVolume = v;

        if (this._bgm && !this._bgmMuted) {
            this._bgm.volume = v;
        }
    }
    public get bgmVolume(): number {
        return this._bgmVolume;
    }

    /* =======================================================
        🔇 BGM Mute
    ======================================================= */
    public set bgmMuted(m: boolean) {
        this._bgmMuted = m;
        if (this._bgm) this._bgm.muted = m;
    }
    public get bgmMuted(): boolean {
        return this._bgmMuted;
    }

    /* =======================================================
        🔊 SFX 볼륨
    ======================================================= */
    public set sfxVolume(v: number) {
        this._sfxVolume = v;

        for (const s of this._arr_snd) {
            s.snd.volume = v;
        }

        // preload된 HTMLAudio에도 적용
        Object.values(this.soundCache).forEach((audio) => {
            if (!this._sfxMuted) audio.volume = v;
        });
    }
    public get sfxVolume(): number {
        return this._sfxVolume;
    }

    /* =======================================================
        🔇 SFX Mute
    ======================================================= */
    public set sfxMuted(m: boolean) {
        this._sfxMuted = m;

        // createjs 사운드 mute
        for (const s of this._arr_snd) {
            s.snd.muted = m;
        }

        // HTMLAudio mute
        Object.values(this.soundCache).forEach((audio) => {
            audio.muted = m;
        });
    }
    public get sfxMuted(): boolean {
        return this._sfxMuted;
    }

    /* =======================================================
        BGM
    ======================================================= */
    public playBGM(src: string, volume: number): void {
        if (this._bgm) {
            this._bgm.pause();
            this._bgm = null;
        }
        this._bgm = new Audio(src);

        this._bgm.currentTime = 0;
        this._bgmVolume = volume;
        this._bgm.volume = volume / 100;
        this._bgm.loop = true;
        this._bgm.muted = this._bgmMuted;

        this._bgm.play().catch(() => {});
    }

    public pauseBGM(): void {
        this._bgm?.pause();
    }
    public resumeBGM(): void {
        this._bgm?.play().catch(() => {});
    }
    public stopBGM(): void {
        this._bgm?.pause();
        this._bgm = null;
    }

    /* =======================================================
        Narration
    ======================================================= */
    public playNarration(src: string) {
        this._narration = new Audio(src);
        this._narration.play().catch(() => {});
    }

    /* =======================================================
        Sound Effect (createjs)
    ======================================================= */
    public playSound(name: string): Promise<void> {
        return new Promise((resolve) => {
            const audio = this.soundCache[name];

            if (!audio) {
                console.warn(
                    `[SoundMgr] ${name} 사운드를 캐시에서 찾을 수 없습니다.`
                );
                resolve();
                return;
            }

            // 기존 재생 중이면 처음으로 되감기
            audio.currentTime = 0;
            audio.volume = this._sfxVolume;
            audio.muted = this._sfxMuted;

            // 재생 완료 시 Promise resolve
            const onEnded = () => {
                audio.removeEventListener('ended', onEnded);
                resolve();
            };
            audio.addEventListener('ended', onEnded);

            audio.play().catch((e) => {
                console.error('재생 실패:', e);
                resolve();
            });

            // (선택 사항) 중단 관리를 위해 배열에 보관하고 싶다면
            // ISound 인터페이스를 HTMLAudioElement를 지원하도록 수정해야 합니다.
        });
    }

    /* =======================================================
        HTMLAudio SFX
    ======================================================= */
    private preloadSfx() {
        this.SOUND_TABLE.forEach((name) => {
            // beads와 btn은 로그상 .wav 파일입니다. 나머지는 .mp3로 가정합니다.
            const isWav = ['beads', 'btn'].includes(name);
            const ext = isWav ? 'wav' : 'mp3';

            const audio = new Audio(`assets/sounds/${name}.${ext}`);

            // 에러 핸들링 추가: 로드 실패 시 로그 출력
            audio.onerror = () => {
                console.error(
                    `[SoundMgr] 파일 로드 실패: assets/sounds/${name}.${ext}`
                );
            };

            audio.preload = 'auto';
            audio.volume = this._sfxVolume;
            audio.muted = this._sfxMuted;
            this.soundCache[name] = audio;
        });
    }

    public playSfx(name: string) {
        const audio = this.soundCache[name];
        if (!audio) return;

        audio.volume = this._sfxVolume;
        audio.muted = this._sfxMuted;

        audio.currentTime = 0;
        audio.play().catch(() => {});
    }

    public clearSoundInstance(): void {
        for (const snd of this._arr_snd) {
            snd.snd.stop();
            createjs.Tween.removeTweens(snd.tween);
        }
    }
}
