// src/auth/AuthService.ts
import {
    auth,
    signInAnonymously,
    onAuthStateChanged,
} from '../firebase/firebaseConfig';

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

    public async authenticate(): Promise<UserInfo> {
        try {
            // 1단계: CrazyGames SDK
            const crazyGamesUser = await this.tryGetCrazyGamesUser();
            if (crazyGamesUser) {
                console.log('✅ CrazyGames 로그인 유저:', crazyGamesUser);
                this.currentUser = crazyGamesUser;
                return crazyGamesUser;
            }

            // 2단계: Firebase Anonymous Auth (세션 복원 포함)
            const firebaseUser = await this.tryGetFirebaseAnonymousUser();
            if (firebaseUser) {
                console.log('✅ Firebase Anonymous 유저:', firebaseUser);
                this.currentUser = firebaseUser;
                return firebaseUser;
            }

            // 3단계: localStorage fallback
            const localUser = this.getLocalStorageUser();
            console.log('⚠️ localStorage fallback 유저:', localUser);
            this.currentUser = localUser;
            return localUser;
        } catch (error) {
            console.error('❌ 인증 실패:', error);
            const fallbackUser = this.getLocalStorageUser();
            this.currentUser = fallbackUser;
            return fallbackUser;
        }
    }

    // ─────────────────────────────────────────────
    // CrazyGames SDK
    // getUser()는 userId를 반환하지 않음
    // username이 계정의 고유값 → `cg_${username}` 을 userId로 사용
    // ─────────────────────────────────────────────
    private async tryGetCrazyGamesUser(): Promise<UserInfo | null> {
        try {
            if (!window.CrazyGames?.SDK) return null;

            const withTimeout = <T>(
                promise: Promise<T>,
                ms: number
            ): Promise<T> =>
                Promise.race([
                    promise,
                    new Promise<T>((_, reject) =>
                        setTimeout(() => reject(new Error('timeout')), ms)
                    ),
                ]);

            // ✅ init 반환값에 이미 countryCode 포함
            const initResult = (await withTimeout(
                window.CrazyGames.SDK.init(),
                1500
            )) as any;
            const countryFromInit =
                initResult?.systemInfo?.countryCode ||
                initResult?.clientInfo?.country ||
                null;

            const [user, systemInfo] = await Promise.all([
                withTimeout(window.CrazyGames.SDK.user.getUser(), 1500),
                window.CrazyGames.SDK.user
                    .getSystemInfo?.()
                    .catch(() => null) ?? Promise.resolve(null),
            ]);

            if (!user || !user.username) return null;

            return {
                userId: `cg_${user.username}`,
                username: user.username,
                countryCode:
                    systemInfo?.countryCode ||
                    countryFromInit ||
                    user.countryCode ||
                    'XX',
                profilePicture: user.profilePictureUrl || null,
                authType: 'crazygames',
            };
        } catch (error) {
            console.log(
                'ℹ️ CrazyGames SDK 사용 불가, 다음 단계로:',
                (error as Error).message
            );
            return null;
        }
    }
    // ─────────────────────────────────────────────
    // Firebase Anonymous Auth
    // auth.currentUser는 비동기 복원 → onAuthStateChanged로 대기
    // 같은 브라우저라면 항상 동일한 uid 반환
    // ─────────────────────────────────────────────
    private async tryGetFirebaseAnonymousUser(): Promise<UserInfo | null> {
        try {
            // ✅ auth 상태 복원 대기 (동기 currentUser 체크하면 항상 null)
            const existingUser = await new Promise<any>((resolve) => {
                const unsubscribe = onAuthStateChanged(auth, (user) => {
                    unsubscribe();
                    resolve(user);
                });
            });

            if (existingUser) {
                console.log('✅ 기존 Anonymous 세션 복원:', existingUser.uid);

                // ✅ username도 저장된 것 복원 (매번 새 이름 방지)
                const savedName =
                    localStorage.getItem('guest_user_name') ||
                    `Guest_${existingUser.uid.slice(0, 8)}`;

                return {
                    userId: `fb_${existingUser.uid}`,
                    username: savedName,
                    countryCode: 'XX',
                    profilePicture: null,
                    authType: 'firebase_anonymous',
                };
            }

            // 진짜 첫 방문자만 여기 도달
            const credential = await signInAnonymously(auth);
            const uid = credential.user.uid;
            const username = `Guest_${uid.slice(0, 8)}`;
            localStorage.setItem('guest_user_name', username);

            console.log('✅ 새 Anonymous 유저 생성:', uid);
            return {
                userId: `fb_${uid}`,
                username,
                countryCode: 'XX',
                profilePicture: null,
                authType: 'firebase_anonymous',
            };
        } catch (error) {
            console.error('❌ Firebase Anonymous Auth 실패:', error);
            return null;
        }
    }

    // ─────────────────────────────────────────────
    // localStorage fallback (Firebase도 실패한 경우)
    // localStorage에 저장된 ID 재사용으로 어느 정도 지속성 유지
    // ─────────────────────────────────────────────
    private getLocalStorageUser(): UserInfo {
        let userId = localStorage.getItem('guest_user_id');
        let username = localStorage.getItem('guest_user_name');

        if (!userId) {
            // 한 번만 생성하고 localStorage에 고정
            userId = `local_${Date.now()}_${Math.random()
                .toString(36)
                .slice(2, 7)}`;
            localStorage.setItem('guest_user_id', userId);
        }

        if (!username) {
            username = `Guest_${userId.slice(-6)}`;
            localStorage.setItem('guest_user_name', username);
        }

        return {
            userId,
            username,
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
