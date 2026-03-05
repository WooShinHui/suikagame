// src/ads/AdMobService.ts
import { AdMob } from '@capacitor-community/admob';

export class AdMobService {
    private static initialized = false;

    static async init(): Promise<void> {
        if (this.initialized) return;
        try {
            (window as any)._log?.('AdMob init 시작');
            await AdMob.initialize({
                testingDevices: [],
                initializeForTesting: true,
            });
            this.initialized = true;
            (window as any)._log?.('AdMob 초기화 완료');
        } catch (e: any) {
            (window as any)._log?.('AdMob 실패: ' + e?.message);
        }
    }

    // 나중에 광고 붙일 자리 - 지금은 아무것도 안 함
    static async showInterstitial(): Promise<void> {
        console.log('[AdMob] 전면광고 자리 (미구현)');
    }

    static async showRewarded(): Promise<boolean> {
        console.log('[AdMob] 보상광고 자리 (미구현)');
        return false;
    }
}
