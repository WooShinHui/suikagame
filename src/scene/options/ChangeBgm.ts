// // ChangeBgm.ts
// import PureDomX from '../../core/PureDomX';
// import { EVT_HUB_SAFE } from '../../events/SafeEventHub';
// import { G_EVT } from '../../events/EVT_HUB';
// import { SoundMgr } from '../../manager/SoundMgr';
// import {
//     UIScale,
//     CANVAS_ORIGINAL_WIDTH,
//     CANVAS_ORIGINAL_HEIGHT,
// } from '../../ui/UIScale';

// const BGM_LIST = [
//     { src: './assets/sounds/HOPEFUL.mp3', title: 'HOPEFUL' },
//     { src: './assets/sounds/RHYTHMIC.mp3', title: 'RHYTHMIC' },
//     { src: './assets/sounds/CHEERFUL.mp3', title: 'CHEERFUL' },
//     { src: './assets/sounds/ENERGETIC.mp3', title: 'ENERGETIC' },
//     { src: './assets/sounds/RETRO.mp3', title: 'RETRO' },
//     { src: './assets/sounds/Happy.mp3', title: 'Happy' },
//     { src: './assets/sounds/Warm.mp3', title: 'Warm' },
//     { src: './assets/sounds/Jazz.mp3', title: 'Jazz' },
// ];

// export class ChangeBgm extends PureDomX {
//     private titleElement!: HTMLElement;
//     private btnBgm!: HTMLButtonElement;
//     private currentBgmIndex: number = 0;
//     private static instance: ChangeBgm | null = null;

//     constructor() {
//         // const container = document.createElement('div');
//         // super(container);

//         // if (ChangeBgm.instance) return ChangeBgm.instance;

//         // this.htmlElement.id = 'change-bgm-root';
//         // Object.assign(this.htmlElement.style, {
//         //     position: 'absolute',
//         //     top: '0',
//         //     left: '0',
//         //     width: '100%',
//         //     height: '100%',
//         //     pointerEvents: 'none',
//         //     zIndex: '1000',
//         //     transform: 'none !important',
//         // });

//         // const canvas = document.querySelector('canvas');
//         // const parent = canvas?.parentElement || document.body;
//         // parent.appendChild(this.htmlElement);

//         // this.createElements();

//         // const savedIndex = localStorage.getItem('bgmIndex');
//         // if (savedIndex) this.currentBgmIndex = Number(savedIndex);
//         // this.updateTitleDisplay();

//         // setInterval(() => this.sparkleTitle(), 2800);

//         // ChangeBgm.instance = this;

//         // this.applyLayout();
//         // window.addEventListener('resize', () => this.applyLayout());
//     }

//     private createElements() {
//         // BGM 버튼
//         this.btnBgm = document.createElement('button');
//         this.btnBgm.id = 'btn-bgm';
//         Object.assign(this.btnBgm.style, {
//             position: 'absolute',
//             cursor: 'pointer',
//             background:
//                 'url("./assets/images/bt_bgm_s.png") no-repeat center/contain',
//             border: 'none',
//             pointerEvents: 'auto',
//         });
//         this.htmlElement.appendChild(this.btnBgm);

//         this.btnBgm.addEventListener('pointerdown', () => {
//             this.btnBgm.style.backgroundImage =
//                 'url("./assets/images/bt_bgm_n.png")';
//         });
//         this.btnBgm.addEventListener('pointerleave', () => {
//             this.btnBgm.style.backgroundImage =
//                 'url("./assets/images/bt_bgm_s.png")';
//         });
//         this.btnBgm.addEventListener('pointerup', () => {
//             this.btnBgm.style.backgroundImage =
//                 'url("./assets/images/bt_bgm_s.png")';
//         });
//         this.btnBgm.addEventListener('pointercancel', () => {
//             this.btnBgm.style.backgroundImage =
//                 'url("./assets/images/bt_bgm_s.png")';
//         });
//         this.btnBgm.onclick = () => {
//             SoundMgr.handle.playSound('btn');
//             this.changeNextBGM();
//             this.sparkleTitle();
//         };

