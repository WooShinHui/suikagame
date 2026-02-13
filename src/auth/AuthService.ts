// src/auth/AuthService.ts (새 파일)

import { auth, signInAnonymously } from '../firebase/firebaseConfig';

interface UserInfo {
    userId: string;
    username: string;
    countryCode: string;
    profilePicture: string | null;
    authType: 'crazygames' | 'firebase_anonymous' | 'localStorage';
}

export class AuthService {
    private static instance: AuthService | null = null;
    private currentUser: UserInfo | null = null;

    private constructor() {}

    public static getInstance(): AuthService {
        if (!AuthService.instance) {
            AuthService.instance = new AuthService();
        }
        return AuthService.instance;
    }

    /**
     * 통합 인증 처리
     * 1. CrazyGames SDK (최우선)
     * 2. Firebase Anonymous Auth
     * 3. localStorage (fallback)
     */
    public async authenticate(): Promise<UserInfo> {
        try {
            // ✅ 1단계: CrazyGames SDK 체크
            const crazyGamesUser = await this.tryGetCrazyGamesUser();
            if (crazyGamesUser) {
                console.log('✅ CrazyGames 로그인 유저:', crazyGamesUser);
                this.currentUser = crazyGamesUser;
                return crazyGamesUser;
            }

            // ✅ 2단계: Firebase Anonymous Auth
            const firebaseUser = await this.tryGetFirebaseAnonymousUser();
            if (firebaseUser) {
                console.log('✅ Firebase Anonymous 유저:', firebaseUser);
                this.currentUser = firebaseUser;
                return firebaseUser;
            }

            // ✅ 3단계: localStorage fallback
            const localUser = this.getLocalStorageUser();
            console.log('⚠️ localStorage fallback 유저:', localUser);
            this.currentUser = localUser;
            return localUser;
        } catch (error) {
            console.error('❌ 인증 실패:', error);

            // 최악의 경우: 임시 ID 생성
            const fallbackUser: UserInfo = {
                userId: `temp_${Date.now()}`,
                username: `Guest_${Date.now()}`,
                countryCode: 'XX',
                profilePicture: null,
                authType: 'localStorage',
            };
            this.currentUser = fallbackUser;
            return fallbackUser;
        }
    }

    /**
     * CrazyGames SDK로 유저 정보 가져오기
     */
    private async tryGetCrazyGamesUser(): Promise<UserInfo | null> {
        try {
            if (!window.CrazyGames?.SDK?.user) {
                console.log('ℹ️ CrazyGames SDK 없음');
                return null;
            }

            const user = await window.CrazyGames.SDK.user.getUser();

            if (!user || !user.userId) {
                console.log('ℹ️ CrazyGames 비로그인 유저');
                return null;
            }

            return {
                userId: `cg_${user.userId}`, // CrazyGames 유저임을 명시
                username: user.username || 'CrazyGames User',
                countryCode: user.countryCode || 'XX',
                profilePicture: user.profilePictureUrl || null,
                authType: 'crazygames',
            };
        } catch (error) {
            console.error('❌ CrazyGames getUser 실패:', error);
            return null;
        }
    }

    /**
     * Firebase Anonymous Auth로 유저 생성/가져오기
     */
    private async tryGetFirebaseAnonymousUser(): Promise<UserInfo | null> {
        try {
            // 이미 로그인된 Anonymous 유저가 있는지 확인
            if (auth.currentUser) {
                console.log(
                    '✅ 기존 Firebase Anonymous 유저:',
                    auth.currentUser.uid
                );
                return {
                    userId: `fb_${auth.currentUser.uid}`,
                    username:
                        localStorage.getItem('guest_user_name') ||
                        `Guest_${Date.now()}`,
                    countryCode: 'XX',
                    profilePicture: null,
                    authType: 'firebase_anonymous',
                };
            }

            // 새로운 Anonymous 유저 생성
            const userCredential = await signInAnonymously(auth);
            console.log(
                '✅ 새 Firebase Anonymous 유저 생성:',
                userCredential.user.uid
            );

            const username = `Guest_${Date.now()}`;
            localStorage.setItem('guest_user_name', username);

            return {
                userId: `fb_${userCredential.user.uid}`,
                username: username,
                countryCode: 'XX',
                profilePicture: null,
                authType: 'firebase_anonymous',
            };
        } catch (error) {
            console.error('❌ Firebase Anonymous Auth 실패:', error);
            return null;
        }
    }

    /**
     * localStorage fallback
     */
    private getLocalStorageUser(): UserInfo {
        let userId = localStorage.getItem('guest_user_id');
        let username = localStorage.getItem('guest_user_name');

        if (!userId) {
            userId = `local_${Date.now()}`;
            localStorage.setItem('guest_user_id', userId);
        }

        if (!username) {
            username = `Guest_${Date.now()}`;
            localStorage.setItem('guest_user_name', username);
        }

        return {
            userId: userId,
            username: username,
            countryCode: 'XX',
            profilePicture: null,
            authType: 'localStorage',
        };
    }

    public getCurrentUser(): UserInfo | null {
        return this.currentUser;
    }
}

export const AUTH_SERVICE = AuthService.getInstance();
