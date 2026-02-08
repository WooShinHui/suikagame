import App from './core/App';
import { AppConfig } from './core/CoreApp';
import Intro from './scene/intro/Intro';
import PLAY from './scene/play/PLAY';
import { API_CONNECTOR } from './fetch/ApiConnector';
import { UIScale } from './ui/UIScale';
import { BASE_HEIGHT, BASE_WIDTH } from './ui/UIScale';
// import { TIME_OUT } from './result/TimeOut';

let canvas: HTMLCanvasElement;
function applyResize() {
    UIScale.update();
    if (!canvas) return;

    // UIScale에서 세로 기준으로 계산한 배율 적용
    canvas.style.width = `${BASE_WIDTH * UIScale.scale}px`;
    canvas.style.height = `${BASE_HEIGHT * UIScale.scale}px`;

    // 중앙 정렬 좌표 적용 (마이너스 값이 들어오면 왼쪽으로 밀림)
    canvas.style.left = `${UIScale.offsetX}px`;
    canvas.style.top = `${UIScale.offsetY}px`;
}

window.onload = () => {
    canvas = document.getElementById('create_cvs') as HTMLCanvasElement;

    applyResize();
    window.addEventListener('resize', applyResize);

    const config: AppConfig = {
        canvas,
        context: canvas.getContext('2d'),
        outputWindow: false,
        width: 720,
        height: 1280,
        background: '#fff9d6',
        scene: [PLAY],
    };

    new App(config);
};
