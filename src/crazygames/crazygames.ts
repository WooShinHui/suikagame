// src/types/crazygames.d.ts
declare global {
    interface Window {
        CrazyGames: {
            SDK: {
                init(): Promise<void>;
                user: {
                    // ✅ getUser()는 userId 반환 안 함. username이 계정 고유값
                    getUser(): Promise<{
                        username: string;
                        profilePictureUrl: string;
                        countryCode?: string;
                    } | null>;
                    // JWT 토큰 (서버에서 디코딩해야 userId 추출 가능)
                    getUserToken(): Promise<string>;
                    // 국가코드, 디바이스 정보
                    getSystemInfo(): Promise<{
                        countryCode: string;
                        device: { type: 'desktop' | 'tablet' | 'mobile' };
                    }>;
                };
                game: {
                    sdkGameLoadingStart(): void;
                    sdkGameLoadingStop(): void;
                    gameplayStart(): void;
                    gameplayStop(): void;
                    happytime(): void;
                };
                ad: {
                    requestAd(
                        type: 'midgame' | 'rewarded',
                        callbacks?: {
                            adStarted?: () => void;
                            adFinished?: () => void;
                            adError?: (error: any) => void;
                        }
                    ): Promise<void>;
                };
            };
        };
    }
}

export {};
