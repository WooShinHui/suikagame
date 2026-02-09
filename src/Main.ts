import App from './core/App';
import { AppConfig } from './core/CoreApp';
import PLAY from './scene/play/PLAY';
import { UIScale } from './ui/UIScale';

let canvas: HTMLCanvasElement;

function applyResize() {
    UIScale.update();
    if (!canvas) return;

    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.left = '0';
    canvas.style.top = '0';
}

window.onload = () => {
    canvas = document.getElementById('create_cvs') as HTMLCanvasElement;

    applyResize();
    window.addEventListener('resize', applyResize);

    // ✅ 초기 Canvas 크기 설정
    UIScale.update();

    const config: AppConfig = {
        canvas,
        context: canvas.getContext('2d'),
        outputWindow: false,
        width: UIScale.canvasWidth,
        height: UIScale.canvasHeight,
        background: '#fff9d6',
        scene: [PLAY],
    };

    new App(config);
};
