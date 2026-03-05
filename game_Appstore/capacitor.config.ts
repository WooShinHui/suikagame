import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.company.milkTFriendsPop',
    appName: 'milkTFriendsPop',
    webDir: 'dist',
    android: {
        allowMixedContent: false,
        backgroundColor: '#000000',
    },
    plugins: {
        SplashScreen: {
            launchShowDuration: 0, // ✅ 로딩화면이 있으므로 스플래시 즉시 제거
        },
    },
};

export default config;
