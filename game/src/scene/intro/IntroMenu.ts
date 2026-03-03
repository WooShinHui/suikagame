import DomX from '../../core/DomX';
import { EVT_HUB, G_EVT } from '../../events/EVT_HUB';

class IntroMenu extends DomX {
    private userId: string;
    private nickname: string = '';

    constructor(userId: string | number) {
        super(document.createElement('div'));
        this.userId = String(userId); // 🔥 항상 문자열로 강제 변환
        console.log(this.userId);
    }

    public async create() {
        Object.assign(this.htmlElement.style, {
            width: '1280px',
            height: '800px',
            backgroundImage: 'url("./assets/images/intro_bg.png")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            position: 'relative',
            zIndex: '10',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
        });
        // 🔸 서버에서 프로필 닉네임 가져오기

        // 🔹 프로필 버튼 (우측 상단)
        const profileBtn = this.createProfileButton();
        this.htmlElement.appendChild(profileBtn);
        // 🔹 중앙 버튼들 (스타트 / 옵션)
        const form = document.createElement('form');
        Object.assign(form.style, {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            transform: 'translateY(200px)',
            marginTop: '350px',
        });
        const startButton = this.createButton(
            '/assets/images/start_btn.png',
            '/assets/images/start_btn_down.png',
            () => {
                this.removeElement();
            }
        );
        const optionButton = this.createButton(
            '/assets/images/option_btn.png',
            '/assets/images/option_btn_down.png',
            () => EVT_HUB.emit(G_EVT.MENU.INTRO_OPEN_OPTION)
        );
        form.append(startButton, optionButton);
        this.htmlElement.appendChild(form);
        document.body.appendChild(this.htmlElement);
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

    private createProfileButton(): HTMLElement {
        const container = document.createElement('div');

        Object.assign(container.style, {
            position: 'absolute',
            top: '48px',
            right: '48px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            padding: '8px 14px',
            background: 'rgba(0,0,0,0.35)',
            borderRadius: '24px',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
        });

        // 아바타 기본
        const avatar = document.createElement('div');
        Object.assign(avatar.style, {
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            backgroundImage: 'url("./assets/images/default_avatar.png")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            flexShrink: '0',
        });

        // 닉네임
        const nickname = document.createElement('div');
        nickname.textContent = this.nickname || '프로필';
        Object.assign(nickname.style, {
            color: '#fff',
            fontSize: '16px',
            fontWeight: '600',
            userSelect: 'none',
        });

        container.appendChild(avatar);
        container.appendChild(nickname);

        container.addEventListener('click', () => {
            EVT_HUB.emit(G_EVT.MENU.OPEN_PROFILE, {
                userId: this.userId,
            });
        });

        return container;
    }

    private createButton(normal: string, down: string, onClick: () => void) {
        const btn = document.createElement('button');

        Object.assign(btn.style, {
            width: '360px',
            height: '96px',
            backgroundImage: `url("${normal}")`,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: 'transparent',
            marginTop: '12px',
        });

        btn.addEventListener('click', (e) => {
            e.preventDefault();
            onClick();
        });

        btn.addEventListener('pointerdown', () => {
            btn.style.backgroundImage = `url("${down}")`;
        });

        btn.addEventListener('pointerup', () => {
            btn.style.backgroundImage = `url("${normal}")`;
        });

        btn.addEventListener('pointerleave', () => {
            btn.style.backgroundImage = `url("${normal}")`;
        });

        return btn;
    }

    public onUnmounted() {
        this.removeElement();
    }
}

export default IntroMenu;
