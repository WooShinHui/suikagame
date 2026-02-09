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
        await window.CrazyGames.SDK.init();
        console.log('✅ CrazyGames SDK 초기화 완료');

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

    // ✅ 2. Firebase 세션 생성
    await API_CONNECTOR.setCrazyGamesUser(userInfo);

    // 3. 게임 로딩 시작 알림
    if (window.CrazyGames?.SDK?.game) {
        window.CrazyGames.SDK.game.sdkGameLoadingStart();
    }

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

    // 5. 게임 로딩 완료 알림
    setTimeout(() => {
        if (window.CrazyGames?.SDK?.game) {
            window.CrazyGames.SDK.game.sdkGameLoadingStop();
            window.CrazyGames.SDK.game.gameplayStart();
        }
    }, 2000);
};
