// src/Main.ts
import App from './core/App';
import { AppConfig } from './core/CoreApp';
import PLAY from './scene/play/PLAY';
import { UIScale } from './ui/UIScale';
import { API_CONNECTOR } from './fetch/ApiConnector';

let canvas: HTMLCanvasElement;

function applyResize() {
    UIScale.update();
    if (!canvas) return;

    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.left = '0';
    canvas.style.top = '0';
}

// ✅ CrazyGames 초기화
async function initCrazyGames() {
    try {
        // 1. SDK 초기화
        await window.CrazyGames.SDK.init();
        console.log('✅ CrazyGames SDK 초기화 완료');

        // 2. 사용자 정보 가져오기
        const userInfo = await window.CrazyGames.SDK.user.getUser();

        if (userInfo) {
            console.log('✅ 로그인 사용자:', userInfo);
            return {
                userId: userInfo.userId,
                username: userInfo.username,
                countryCode: userInfo.countryCode,
                profilePicture: userInfo.profilePictureUrl,
            };
        } else {
            // 게스트 모드
            console.log('ℹ️ 게스트 모드');
            return {
                userId: `guest_${Date.now()}`,
                username: 'Guest',
                countryCode: 'XX',
                profilePicture: null,
            };
        }
    } catch (error) {
        console.error('❌ CrazyGames 초기화 실패:', error);
        // 폴백: 게스트
        return {
            userId: `guest_${Date.now()}`,
            username: 'Guest',
            countryCode: 'XX',
            profilePicture: null,
        };
    }
}

window.onload = async () => {
    canvas = document.getElementById('create_cvs') as HTMLCanvasElement;

    applyResize();
    window.addEventListener('resize', applyResize);
    UIScale.update();

    // ✅ 1. CrazyGames 초기화
    const userInfo = await initCrazyGames();

    // ✅ 2. ApiConnector에 사용자 정보 전달
    await API_CONNECTOR.setCrazyGamesUser(userInfo);

    // 3. 게임 로딩 시작 알림
    window.CrazyGames.SDK.game.sdkGameLoadingStart();

    // 4. 게임 앱 생성
    const config: AppConfig = {
        canvas,
        context: canvas.getContext('2d'),
        outputWindow: false,
        width: UIScale.canvasWidth,
        height: UIScale.canvasHeight,
        background: '#fff9d6',
        scene: [PLAY],
    };

    new App(config);

    // 5. 게임 로딩 완료 알림 (리소스 로드 후)
    setTimeout(() => {
        window.CrazyGames.SDK.game.sdkGameLoadingStop();
    }, 2000);
};
