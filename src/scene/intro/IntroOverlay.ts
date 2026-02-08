// IntroOverlay.ts

import { EVT_HUB, G_EVT } from '../../events/EVT_HUB';
import { EVT_HUB_SAFE } from '../../events/SafeEventHub';
import EVT from '../../EVT';

export class IntroOverlay {
    private overlay: HTMLDivElement | null = null;
    private skipText: HTMLDivElement | null = null;
    private playText: HTMLDivElement | null = null;
    private container: HTMLElement;
    private firstClicked = false;
    private isSkipped = true;

    private handleClick: () => void;

    constructor(container: HTMLElement) {
        this.container = container;
        this.requestFullScreen();
        setTimeout(() => window.dispatchEvent(new Event('resize')), 300);
        this.handleClick = () => {}; // 초기화 // 1. 로그인 요청 시, 투명 오버레이를 -> '블러 배경'으로 전환

        EVT_HUB_SAFE.once(
            G_EVT.LOGIN.SHOW_LOGIN,
            this.transitionToLogin.bind(this)
        ); // 2. 로그인 성공 시, '블러 배경'을 제거

        EVT_HUB_SAFE.once(G_EVT.LOGIN.LOGIN_SUCCESS, this.destroy.bind(this));
        this.showPlayText();

        EVT_HUB_SAFE.once(G_EVT.VIDEO.PLAY, () => {
            this.playText.remove();
        });
    }

    public create() {
        const overlay = document.createElement('div');
        this.overlay = overlay; // (기존 스타일: 투명, zIndex 20)

        Object.assign(overlay.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            background: 'transparent',
            zIndex: '20',
            cursor: 'pointer',
        });

        overlay.addEventListener('click', () => {
            EVT_HUB_SAFE.emit(G_EVT.VIDEO.PLAY);
        });
        this.handleClick = () => {
            if (!this.firstClicked) {
                this.showSkipText();
                this.firstClicked = true;
            } else {
                this.skip();
                EVT_HUB_SAFE.emit(G_EVT.INTRO.SKIP_CLICKED, this.isSkipped);
            }
        };
        const resizeOverlay = () => {
            if (!this.overlay) return;
            const rect = this.container.getBoundingClientRect();
            Object.assign(this.overlay.style, {
                width: `${rect.width}px`,
                height: `${rect.height}px`,
            });

            // 텍스트 위치도 container 높이에 비례
            if (this.skipText) {
                this.skipText.style.bottom = `${rect.height * 0.125}px`; // 12.5% 아래
                this.skipText.style.fontSize = `${rect.height * 0.03}px`; // 높이 3% 폰트
                this.skipText.style.padding = `${rect.height * 0.025}px ${
                    rect.width * 0.05
                }px`;
            }
            if (this.playText) {
                this.playText.style.bottom = `${rect.height * 0.125}px`;
                this.playText.style.fontSize = `${rect.height * 0.03}px`;
                this.playText.style.padding = `${rect.height * 0.025}px ${
                    rect.width * 0.05
                }px`;
            }
        };

        window.addEventListener('resize', resizeOverlay);
        resizeOverlay(); // 초기 적용
        overlay.addEventListener('click', this.handleClick);
        this.container.appendChild(overlay);
    } // ⭐ [NEW] 투명 오버레이를 블러 배경으로 전환하는 메서드

    private transitionToLogin() {
        // 1. 스킵 텍스트 제거
        this.skipText?.remove();
        this.skipText = null;

        if (this.overlay) {
            // 2. 인트로 스킵 클릭 리스너 제거
            this.overlay.removeEventListener('click', this.handleClick);
            this.firstClicked = false; // 3. 'login-bg-blur' 스타일을 이 오버레이에 적용 (재활용)

            this.overlay.id = 'login-bg-blur';
            Object.assign(this.overlay.style, {
                background: 'rgba(0,0,0,0.30)',
                zIndex: '900', // Login.ts 패널(999)보다 낮게
                animation: 'fadeIn 0.35s ease',
                cursor: 'default',
            });
        }
    }

    private showSkipText() {
        if (this.skipText) return;
        const text = document.createElement('div');
        this.skipText = text;
        text.textContent = '탭하여 스킵';

        const resizeText = () => {
            if (!this.skipText) return;
            const rect = this.container.getBoundingClientRect();
            Object.assign(this.skipText.style, {
                bottom: `${rect.height * 0.125}px`, // container 높이의 12.5%
                fontSize: `${rect.height * 0.03}px`, // 높이 3% 폰트
                padding: `${rect.height * 0.025}px ${rect.width * 0.05}px`, // 높이/너비 비율 패딩
            });
        };

        Object.assign(text.style, {
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'auto',
            color: 'white',
            zIndex: '25',
            userSelect: 'none',
            pointerEvents: 'none',
            textAlign: 'center',
            textShadow: '0 0 10px rgba(0,0,0,0.7), 0 0 12px rgba(0,0,0,0.4)',
            opacity: '0',
            transition: 'opacity 0.45s ease',
        });

        requestAnimationFrame(() => {
            text.style.opacity = '1';
        });

        this.container.appendChild(text);

        // resize 이벤트
        window.addEventListener('resize', resizeText);
        resizeText(); // 초기 적용
    }

    private showPlayText() {
        if (this.playText) return;
        const text = document.createElement('div');
        this.playText = text;
        text.textContent = '탭하여 시작하세요';

        const resizeText = () => {
            if (!this.playText) return;
            const rect = this.container.getBoundingClientRect();
            Object.assign(this.playText.style, {
                bottom: `${rect.height * 0.125}px`,
                fontSize: `${rect.height * 0.03}px`,
                padding: `${rect.height * 0.025}px ${rect.width * 0.05}px`,
            });
        };

        Object.assign(text.style, {
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'auto',
            color: 'white',
            zIndex: '25',
            userSelect: 'none',
            pointerEvents: 'none',
            textAlign: 'center',
            textShadow: '0 0 10px rgba(0,0,0,0.7), 0 0 12px rgba(0,0,0,0.4)',
            opacity: '0',
            transition: 'opacity 0.45s ease',
        });

        requestAnimationFrame(() => {
            text.style.opacity = '1';
        });

        this.container.appendChild(text);

        // resize 이벤트
        window.addEventListener('resize', resizeText);
        resizeText(); // 초기 적용
    }
    private skip() {
        // (기존 코드와 동일)
        EVT_HUB_SAFE.emit(G_EVT.INTRO.SKIP);
    }

    public destroy() {
        this.overlay?.remove();
        this.skipText?.remove(); // (이 시점엔 null이겠지만, 안전을 위해 둠)
        this.overlay = null;
        this.skipText = null;
        this.firstClicked = false;
    }

    private requestFullScreen() {
        const doc = window.document as any;
        const docEl = doc.documentElement as any;

        const requestNativeFullScreen =
            docEl.requestFullscreen ||
            docEl.mozRequestFullScreen ||
            docEl.webkitRequestFullScreen ||
            docEl.msRequestFullscreen;

        if (requestNativeFullScreen) {
            // 사파리(webkit)를 포함한 브라우저 전체 화면 요청
            requestNativeFullScreen.call(docEl).catch((err: any) => {
                console.warn(
                    '전체 화면 요청 거부됨 (주소창 숨기기 실패):',
                    err
                );
            });
        }

        // 전체 화면이 아니더라도 주소창을 밀어 올리기 위한 고전적 트릭
        window.scrollTo(0, 1);
    }
}
