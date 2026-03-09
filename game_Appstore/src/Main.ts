import '../js/createjs.min.js';
import '../js/ScaleBitmap.js';
import '../js/RotationPlugin.js';
import App from './core/App';
import { AppConfig } from './core/CoreApp';
import PLAY from './scene/play/PLAY';
import { UIScale } from './ui/UIScale';
import { API_CONNECTOR } from './fetch/ApiConnector';
import { AdMobService } from './ads/AdmobService';

let canvas: HTMLCanvasElement;

function applyResize() {
    UIScale.update();
    if (!canvas) return;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.left = '0';
    canvas.style.top = '0';
}

window.onload = async () => {
    AdMobService.init();
    canvas = document.getElementById('create_cvs') as HTMLCanvasElement;
    applyResize();

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