//         // 타이틀
//         this.titleElement = document.createElement('div');
//         Object.assign(this.titleElement.style, {
//             position: 'absolute',
//             fontFamily: '"PressStart2P-Regular", monospace',
//             letterSpacing: '1.5px',
//             textTransform: 'uppercase',
//             color: '#F8E6B8',
//             background: 'rgba(90, 65, 40, 0.78)',
//             textAlign: 'center',
//             whiteSpace: 'nowrap',
//             transition: 'text-shadow 0.8s ease',
//             pointerEvents: 'none',
//             zIndex: '100',
//         });
//         this.htmlElement.appendChild(this.titleElement);
//     }

//     private changeNextBGM() {
//         this.currentBgmIndex = (this.currentBgmIndex + 1) % BGM_LIST.length;
//         const nextBGM = BGM_LIST[this.currentBgmIndex];
//         EVT_HUB_SAFE.emit(G_EVT.BGM.CHANGE, nextBGM.src);
//         localStorage.setItem('bgmIndex', String(this.currentBgmIndex));
//         this.updateTitleDisplay();
//     }

//     private updateTitleDisplay() {
//         this.titleElement.textContent = BGM_LIST[this.currentBgmIndex].title;
//     }

//     private sparkleTitle() {
//         this.titleElement.style.textShadow = `
//             0 0 4px rgba(255, 220, 160, 0.45),
//             0 0 8px rgba(255, 200, 120, 0.25)
//         `;
//         setTimeout(() => {
//             this.titleElement.style.textShadow = '0 0 1px rgba(0,0,0,0.7)';
//         }, 900);
//     }

//     // ✅ Canvas 900x1600 기준으로 배치
//     private applyLayout = () => {
//         UIScale.update();

//         const sw = window.innerWidth;
//         const sh = window.innerHeight;
//         const scale = UIScale.scale;

//         // Canvas 렌더링 영역 계산
//         const canvasRenderWidth = CANVAS_ORIGINAL_WIDTH * scale;
//         const canvasRenderHeight = CANVAS_ORIGINAL_HEIGHT * scale;

//         // Canvas 시작 위치
//         const canvasLeft = (sw - canvasRenderWidth) / 2;
//         const canvasTop = 0;

//         // Canvas 기준 좌표 (900x1600 기준)
//         const buttonCanvasX = 20; // 왼쪽에서 20px
//         const buttonCanvasY = 60; // 상단에서 60px

//         // 버튼 크기
//         const buttonSize = 60 * scale;

//         // 버튼 실제 화면 좌표
//         const buttonScreenX = canvasLeft + buttonCanvasX * scale;
//         const buttonScreenY = canvasTop + buttonCanvasY * scale;

//         this.btnBgm.style.left = `${buttonScreenX}px`;
//         this.btnBgm.style.top = `${buttonScreenY}px`;
//         this.btnBgm.style.width = `${buttonSize}px`;
//         this.btnBgm.style.height = `${buttonSize}px`;

//         // ✅ 타이틀: 버튼 오른쪽에 배치 (Canvas 기준)
//         const titleCanvasX = buttonCanvasX + 60 + 10; // 버튼 왼쪽(20) + 버튼 크기(60) + 간격(10)
//         const titleCanvasY = buttonCanvasY + 8; // 버튼과 같은 Y 위치 (약간 아래)

//         const titleScreenX = canvasLeft + titleCanvasX * scale;
//         const titleScreenY = canvasTop + titleCanvasY * scale;

//         this.titleElement.style.left = `${titleScreenX}px`;
//         this.titleElement.style.top = `${titleScreenY}px`;

//         // 타이틀 크기는 스케일 적용
//         const fontSize = 12 * scale;
//         const padding = 10 * scale;
//         const borderRadius = 12 * scale;

//         this.titleElement.style.padding = `${padding}px ${padding * 1.8}px`;
//         this.titleElement.style.borderRadius = `${borderRadius}px`;
//         this.titleElement.style.fontSize = `${fontSize}px`;
//         this.titleElement.style.boxShadow = `
//             0 0 0 ${3 * scale}px #7a5a28,
//             0 0 0 ${6 * scale}px #e6c87a,
//             0 0 0 ${9 * scale}px #b08a3a,
//             inset -2px -2px 3px rgba(0,0,0,0.35)
//         `;
//         this.titleElement.style.textShadow = '0 0 1px rgba(0,0,0,0.7)';
//     };
// }
