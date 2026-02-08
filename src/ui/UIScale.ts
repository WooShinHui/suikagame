export const BASE_WIDTH = 720;
export const BASE_HEIGHT = 1280;

export class UIScale {
    static scale = 1;
    static offsetX = 0;
    static offsetY = 0;

    static update() {
        const canvas = document.querySelector('canvas');
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();

        const canvasW = rect.width;
        const canvasH = rect.height;

        // ✅ 실제 캔버스 크기 기준 스케일
        this.scale = canvasH / BASE_HEIGHT;

        // ✅ 캔버스 안에서 중앙 정렬
        this.offsetX = rect.left + (canvasW - BASE_WIDTH * this.scale) / 2;
        this.offsetY = rect.top; // 세로는 꽉 차 있으니 0 또는 rect.top
    }

    static px(x: number) {
        return `${x * this.scale}px`;
    }

    static posX(x: number) {
        return `${this.offsetX + x * this.scale}px`;
    }

    static posY(y: number) {
        return `${this.offsetY + y * this.scale}px`;
    }

    static scaleElement(
        el: HTMLElement,
        baseX = 0,
        baseY = 0,
        baseW?: number,
        baseH?: number
    ) {
        this.update();
        if (baseW !== undefined) el.style.width = `${baseW * this.scale}px`;
        if (baseH !== undefined) el.style.height = `${baseH * this.scale}px`;
        el.style.left = `${this.offsetX + baseX * this.scale}px`;
        el.style.top = `${this.offsetY + baseY * this.scale}px`;
    }
}
