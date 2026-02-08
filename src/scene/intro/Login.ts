// Login.ts (인증 로직 컨트롤러)

import { EVT_HUB, G_EVT } from '../../events/EVT_HUB';
import { EVT_HUB_SAFE } from '../../events/SafeEventHub';

export class Login {
    private authContainer: HTMLElement | null = null;
    private apiUrl = 'https://suikagame.ddns.net/api';
    private container: HTMLElement | null = null;
    private panel: HTMLElement | null = null;
    private userId: string;
    private nickname: string = '';

    constructor() {
        // this.injectGlobalStyles();
        // this.userId = String(userId); // 🔥 항상 문자열로 강제 변환
        // EVT_HUB_SAFE.once(G_EVT.LOGIN.SHOW_LOGIN, this.handleShowLogin.bind(this));
        // EVT_HUB_SAFE.once(G_EVT.LOGIN.LOGIN_SUCCESS, () => {
        //     this.destroy();
        // });
    }

    // =========================================================
    // 전역 CSS 삽입 (배경 블러, 애니메이션 등)
    // =========================================================

    private injectGlobalStyles() {
        if (document.getElementById('login-global-style')) return;

        const style = document.createElement('style');
        style.id = 'login-global-style';
        style.innerHTML = `
        #login-overlay, #login-overlay * {
            font-family: 'Pretendard', 'Noto Sans KR', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
            box-sizing: border-box;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to   { opacity: 1; }
        }

        @keyframes slideUp {
            from { transform: translateY(20px); opacity: 0; }
            to   { transform: translateY(0); opacity: 1; }
        }

        .btn:hover {
            filter: brightness(1.05);
        }

        .login-input:focus {
            outline: none;
            border-color: rgba(255,255,255,0.8) !important;
        }

        button:active {
            transform: scale(0.97);
        }

        @keyframes slidePanelUp {
    from { transform: translateY(100%); }
    to   { transform: translateY(0); }
}

@keyframes slidePanelDown {
    from { transform: translateY(0); }
    to   { transform: translateY(100%); }
}
        `;
        document.head.appendChild(style);
    }

    // =========================================================
    // 이벤트 핸들러
    // =========================================================

    private handleShowLogin(event: any) {
        this.container = event.data.container;
        this.createLoginOverlay();
    }

    // =========================================================
    // 메인 오버레이 생성 (배경 블러 + 오른쪽 정렬)
    // =========================================================

    private createLoginOverlay() {
        if (!this.container) return; //

        this.panel = document.createElement('div');
        this.authContainer = this.panel; // 'panel'이 이제 authContainer임

        Object.assign(this.panel.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '1280px',
            height: '800px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: '999', // ✅ 배경(900)보다 위 (IntroOverlay가 900으로 설정함)
        });

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕';
        Object.assign(closeBtn.style, {
            position: 'absolute',
            top: '24px',
            right: '32px' /* ... (기존 스타일 동일) ... */,
            zIndex: '1000' /* ... */, // (패널보다 위)
        });
        closeBtn.addEventListener('click', () => {
            // 🚨 참고: 닫기 버튼 클릭 시 IntroOverlay의 블러 배경도
            // 함께 제거해야 하므로, destroy()가 아니라
            // 별도의 이벤트를 emit하는 것이 좋습니다.
        });

        this.panel.appendChild(closeBtn); // 로그인 타입 선택 UI 배치

        this.buildMethodSelectView(this.panel);

