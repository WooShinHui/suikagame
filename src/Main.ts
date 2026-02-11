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

// ✅ 로컬스토리지에서 영구 userId 가져오기 또는 생성
function getOrCreateLocalUserId(): string {
    const STORAGE_KEY = 'local_user_id';
    let userId = localStorage.getItem(STORAGE_KEY);

    if (!userId) {
        userId = `local_${Date.now()}_${Math.random()
            .toString(36)
            .substr(2, 9)}`;
        localStorage.setItem(STORAGE_KEY, userId);
        console.log('🆕 새 로컬 userId 생성:', userId);
    } else {
        console.log('📦 기존 로컬 userId 사용:', userId);
    }

    return userId;
}

// ✅ CrazyGames 초기화 (로컬 폴백)
async function initCrazyGames() {
    try {
        // ✅ SDK 존재 확인
        if (!window.CrazyGames?.SDK) {
            console.warn('⚠️ CrazyGames SDK 없음 - 로컬 모드');
            return createLocalUser();
        }

        await window.CrazyGames.SDK.init();
        console.log('✅ CrazyGames SDK 초기화 완료');

        const userInfo = await window.CrazyGames.SDK.user.getUser();

        console.log('🔍 CrazyGames userInfo:', userInfo);

        // ✅ userId 체크 (userInfo가 있어도 userId가 없을 수 있음)
        if (userInfo && userInfo.userId) {
            console.log('✅ CrazyGames 로그인 사용자:', userInfo);
            return {
                userId: userInfo.userId,
                username: userInfo.username || 'Player',
                countryCode: userInfo.countryCode || 'XX',
                profilePicture: userInfo.profilePictureUrl || null,
            };
        } else {
            console.log('ℹ️ CrazyGames 게스트 모드 (로컬 폴백)');
            return createLocalUser();
        }
    } catch (error) {
        console.error('❌ CrazyGames 초기화 실패:', error);
        return createLocalUser();
    }
}

// ✅ 로컬 사용자 생성 (폴백)
function createLocalUser() {
    const userId = getOrCreateLocalUserId();
    const username = localStorage.getItem('guest_user_name') || 'LocalPlayer';

    return {
        userId: userId,
        username: username,
        countryCode: 'XX',
        profilePicture: null,
    };
}

window.onload = async () => {
    canvas = document.getElementById('create_cvs') as HTMLCanvasElement;

    applyResize();
    window.addEventListener('resize', applyResize);
    UIScale.update();

    // ✅ 1. CrazyGames 초기화 (또는 로컬 폴백)
    console.log('🔹 사용자 초기화 시작...');
    const userInfo = await initCrazyGames();
    console.log('🔹 최종 사용자 정보:', userInfo);

    // ✅ 2. Firebase 세션 생성
    console.log('🔹 Firebase 세션 생성 시작...');
    await API_CONNECTOR.setCrazyGamesUser(userInfo);
    console.log('✅ Firebase 세션 생성 완료');

    // 3. 게임 로딩 시작 알림
    if (window.CrazyGames?.SDK?.game) {
        // window.CrazyGames.SDK.game.sdkGameLoadingStart();
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
            // window.CrazyGames.SDK.game.sdkGameLoadingStop();
            window.CrazyGames.SDK.game.gameplayStart();
        }
    }, 2000);
};
