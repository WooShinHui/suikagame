import { RscMgr } from './RscMgr';

interface ISound {
    snd: createjs.AbstractSoundInstance;
    tween: createjs.Tween;
}

export class SoundMgr {
    private static _handle: SoundMgr;

    private _sfxVolume: number = 0.5;
    private _bgmVolume: number = 0.2;
    private _bgmInitialized: boolean = false;
    private _bgm: HTMLAudioElement | null = null;
    private _narration: HTMLAudioElement | null = null;

    private _arr_snd: Array<ISound> = [];

    private soundCache: Record<string, HTMLAudioElement> = {};

    private audioCtx: AudioContext | null = null;
    private audioBuffers: Record<string, AudioBuffer> = {};

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
        // ✅ paused 상태 무관하게 파일명만 비교
        const newFilename = src.split('/').pop() ?? src;
        const currentFilename =
            this._bgm?.src?.split('/').pop()?.split('?')[0] ?? '';

        if (this._bgm && currentFilename === newFilename) {
            // 같은 곡 - 볼륨만 조정, 재시작 절대 안 함
            this._bgm.volume = this._bgmMuted ? 0 : volume / 100;
            if (this._bgm.paused) {
                this._bgm.play().catch(() => {});
            }
            (window as any)._log?.(`playBGM SKIPPED (same): ${newFilename}`);
            return;
        }

        (window as any)._log?.(`playBGM START: ${newFilename}`);

        if (this._bgm) {
            this._bgm.pause();
            this._bgm.src = '';
            this._bgm = null;
        }

        this._bgm = new Audio(src);
        this._bgm.volume = this._bgmMuted ? 0 : volume / 100;
        this._bgm.loop = true;
        this._bgm.muted = this._bgmMuted;
        this._bgm.play().catch((e) => {
            (window as any)._log?.(`playBGM FAILED: ${e.message}`);
        });
    }

    // BGM 곡 변경 시에만 사용 (강제 재시작)
    public changeBGM(src: string, volume: number): void {
        this._bgmInitialized = false; // 플래그 리셋 후 재시작
        this.playBGM(src, volume);
    }

    public resumeBGMIfPaused(): void {
        if (this._bgm && this._bgm.paused) {
            this._bgm.play().catch(() => {});
        }
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
            if (!this.audioCtx || !this.audioBuffers[name]) {
                resolve();
                return;
            }
            if (this._sfxMuted) {
                resolve();
                return;
            }

            const source = this.audioCtx.createBufferSource();
            source.buffer = this.audioBuffers[name];

            const gainNode = this.audioCtx.createGain();
            gainNode.gain.value = this._sfxVolume;

            source.connect(gainNode);
            gainNode.connect(this.audioCtx.destination);
            source.onended = () => resolve();
            source.start(0);
        });
    }

    /* =======================================================
        HTMLAudio SFX
    ======================================================= */
    private async preloadSfx() {
        this.audioCtx = new (window.AudioContext ||
            (window as any).webkitAudioContext)();

        // ✅ 순차 로드 (동시 스트림 한도 문제 없음)
        for (const name of this.SOUND_TABLE) {
            const isWav = ['beads', 'btn'].includes(name);
            const ext = isWav ? 'wav' : 'mp3';
            try {
                const res = await fetch(`./assets/sounds/${name}.${ext}`);
                const arrayBuffer = await res.arrayBuffer();
                this.audioBuffers[name] = await this.audioCtx.decodeAudioData(
                    arrayBuffer
                );
            } catch (e) {
                console.error(`[SoundMgr] 로드 실패: ${name}.${ext}`);
            }
        }
    }

    public playSfx(name: string) {
        if (!this.audioCtx || !this.audioBuffers[name]) return;
        if (this._sfxMuted) return;

        const source = this.audioCtx.createBufferSource();
        source.buffer = this.audioBuffers[name];

        const gainNode = this.audioCtx.createGain();
        gainNode.gain.value = this._sfxVolume;

        source.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);
        source.start(0);
    }

    public clearSoundInstance(): void {
        for (const snd of this._arr_snd) {
            snd.snd.stop();
            createjs.Tween.removeTweens(snd.tween);
        }
    }
}
