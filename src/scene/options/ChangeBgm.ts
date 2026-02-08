import DomX from '../../core/DomX';
import { EVT_HUB, G_EVT } from '../../events/EVT_HUB';
import { EVT_HUB_SAFE } from '../../events/SafeEventHub';
import { SoundMgr } from '../../manager/SoundMgr';
import { API_CONNECTOR } from '../../fetch/ApiConnector';
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

export class ChangeBgm extends DomX {
    private titleElement!: HTMLElement;
    private btnBgm!: HTMLButtonElement;
    private btnReset!: HTMLButtonElement;
    private currentBgmIndex: number = 0;
    private static instance: ChangeBgm | null = null; // 싱글톤
    private wasInit: boolean = false;

    constructor() {
        super(document.createElement('div'));
        if (ChangeBgm.instance) return ChangeBgm.instance;

        this.htmlElement.id = 'change-bgm-root';
        Object.assign(this.htmlElement.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            pointerEvents: 'none', // 자식 버튼만 이벤트 받도록
        });

        // 캔버스 루트에 추가
        const canvas = document.querySelector('canvas');
        const parent = canvas?.parentElement || document.body;
        parent.appendChild(this.htmlElement);

        this.createElements();

        // 로컬 저장값 불러오기
        const getIndex = localStorage.getItem('bgmIndex');
        if (getIndex) this.currentBgmIndex = Number(getIndex);
        this.updateTitleDisplay();

        // 타이틀 주기적 반짝
        setInterval(() => this.sparkleTitle(), 2800);

        ChangeBgm.instance = this;

        EVT_HUB_SAFE.on(G_EVT.DATA.SCORE_RESET_SUCCESS, (e) => {
            this.wasInit = e.data;
        });
        EVT_HUB_SAFE.on(G_EVT.DATA.SCORE_RESET_FAIL, (e) => {
            this.wasInit = e.data;
        });

        this.applyLayout();
        window.addEventListener('resize', () => {
            UIScale.update(); // 화면 크기 변경에 따른 스케일 업데이트
            this.applyLayout();
        });
    }

    private createElements() {
        // BGM 버튼
        this.btnBgm = document.createElement('button');
        this.btnBgm.id = 'btn-bgm';
        Object.assign(this.btnBgm.style, {
            position: 'absolute',
            width: UIScale.px(189),
            height: UIScale.px(83),
            top: UIScale.posY(596),
            left: UIScale.posX(20),
            cursor: 'pointer',
            background:
                'url("/assets/images/bt_bgm_s.png") no-repeat center/contain',
            border: 'none',
            pointerEvents: 'auto',
        });
        this.htmlElement.appendChild(this.btnBgm);

        this.btnBgm.addEventListener('pointerdown', () => {
            this.btnBgm.style.backgroundImage = `url("/assets/images/bt_bgm_n.png")`;
        });
        this.btnBgm.addEventListener('pointerleave', () => {
            this.btnBgm.style.backgroundImage = `url("/assets/images/bt_bgm_s.png")`;
        });
        this.btnBgm.addEventListener('pointerup', () => {
            this.btnBgm.style.backgroundImage = `url("/assets/images/bt_bgm_s.png")`;
        });
        this.btnBgm.addEventListener('pointecancel', () => {
            this.btnBgm.style.backgroundImage = `url("/assets/images/bt_bgm_s.png")`;
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
            top: UIScale.posY(700),
            left: UIScale.posX(26),
            fontFamily: '"PressStart2P-Regular", monospace',
            fontSize: UIScale.px(18),
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            color: '#F8E6B8',
            background: 'rgba(90, 65, 40, 0.78)',
            padding: `${UIScale.px(14)} ${UIScale.px(36)}`,
            borderRadius: UIScale.px(18),
            textAlign: 'center',
            whiteSpace: 'nowrap',
            outline: '4px solid transparent',
            backgroundClip: 'padding-box',
            boxShadow: `
                0 0 0 ${UIScale.px(3)} #7a5a28,
                0 0 0 ${UIScale.px(6)} #e6c87a,
                0 0 0 ${UIScale.px(9)} #b08a3a,
                inset -${UIScale.px(2)} -${UIScale.px(2)} ${UIScale.px(
                3
            )} rgba(0,0,0,0.35)
            `,
            textShadow: `0 0 ${UIScale.px(1)} rgba(0,0,0,0.7)`,
            transition: 'text-shadow 0.8s ease',
            pointerEvents: 'none',
            zIndex: 100,
        });
        this.htmlElement.appendChild(this.titleElement);

        // 점수 리셋 버튼
        // this.btnReset = document.createElement('button');
        // Object.assign(this.btnReset.style, {
        //     position: 'absolute',
        //     width: UIScale.px(189),
        //     height: UIScale.px(83),
        //     top: UIScale.posY(300),
        //     left: UIScale.posX(300),
        //     cursor: 'pointer',
        //     background:
        //         'url("/assets/images/bt_z_s.png") no-repeat center/contain',
        //     border: 'none',
        //     pointerEvents: 'auto',
        // });
        // this.htmlElement.appendChild(this.btnReset);

        // this.btnReset.addEventListener('pointerdown', () => {
        //     this.btnReset.style.backgroundImage = `url("/assets/images/bt_z_n.png")`;
        // });
        // this.btnReset.addEventListener('pointerleave', () => {
        //     this.btnReset.style.backgroundImage = `url("/assets/images/bt_z_s.png")`;
        // });
        // this.btnReset.addEventListener('pointerup', () => {
        //     this.btnReset.style.backgroundImage = `url("/assets/images/bt_z_s.png")`;
        // });
        // this.btnReset.addEventListener('pointercancle', () => {
        //     this.btnReset.style.backgroundImage = `url("/assets/images/bt_z_s.png")`;
        // });
        // this.btnReset.onclick = async () => {
        //     if (
        //         confirm(
        //             '정말 초기화하시겠습니까? \n최고 기록 점수가 0점이 되며, 1인당 1회만 사용 가능합니다.'
        //         )
        //     ) {
        //         const success = await API_CONNECTOR.resetScoreAsync(); // 👈 기다림!

        //         if (success) {
        //             // 서버가 성공했다고 할 때만 재시작
        //             EVT_HUB_SAFE.emit(G_EVT.RE.START);
        //         } else {
        //             alert('이미 사용하셨거나 1회 이상 게임을 마치셔야 합니다.');
        //         }
        //     }
        // };
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
            0 0 ${UIScale.px(4)} rgba(255, 220, 160, 0.45),
            0 0 ${UIScale.px(8)} rgba(255, 200, 120, 0.25)
        `;
        setTimeout(() => {
            this.titleElement.style.textShadow = `0 0 ${UIScale.px(
                1
            )} rgba(0,0,0,0.7)`;
        }, 900);
    }
    private applyLayout = () => {
        UIScale.update();

        this.btnBgm.style.width = UIScale.px(60);
        this.btnBgm.style.height = UIScale.px(60);
        this.btnBgm.style.left = UIScale.posX(20);
        this.btnBgm.style.top = UIScale.posY(26);

        this.titleElement.style.left = UIScale.posX(126);
        this.titleElement.style.top = UIScale.posY(40);
        this.titleElement.style.padding = `${UIScale.px(10)} ${UIScale.px(18)}`;
        this.titleElement.style.borderRadius = UIScale.px(12);
        this.titleElement.style.fontSize = UIScale.px(12);
    };
}
