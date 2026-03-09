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
            // ✅ CrazyGames 단계 제거 - Firebase Anonymous부터 시작
            const firebaseUser = await this.tryGetFirebaseAnonymousUser();
            if (firebaseUser) {
                this.currentUser = firebaseUser;
                return firebaseUser;
            }

            const localUser = this.getLocalStorageUser();
            this.currentUser = localUser;
            return localUser;
        } catch (error) {
            const fallbackUser = this.getLocalStorageUser();
            this.currentUser = fallbackUser;
            return fallbackUser;
        }
    }
    // ─────────────────────────────────────────────
    // Firebase Anonymous Auth
    // auth.currentUser는 비동기 복원 → onAuthStateChanged로 대기
    // 같은 브라우저라면 항상 동일한 uid 반환
    // ─────────────────────────────────────────────
    private async tryGetFirebaseAnonymousUser(): Promise<UserInfo | null> {
        try {
            // ✅ 3초 타임아웃 - 느린 네트워크에서 무한대기 방지
            const existingUser = await Promise.race([
                new Promise<any>((resolve) => {
                    const unsubscribe = onAuthStateChanged(auth, (user) => {
                        unsubscribe();
                        resolve(user);
                    });
                }),
                new Promise<null>((resolve) =>
                    setTimeout(() => resolve(null), 3000)
                ),
            ]);

            if (existingUser) {
                // ✅ 저장된 닉네임 없으면 밀크티 닉네임 생성
                const savedName =
                    localStorage.getItem('guest_user_name') ||
                    this.generateNickname();

                if (!localStorage.getItem('guest_user_name')) {
                    localStorage.setItem('guest_user_name', savedName);
                }

                return {
                    userId: `fb_${existingUser.uid}`,
                    username: savedName,
                    countryCode: 'XX',
                    profilePicture: null,
                    authType: 'firebase_anonymous',
                };
            }

            const credential = await signInAnonymously(auth);
            const uid = credential.user.uid;
            const username = this.generateNickname(); // ✅ 여기도 변경
            localStorage.setItem('guest_user_name', username);

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

    private generateNickname(): string {
        const milktiChars = [
            '밀크',
            '티',
            '푸링',
            '냥이',
            '버리',
            '듬이',
            '도기',
            '토리',
            '나비',
            '꿈이',
        ];
        const fruits = [
            '수박',
            '딸기',
            '포도',
            '오렌지',
            '레몬',
            '망고',
            '체리',
            '복숭아',
            '키위',
            '메론',
        ];
        const num = Math.floor(Math.random() * 999) + 1;
        const char =
            milktiChars[Math.floor(Math.random() * milktiChars.length)];
        const fruit = fruits[Math.floor(Math.random() * fruits.length)];

        // "밀크의수박123", "두두의망고42" 형태
        return `${char}의${fruit}${num}`;
    }

    private getLocalStorageUser(): UserInfo {
        let userId = localStorage.getItem('guest_user_id');
        let username = localStorage.getItem('guest_user_name');

        if (!userId) {
            userId = `local_${Date.now()}_${Math.random()
                .toString(36)
                .slice(2, 7)}`;
            localStorage.setItem('guest_user_id', userId);
        }

        if (!username) {
            // ✅ Guest_xxx 대신 밀크티 캐릭터 닉네임
            username = this.generateNickname();
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
