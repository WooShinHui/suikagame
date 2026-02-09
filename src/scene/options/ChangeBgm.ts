import PureDomX from '../../core/PureDomX';
import { EVT_HUB_SAFE } from '../../events/SafeEventHub';
import { G_EVT } from '../../events/EVT_HUB';
import { SoundMgr } from '../../manager/SoundMgr';
import { UIScale } from '../../ui/UIScale';

const BGM_LIST = [
    { src: 'assets/sounds/bgm.mp3', title: 'BASIC' },
    { src: 'assets/sounds/AI_2.mp3', title: 'HOPEFUL' },
    { src: 'assets/sounds/AI_3.mp3', title: 'RHYTHMIC' },
    { src: 'assets/sounds/AI_9.mp3', title: 'CHEERFUL' },
    { src: 'assets/sounds/AI_8.mp3', title: 'ENERGETIC' },
    { src: 'assets/sounds/AI_5.mp3', title: 'RETRO' },
    { src: 'assets/sounds/AI_6.mp3', title: 'YEAR-END' },
    { src: 'assets/sounds/AI_7.mp3', title: 'XMAS-EVE' },
    { src: 'assets/sounds/Lounge.mp3', title: 'Lounge' },
    { src: 'assets/sounds/Happy.mp3', title: 'Happy' },
    { src: 'assets/sounds/Warm.mp3', title: 'Warm' },
    { src: 'assets/sounds/Winter.mp3', title: 'Winter' },
    { src: 'assets/sounds/Jazz.mp3', title: 'Jazz' },
];

export class ChangeBgm extends PureDomX {
    private titleElement!: HTMLElement;
    private btnBgm!: HTMLButtonElement;
    private currentBgmIndex: number = 0;
    private static instance: ChangeBgm | null = null;

    constructor() {
        const container = document.createElement('div');
        super(container);

        if (ChangeBgm.instance) return ChangeBgm.instance;

        this.htmlElement.id = 'change-bgm-root';
        Object.assign(this.htmlElement.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: '1000',
            transform: 'none !important',
        });

        const canvas = document.querySelector('canvas');
        const parent = canvas?.parentElement || document.body;
        parent.appendChild(this.htmlElement);

        this.createElements();

        const savedIndex = localStorage.getItem('bgmIndex');
        if (savedIndex) this.currentBgmIndex = Number(savedIndex);
        this.updateTitleDisplay();

        setInterval(() => this.sparkleTitle(), 2800);

        ChangeBgm.instance = this;

        this.applyLayout();
        window.addEventListener('resize', () => this.applyLayout());
    }

    private createElements() {
        // BGM 버튼
        this.btnBgm = document.createElement('button');
        this.btnBgm.id = 'btn-bgm';
        Object.assign(this.btnBgm.style, {
            position: 'absolute',
            cursor: 'pointer',
            background:
                'url("/assets/images/bt_bgm_s.png") no-repeat center/contain',
            border: 'none',
            pointerEvents: 'auto',
        });
        this.htmlElement.appendChild(this.btnBgm);

        this.btnBgm.addEventListener('pointerdown', () => {
            this.btnBgm.style.backgroundImage =
                'url("/assets/images/bt_bgm_n.png")';
        });
        this.btnBgm.addEventListener('pointerleave', () => {
            this.btnBgm.style.backgroundImage =
                'url("/assets/images/bt_bgm_s.png")';
        });
        this.btnBgm.addEventListener('pointerup', () => {
            this.btnBgm.style.backgroundImage =
                'url("/assets/images/bt_bgm_s.png")';
        });
        this.btnBgm.addEventListener('pointercancel', () => {
            this.btnBgm.style.backgroundImage =
                'url("/assets/images/bt_bgm_s.png")';
        });
        this.btnBgm.onclick = () => {
            SoundMgr.handle.playSound('btn');
            this.changeNextBGM();
            this.sparkleTitle();
        };

        // 타이틀
        this.titleElement = document.createElement('div');
        Object.assign(this.titleElement.style, {
            position: 'absolute',
            fontFamily: '"PressStart2P-Regular", monospace',
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            color: '#F8E6B8',
            background: 'rgba(90, 65, 40, 0.78)',
            textAlign: 'center',
            whiteSpace: 'nowrap',
            transition: 'text-shadow 0.8s ease',
            pointerEvents: 'none',
            zIndex: '100',
        });
        this.htmlElement.appendChild(this.titleElement);
    }

    private changeNextBGM() {
        this.currentBgmIndex = (this.currentBgmIndex + 1) % BGM_LIST.length;
        const nextBGM = BGM_LIST[this.currentBgmIndex];
        EVT_HUB_SAFE.emit(G_EVT.BGM.CHANGE, nextBGM.src);
        localStorage.setItem('bgmIndex', String(this.currentBgmIndex));
        this.updateTitleDisplay();
    }

    private updateTitleDisplay() {
        this.titleElement.textContent = BGM_LIST[this.currentBgmIndex].title;
    }

    private sparkleTitle() {
        this.titleElement.style.textShadow = `
            0 0 4px rgba(255, 220, 160, 0.45),
            0 0 8px rgba(255, 200, 120, 0.25)
        `;
        setTimeout(() => {
            this.titleElement.style.textShadow = '0 0 1px rgba(0,0,0,0.7)';
        }, 900);
    }

    private applyLayout = () => {
        this.htmlElement.style.transform = 'none';

        const sw = window.innerWidth;
        const size = sw < 400 ? 50 : 60;
        const margin = 30;

        UIScale.layoutElementViewport(
            this.btnBgm,
            'left',
            'top',
            margin,
            60,
            size,
            size
        );

        // ✅ 타이틀: 버튼 오른쪽 (절대 위치)
        const titleLeft = 40 + 60 + 10; // 버튼 왼쪽(40) + 버튼 크기(60) + 간격(10)
        this.titleElement.style.left = `${titleLeft}px`;
        this.titleElement.style.top = '68px';

        // 크기는 고정
        this.titleElement.style.padding = '10px 18px';
        this.titleElement.style.borderRadius = '12px';
        this.titleElement.style.fontSize = '12px';
        this.titleElement.style.boxShadow = `
            0 0 0 3px #7a5a28,
            0 0 0 6px #e6c87a,
            0 0 0 9px #b08a3a,
            inset -2px -2px 3px rgba(0,0,0,0.35)
        `;
        this.titleElement.style.textShadow = '0 0 1px rgba(0,0,0,0.7)';
    };
}
