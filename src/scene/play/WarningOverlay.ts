import DomX from '../../core/DomX';
import { EVT_HUB_SAFE } from '../../events/SafeEventHub';
import { G_EVT } from '../../events/EVT_HUB';
import View from './View';

export class WarningOverlay extends DomX {
    private isActive = false;

    constructor(private _view: View) {
        super(document.createElement('div'));

        const canvas = document.querySelector('canvas');
        const parent = canvas?.parentElement || document.body;
        parent.appendChild(this.htmlElement);

        this.create();

        EVT_HUB_SAFE.on(G_EVT.PLAY.WARNING_ON, this.show);
        EVT_HUB_SAFE.on(G_EVT.PLAY.WARNING_OFF, this.hide);
        EVT_HUB_SAFE.on(G_EVT.PLAY.GAME_OVER, this.hide);

        const style = document.createElement('style');
        style.innerHTML = `
@keyframes warningPulse {
    0%   { opacity: 0.25; }
    50%  { opacity: 0.55; }
    100% { opacity: 0.25; }
}`;
        document.head.appendChild(style);
    }

    private resizeToCanvas = () => {
        const canvas = document.querySelector('canvas');
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();

        // ✅ CSS 픽셀 기준으로 오버레이 배치 (DPR 자동 처리)
        Object.assign(this.htmlElement.style, {
            left: `${rect.left}px`,
            top: `${rect.top}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`,
        });
    };

    public dispose() {
        EVT_HUB_SAFE.off(G_EVT.PLAY.WARNING_ON, this.show);
        EVT_HUB_SAFE.off(G_EVT.PLAY.WARNING_OFF, this.hide);
        EVT_HUB_SAFE.off(G_EVT.PLAY.GAME_OVER, this.hide);
        window.removeEventListener('resize', this.resizeToCanvas);
    }

    private create() {
        const canvas = document.querySelector('canvas');
        const parent = canvas?.parentElement || document.body;

        parent.style.position = parent.style.position || 'relative';

        Object.assign(this.htmlElement.style, {
            position: 'absolute',
            pointerEvents: 'none',
            zIndex: '50',
            background:
                'radial-gradient(circle at center, rgba(255,0,0,0.0) 30%, rgba(120,0,0,0.65) 85%)',
            opacity: '0',
            transition: 'opacity 0.6s ease',
        });

        parent.appendChild(this.htmlElement);

        this.resizeToCanvas();
        window.addEventListener('resize', this.resizeToCanvas);
    }

    private show = () => {
        if (!this._view.getbActive) return;
        if (this.isActive) return;
        console.log('오버레이 보임');
        this.isActive = true;
        this.htmlElement.style.opacity = '1';
        this.htmlElement.style.animation =
            'warningPulse 2.2s ease-in-out infinite';
    };

    private hide = () => {
        console.log('오버레이 숨김');
        this.isActive = false;
        this.htmlElement.style.opacity = '0';
        this.htmlElement.style.animation = '';
    };
}
