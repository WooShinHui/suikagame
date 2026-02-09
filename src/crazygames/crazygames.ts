// src/types/crazygames.d.ts (새 파일)
declare global {
    interface Window {
        CrazyGames: {
            SDK: {
                init(): Promise<void>;
                user: {
                    getUser(): Promise<{
                        userId: string;
                        username: string;
                        countryCode: string;
                        profilePictureUrl: string;
                    } | null>;
                };
                game: {
                    sdkGameLoadingStart(): void;
                    sdkGameLoadingStop(): void;
                    gameplayStart(): void;
                    gameplayStop(): void;
                    happytime(): void;
                };
                ad: {
                    requestAd(type: 'midgame' | 'rewarded'): Promise<void>;
                };
            };
        };
    }
}

export {};
