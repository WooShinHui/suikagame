import { EVT_HUB, G_EVT } from '../../events/EVT_HUB';
import { EVT_HUB_SAFE } from '../../events/SafeEventHub';

export class IntroVideo {
    private video: HTMLVideoElement | null = null;
    private container: HTMLElement;
    private isSkipped: boolean;

    constructor(container: HTMLElement) {
        this.container = container;

        EVT_HUB_SAFE.once(G_EVT.LOGIN.LOGIN_SUCCESS, () => {
            this.destroy();
        });
        EVT_HUB_SAFE.once(G_EVT.INTRO.SKIP_CLICKED, (e) => {
            console.log(e.data);
            this.isSkipped = e.data;
        });
        EVT_HUB_SAFE.once(G_EVT.VIDEO.PLAY, () => {
            this.video.play().catch(console.error);
        });
    }

    public create() {
        const video = document.createElement('video');
        this.video = video;

        Object.assign(video, {
            src: '/assets/video/intro.mp4',
            loop: false,
            autoplay: true,
            playsInline: true,
            preload: 'metadata',
        });
        video.preload = 'metadata';
        Object.assign(video.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: '1',
            opacity: '1',
            transition: 'opacity 0.8s ease-out',
        });

        video.addEventListener('ended', () => this.finish());
        this.container.appendChild(video);

        // ===============================
        // 반응형 크기 조정
        // ===============================
        const resizeVideo = () => {
            if (!this.video) return;
            const rect = this.container.getBoundingClientRect();
            Object.assign(this.video.style, {
                width: `${rect.width}px`,
                height: `${rect.height}px`,
            });
        };

        window.addEventListener('resize', resizeVideo);
        resizeVideo(); // 초기 적용
    }

    private finish() {
        if (!this.video) return;
        const v = this.video;

        // 1) 일단 재생 멈춤 (현재 프레임 유지)
        v.pause();

        // 2) 배경 모드 스타일 적용
        Object.assign(v.style, {
            zIndex: '0', // 뒤로 보내기
            opacity: '1', // 불투명 유지
            transition: 'filter 0.5s ease, opacity 0.5s ease',
        });

        if (this.isSkipped) return;
        // 3) 더 이상 remove 하지 않음!
        EVT_HUB_SAFE.emit(G_EVT.INTRO.FINISHED);
    }

    public skip() {
        this.finish();
    }

    public destroy() {
        this.video?.remove();
        this.video = null;
    }
}
