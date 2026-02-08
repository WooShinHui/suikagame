import DomX from '../../core/DomX';
import { EVT_HUB } from '../../events/EVT_HUB';

class ProfileUI extends DomX {
    private userId: string = '';

    constructor() {
        super(document.createElement('div'));
        console.log('asijo');
    }

    public async create(userId: string) {
        this.userId = userId;

        Object.assign(this.htmlElement.style, {
            width: '1280px',
            height: '800px',
            position: 'absolute',
            top: '0',
            left: '0',
            background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: '999',
        });

        const card = document.createElement('div');
        Object.assign(card.style, {
            width: '520px',
            background: '#fff',
            borderRadius: '16px',
            padding: '40px',
            boxShadow: '0 8px 20px rgba(0,0,0,0.35)',
            display: 'flex',
            flexDirection: 'column',
            animation: 'profileFade 0.3s ease',
        });

        const profile = await this.fetchProfile();

        const title = document.createElement('h2');
        title.innerText = '프로필';
        Object.assign(title.style, {
            marginBottom: '20px',
            fontSize: '26px',
            fontWeight: '700',
        });

        // 대표 이미지
        const avatar = document.createElement('div');
        Object.assign(avatar.style, {
            width: '120px',
            height: '120px',
            borderRadius: '60px',
            background: `url(${
                profile.avatar || '/assets/images/default_avatar.png'
            }) center/cover`,
            margin: '0 auto 20px',
        });

        // 닉네임
        const nickname = document.createElement('div');
        nickname.innerText = profile.nickname;
        Object.assign(nickname.style, {
            fontSize: '22px',
            fontWeight: '600',
            textAlign: 'center',
            marginBottom: '8px',
        });

        // 최고기록
        const high = document.createElement('div');
        high.innerText = `최고 기록: ${profile.highscore || 0} 점`;
        Object.assign(high.style, {
            fontSize: '16px',
            color: '#555',
            textAlign: 'center',
            marginBottom: '20px',
        });

        // 소개
        const bio = document.createElement('div');
        bio.innerText = profile.bio || '소개가 없습니다.';
        Object.assign(bio.style, {
            fontSize: '14px',
            color: '#666',
            textAlign: 'center',
            marginBottom: '30px',
            whiteSpace: 'pre-line',
        });

        const closeBtn = document.createElement('button');
        closeBtn.innerText = '닫기';
        Object.assign(closeBtn.style, {
            width: '100%',
            padding: '14px',
            borderRadius: '8px',
            border: 'none',
            background: '#4CAF50',
            color: '#fff',
            fontSize: '16px',
            cursor: 'pointer',
        });

        closeBtn.addEventListener('click', () => {
            this.removeElement();
        });

        // 조립
        card.append(title, avatar, nickname, high, bio, closeBtn);
        this.htmlElement.appendChild(card);
        document.body.appendChild(this.htmlElement);
    }

    private async fetchProfile() {
        const res = await fetch(
            `https://suikagame.ddns.net/api/profile/${this.userId}`
        );
        return await res.json();
    }

    public onUnmounted() {
        this.removeElement();
    }
}

export default ProfileUI;
