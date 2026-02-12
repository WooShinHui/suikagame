// src/Main.ts
import '../js/createjs.min.js';
import '../js/ScaleBitmap.js';
import '../js/RotationPlugin.js';

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

// Main.ts 수정 제안
window.onload = async () => {
    canvas = document.getElementById('create_cvs') as HTMLCanvasElement;
    applyResize();
    // 1. 게임 앱을 즉시 생성 (로딩 화면이 바로 나타남)
    const config: AppConfig = {
        canvas,
        context: canvas.getContext('2d'),
        outputWindow: false,
        width: UIScale.canvasWidth,
        height: UIScale.canvasHeight,
        background: '#fff9d6',
        scene: [PLAY],
    };
    const gameApp = new App(config);

    // 2. 유저 인증 및 세션 생성은 비동기로 던짐 (await 제거)
    (async () => {
        try {
            console.log('🔹 사용자 및 세션 초기화 시작 (백그라운드)');
            const userInfo = await initCrazyGames();

            // Firebase 세션 생성을 기다리지 않고 실행 (내부에서 필요한 시점에 await 하도록 설계됨)
            API_CONNECTOR.setCrazyGamesUser(userInfo);

            console.log('✅ 초기화 요청 완료');
        } catch (e) {
            console.error('초기화 중 오류:', e);
        }
    })();

    // 3. 로딩 중지 알림 (엔진 내부 로딩이 끝나는 시점에 맞춰 호출하는 것이 좋으나, 임시로 유지)
    setTimeout(() => {
        if (window.CrazyGames?.SDK?.game) {
            window.CrazyGames.SDK.game.gameplayStart();
        }
    }, 2000);
};
