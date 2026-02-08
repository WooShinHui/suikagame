import DomX from '../../core/DomX';
import { IntroVideo } from './IntroVideo';
import { IntroOverlay } from './IntroOverlay';
import { EVT_HUB, G_EVT } from '../../events/EVT_HUB';
import { EVT_HUB_SAFE } from '../../events/SafeEventHub';
import { IntroBtn } from './IntroBtn';

class IntroManager extends DomX {
    private video!: IntroVideo;
    private overlay!: IntroOverlay;
    private introBtn!: IntroBtn;

    constructor() {
        super(document.createElement('div'));
        this.setupContainer();

        EVT_HUB_SAFE.once(G_EVT.LOGIN.LOGIN_SUCCESS, () => {
            this.destroy();
        });
    }

    private setupContainer() {
        Object.assign(this.htmlElement.style, {
            width: '100%', // 부모 기준
            height: '100%',
            position: 'absolute',
            overflow: 'hidden',
            zIndex: '10',
            top: '0',
            left: '0',
        });
        document.body.appendChild(this.htmlElement);

        const resizeContainer = () => {
            const canvas = document.querySelector(
                'canvas'
            ) as HTMLCanvasElement;
            if (!canvas) return;

            const rect = canvas.getBoundingClientRect();
            Object.assign(this.htmlElement.style, {
                width: `${rect.width}px`,
                height: `${rect.height}px`,
                left: `${rect.left}px`,
                top: `${rect.top}px`,
            });
        };

        window.addEventListener('resize', resizeContainer);
        resizeContainer(); // 초기 적용
    }

    public create() {
        this.video = new IntroVideo(this.htmlElement);
        this.overlay = new IntroOverlay(this.htmlElement);
        this.introBtn = new IntroBtn(this.htmlElement);

        this.video.create();
        this.overlay.create();
        this.introBtn.create();
    }

    public destroy() {
        this.video?.destroy();
        this.overlay?.destroy();
        this.removeElement();
    }
}

export default IntroManager;