        this.container.appendChild(this.panel);
    }

    // =========================================================
    // 공통 UI 요소 생성 함수
    // =========================================================

    private createMethodButton(label: string): HTMLButtonElement {
        const btn = document.createElement('button');
        btn.textContent = label;
        btn.classList.add('btn');

        Object.assign(btn.style, {
            width: '100%',
            height: '52px',
            padding: '0 18px',
            borderRadius: '4px',
            border: 'none',
            background: 'rgba(255,255,255,0.96)',
            color: '#222',
            fontSize: '16px',
            fontWeight: '500',
            cursor: 'pointer',
            textAlign: 'left',
            boxShadow: '0 4px 10px rgba(0,0,0,0.22)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            transition: '0.2s',
        });

        return btn;
    }

    private createGhostButton(label: string): HTMLButtonElement {
        const btn = document.createElement('button');
        btn.textContent = label;
        btn.classList.add('btn');

        Object.assign(btn.style, {
            width: '100%',
            height: '52px',
            padding: '0 18px',
            borderRadius: '4px',
            border: 'none',
            background: 'rgba(163, 163, 163, 0.5)',
            color: '#222',
            fontSize: '16px',
            fontWeight: '500',
            cursor: 'default',
            textAlign: 'left',
            display: 'flex',
            boxShadow: '0 4px 10px rgba(0,0,0,0.22)',
            alignItems: 'center',
            gap: '10px',
        });

        return btn;
    }

    // =========================================================
    // 로그인 방법 선택 화면
    // =========================================================

    private buildMethodSelectView(overlay: HTMLElement) {
        const panel = document.createElement('div');
        Object.assign(panel.style, {
            width: '520px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            animation: 'slideUp 0.45s ease',
        });

        // 상단 브랜드 영역: 천재교육
        const brand = document.createElement('div');
        Object.assign(brand.style, {
            marginBottom: '10px',
        });

        const brandMain = document.createElement('div');
        brandMain.textContent = '천재교육';
        Object.assign(brandMain.style, {
            fontSize: '32px',
            fontWeight: '700',
            letterSpacing: '0.08em',
            color: 'rgba(255,255,255,0.85)',
            fontFamily: 'Pretendard, sans-serif',
        });

        const brandSub = document.createElement('div');
        brandSub.textContent = '로그인 방법을 선택하세요.';
        Object.assign(brandSub.style, {
            marginTop: '6px',
            fontSize: '15px',
            color: 'rgba(255,255,255,0.85)',
        });

        brand.appendChild(brandMain);
        brand.appendChild(brandSub);

        // 버튼 그리드 (2열)
        const grid = document.createElement('div');
        Object.assign(grid.style, {
            marginTop: '28px',
            width: '100%',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            columnGap: '14px',
            rowGap: '12px',
            justifyItems: 'center',
        });
        // 버튼들
        const btnLocal = this.createMethodButton('게임 계정으로 로그인');
        const btnGuest = this.createMethodButton('게스트 로그인');
        const btnGoogle = this.createGhostButton('Google로 로그인 (준비중)');
        const btnDummy = this.createGhostButton('다른 계정 (준비중)');

        // 간단한 아이콘 대용 동그라미 (진짜 아이콘은 나중에 img로 교체 가능)
        const makeCircleIcon = (bg: string, text: string) => {
            const icon = document.createElement('div');
            Object.assign(icon.style, {
                width: '24px',
                height: '24px',
                borderRadius: '12px',
                background: bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '13px',
                flexShrink: '0',
            });
            icon.textContent = text;
            return icon;
        };

        // 각 버튼에 아이콘 붙이기
        btnLocal.prepend(makeCircleIcon('#3F51B5', '천'));
        btnGoogle.prepend(makeCircleIcon('#DB4437', 'G'));
        btnGuest.prepend(makeCircleIcon('#777', 'G'));
        btnDummy.prepend(makeCircleIcon('#009688', 'A'));

        // 클릭 이벤트
        btnLocal.addEventListener('click', () => {
            this.buildLocalLoginView(overlay);
        });

        btnGoogle.addEventListener('click', () => {
            // window.location.href = `${this.apiUrl}/auth/google`;
            alert('구글 로그인 방식은 추후 제공 예정입니다.');
        });

        btnGuest.addEventListener('click', () => {
            this.handleGuestLogin();
        });
        btnDummy.addEventListener('click', () => {
            alert('추가 로그인 방식은 추후 제공 예정입니다.');
        });

        grid.appendChild(btnLocal);
        grid.appendChild(btnGuest);
        grid.appendChild(btnGoogle);
        grid.appendChild(btnDummy);

        panel.appendChild(brand);
        panel.appendChild(grid);

        overlay.appendChild(panel);
    }

    // =========================================================
    // 일반 로그인 (천재교육 계정)
    // =========================================================

    private buildLocalLoginView(overlay: HTMLElement) {
        // 흰색 전체 패널 생성
        const panel = document.createElement('div');
        panel.id = 'login-full-panel';

        Object.assign(panel.style, {
            width: '1280px',
            height: '800px',
            position: 'absolute',
            top: '0',
            left: '0',
            background: '#ffffff',
            color: '#222',
            zIndex: '2000',
            display: 'flex',
            justifyContent: 'center', // ⭐ 세로 가운데 정렬
            alignItems: 'center', // ⭐ 가로 가운데 정렬
            flexDirection: 'column',
            animation: 'slidePanelUp 0.45s ease forwards',
        });

        // 상단 X 버튼
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕';

        Object.assign(closeBtn.style, {
            position: 'absolute',
            top: '28px',
            right: '28px',
            width: '38px',
            height: '38px',
            borderRadius: '19px',
            border: 'none',
            background: 'rgba(0,0,0,0.07)',
            color: '#333',
            cursor: 'pointer',
            fontSize: '18px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
        });

        closeBtn.addEventListener('click', () => {
            panel.style.animation = 'slidePanelDown 0.35s ease forwards';
            setTimeout(() => {
                panel.remove();
            }, 350);
        });

        panel.appendChild(closeBtn);

        // ⭐ 로그인 박스 전체를 담는 wrapper (중앙)
        const centerWrapper = document.createElement('div');
        Object.assign(centerWrapper.style, {
            width: '460px',
            display: 'flex',
            flexDirection: 'column',
            padding: '40px 60px', // 기존 패딩 유지
        });

        // 제목
        const title = document.createElement('h2');
        title.textContent = '천재교육 게임 계정 로그인';
        Object.assign(title.style, {
            marginBottom: '12px',
            fontSize: '28px',
            fontWeight: '700',
        });

        const helper = document.createElement('div');
        helper.textContent = '아이디와 비밀번호를 입력해주세요.';
        Object.assign(helper.style, {
            fontSize: '15px',
            color: '#666',
            marginBottom: '36px',
        });

        // 인풋
        const usernameInput = document.createElement('input');
        usernameInput.placeholder = '아이디';
        Object.assign(usernameInput.style, {
            width: '92%',
            padding: '18px',
            marginBottom: '14px',
            borderRadius: '4px',
            fontSize: '16px',
            border: '1px solid #ccc',
        });

        const passwordInput = document.createElement('input');
        passwordInput.placeholder = '비밀번호';
        passwordInput.type = 'password';
        Object.assign(passwordInput.style, {
            width: '92%',
            padding: '18px',
            marginBottom: '24px',
            borderRadius: '4px',
            fontSize: '16px',
            border: '1px solid #ccc',
        });

        // 버튼들
        const loginBtn = document.createElement('button');
        loginBtn.textContent = '로그인';
        Object.assign(loginBtn.style, {
            width: '100%',
            padding: '16px',
            borderRadius: '4px',
            background: '#007AFF',
            color: '#fff',
            border: 'none',
            fontSize: '18px',
            cursor: 'pointer',
            marginBottom: '12px',
        });

        const registerBtn = document.createElement('button');
        registerBtn.textContent = '회원가입';
        Object.assign(registerBtn.style, {
            width: '100%',
            padding: '16px',
            borderRadius: '4px',
            background: '#eee',
            color: '#333',
            border: 'none',
            fontSize: '17px',
            cursor: 'pointer',
        });

        // 로그인 이벤트
        loginBtn.addEventListener('click', () => {
            this.handleAuth('login', usernameInput.value, passwordInput.value);
        });

        registerBtn.addEventListener('click', () => {
            this.handleAuth(
                'register',
                usernameInput.value,
                passwordInput.value
            );
        });

        // ⭐ 요소들을 wrapper에 넣기
        centerWrapper.appendChild(title);
        centerWrapper.appendChild(helper);
        centerWrapper.appendChild(usernameInput);
        centerWrapper.appendChild(passwordInput);
        centerWrapper.appendChild(loginBtn);
        centerWrapper.appendChild(registerBtn);

        // ⭐ wrapper를 panel에 넣기
        panel.appendChild(centerWrapper);

        // 오버레이 위에 패널 올림
        overlay.appendChild(panel);
    }

    // =========================================================
    // API 통신
    // =========================================================
    private async handleGuestLogin() {
        // 1. 로컬스토리지에 게스트 유저 ID가 있는지 확인
        let guestId = localStorage.getItem('guest_user_id');

        // 2. 없으면 새로 생성
        if (!guestId) {
            const randomSuffix = Math.random().toString(36).substring(2, 10);
            guestId = `guest_${randomSuffix}`;
            localStorage.setItem('guest_user_id', guestId);
        }

        // 4. 게임에 로그인 성공 이벤트 전달
        EVT_HUB_SAFE.emit(G_EVT.LOGIN.LOGIN_SUCCESS, {
            userId: guestId,
        });

        console.log(`[GUEST] 게스트 로그인 성공: ${guestId}`);
        console.log(`게임 시작 ${guestId}`);

        await this.fetchUserNickname();

        EVT_HUB_SAFE.emit(G_EVT.MENU.START_GAME);
    }

    private async handleAuth(
        endpoint: string,
        username: string,
        password_raw: string
    ) {
        if (!username || !password_raw) {
            alert('아이디와 비밀번호를 모두 입력해주세요.');
            return;
        }

        const url = `${this.apiUrl}/${endpoint}`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ username, password: password_raw }),
            });

            const result = await response.json();

            if (response.ok) {
                console.log(
                    `[AUTH] ${endpoint} 성공. 사용자 ID: ${result.user_id}`
                );
                alert(
                    `${
                        endpoint === 'login' ? '로그인' : '회원가입'
                    } 성공! 게임을 시작합니다.`
                );

                await this.fetchUserNickname();

                EVT_HUB_SAFE.emit(G_EVT.LOGIN.LOGIN_SUCCESS, {
                    userId: result.user_id,
                });

                EVT_HUB_SAFE.emit(G_EVT.MENU.START_GAME);
            } else {
                console.error(`[AUTH] ${endpoint} 실패:`, result);
                alert(`오류: ${result.message || '인증 실패'}`);
            }
        } catch (error) {
            console.error('[AUTH] 통신 오류:', error);
            alert('서버 통신 오류가 발생했습니다. (3000번 포트 서버 확인)');
        }
    }
    private async fetchUserNickname() {
        if (!this.userId) {
            console.warn('[PROFILE] userId 없음. 게스트로 처리.');
            this.nickname = '게스트';
            return;
        }

        // 🔹 guest_ 로 시작하면 서버에 없을 수도 있으므로 기본 처리
        if (this.userId.startsWith('guest_')) {
            try {
                const res = await fetch(
                    `https://suikagame.ddns.net/api/profile/${this.userId}`,
                    {
                        credentials: 'include',
                    }
                );

                if (!res.ok) {
                    console.warn(
                        '[PROFILE] 게스트 프로필 없음. 기본 게스트 사용.'
                    );
                    this.nickname = '게스트';
                    return;
                }

                const data = await res.json();
                this.nickname = data.nickname || '게스트';
                return;
            } catch (err) {
                console.error('[PROFILE] 게스트 프로필 로딩 실패:', err);
                this.nickname = '게스트';
                return;
            }
        }

        // 🔹 일반 로그인 유저 프로필 요청
        try {
            const res = await fetch(
                `https://suikagame.ddns.net/api/profile/${this.userId}`,
                {
                    credentials: 'include',
                }
            );

            if (!res.ok) {
                console.warn('[PROFILE] 서버 오류:', await res.text());
                this.nickname = '프로필';
                return;
            }

            const data = await res.json();

            // nickname → username → fallback 순으로 표시
            this.nickname = data.nickname || data.username || '프로필';
        } catch (err) {
            console.error('[PROFILE] 불러오기 실패:', err);
            this.nickname = '프로필';
        }
    }
    // =========================================================
    // 제거
    // =========================================================
    public destroy() {
        // 1. 제거 직전의 authContainer가 무엇인지 확인합니다.
        console.log(
            '[Login.destroy] Removing this element:',
            this.authContainer
        );

        // 2. 이 요소가 buildMethodSelectView의 'panel'을 자식으로 포함하고 있는지 확인합니다.
        if (this.authContainer) {
            console.log(
                '[Login.destroy] Children:',
                this.authContainer.children
            );
        }

        this.authContainer?.remove();
        this.authContainer = null;
        this.container = null;
    }

    public getUserId() {
        return this.userId;
    }
}
