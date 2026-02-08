import { EVT_HUB, G_EVT } from '../../events/EVT_HUB';
import ProfileUI from './ProfileUI';

class ProfileManager {
    private activeProfile?: ProfileUI;

    constructor() {
        this.registerEvents();
    }

    private registerEvents() {
        EVT_HUB.on(G_EVT.MENU.OPEN_PROFILE, (event: any) => {
            const userId = event?.data?.userId;

            if (!userId) {
                console.warn('[PROFILE] userId 없음.');
                return;
            }

            // 기존 UI 있으면 제거
            this.activeProfile?.onUnmounted();

            // 새 UI 생성
            const ui = new ProfileUI();
            ui.create(userId);

            this.activeProfile = ui;
        });
    }
}

export default ProfileManager;
