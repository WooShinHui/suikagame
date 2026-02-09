// Safe Area: 모든 기기에서 보장하려는 영역
export const SAFE_WIDTH = 720;
export const SAFE_HEIGHT = 1280;

// Canvas 원본 크기 (배경 에셋 크기)
export const CANVAS_ORIGINAL_WIDTH = 900;
export const CANVAS_ORIGINAL_HEIGHT = 1600;

export class UIScale {
    static scale = 1;
    static canvasOffsetX = 0;
    static canvasOffsetY = 0;
    static safeOffsetX = 0;
    static safeOffsetY = 0;

    static canvasWidth = CANVAS_ORIGINAL_WIDTH;
    static canvasHeight = CANVAS_ORIGINAL_HEIGHT;

    /**
     * ✅ "Cover" 방식: 배경이 항상 화면을 덮음 (레터박스 절대 없음)
     */
    static update() {
        const sw = window.innerWidth;
        const sh = window.innerHeight;

        const scaleX = sw / CANVAS_ORIGINAL_WIDTH;
        const scaleY = sh / CANVAS_ORIGINAL_HEIGHT;

        this.scale = Math.max(scaleX, scaleY);

        this.canvasWidth = Math.ceil(sw / this.scale);
        this.canvasHeight = Math.ceil(sh / this.scale);

        this.canvasOffsetX = (CANVAS_ORIGINAL_WIDTH - this.canvasWidth) / 2;
        this.canvasOffsetY = (CANVAS_ORIGINAL_HEIGHT - this.canvasHeight) / 2;

        // ✅ Safe Area 오프셋 (중앙 하단 기준)
        this.safeOffsetX = ((this.canvasWidth - SAFE_WIDTH) / 2) * this.scale;

        // ✅ 세로는 하단 기준 (상단이 아님!)
        const safeBottomMargin = 100; // Canvas 원본 기준 하단 마진 (픽셀)
        const safeBottom = this.canvasHeight - safeBottomMargin;
        this.safeOffsetY = (safeBottom - SAFE_HEIGHT) * this.scale;
    }

    // Safe Area → Canvas 좌표 변환 (중앙 하단 기준)
    static safeToCanvasX(safeX: number): number {
        return this.canvasOffsetX + (this.canvasWidth - SAFE_WIDTH) / 2 + safeX;
    }

    static safeToCanvasY(safeY: number): number {
        // ✅ 하단 기준으로 수정
        const safeBottomMargin = 100;
        const safeBottom = this.canvasHeight - safeBottomMargin;
        return this.canvasOffsetY + (safeBottom - SAFE_HEIGHT) + safeY;
    }

    // Safe Area X 좌표 → 화면 픽셀
    static safeX(x: number): string {
        return `${this.safeOffsetX + x * this.scale}px`;
    }

    // Safe Area Y 좌표 → 화면 픽셀
    static safeY(y: number): string {
        return `${this.safeOffsetY + y * this.scale}px`;
    }

    // 스케일된 픽셀 값
    static px(val: number): string {
        return `${val * this.scale}px`;
    }

    // HTML 엘리먼트 배치 (Safe Area 기준)
    static layoutElement(
        el: HTMLElement,
        x: number,
        y: number,
        width?: number,
        height?: number
    ) {
        this.update();
        el.style.position = 'absolute';
        el.style.left = this.safeX(x);
        el.style.top = this.safeY(y);
        if (width !== undefined) el.style.width = this.px(width);
        if (height !== undefined) el.style.height = this.px(height);
    }
    /**
     * ✅ 화면 픽셀 기준 배치 (Canvas 크기 무관)
     * @param el HTML 엘리먼트
     * @param anchorX 'left' | 'center' | 'right'
     * @param anchorY 'top' | 'center' | 'bottom'
     * @param offsetX 앵커 기준 오프셋 (픽셀)
     * @param offsetY 앵커 기준 오프셋 (픽셀)
     * @param width 버튼 크기 (픽셀)
     * @param height 버튼 크기 (픽셀)
     */
    static layoutElementViewport(
        el: HTMLElement,
        anchorX: 'left' | 'center' | 'right',
        anchorY: 'top' | 'center' | 'bottom',
        offsetX: number,
        offsetY: number,
        width: number,
        height: number
    ) {
        const sw = window.innerWidth;
        const sh = window.innerHeight;

        el.style.position = 'absolute';
        el.style.width = `${width}px`;
        el.style.height = `${height}px`;

        // X 위치 계산
        let left: number;
        switch (anchorX) {
            case 'left':
                left = offsetX;
                break;
            case 'center':
                left = sw / 2 + offsetX - width / 2;
                break;
            case 'right':
                left = sw - width - offsetX;
                break;
        }

        // Y 위치 계산
        let top: number;
        switch (anchorY) {
            case 'top':
                top = offsetY;
                break;
            case 'center':
                top = sh / 2 + offsetY - height / 2;
                break;
            case 'bottom':
                top = sh - height - offsetY;
                break;
        }

        el.style.left = `${left}px`;
        el.style.top = `${top}px`;
    }

    static getResponsiveMargin(baseMargin: number): number {
        const sw = window.innerWidth;
        const sh = window.innerHeight;

        // 기준: 375×667 화면에서 baseMargin
        const baseWidth = 375;
        const baseHeight = 667;

        // 가로/세로 중 작은 비율 사용 (안전)
        const scaleRatio = Math.min(sw / baseWidth, sh / baseHeight);

        return Math.max(20, baseMargin * scaleRatio);
    }

    /**
     * ✅ 화면 비율 기반 크기 계산
     */
    static getResponsiveSize(
        baseSize: number,
        minSize: number,
        maxSize: number
    ): number {
        const sw = window.innerWidth;
        const baseWidth = 375;
        const scaleRatio = sw / baseWidth;

        return Math.min(maxSize, Math.max(minSize, baseSize * scaleRatio));
    }
}

// 하위 호환
export const BASE_WIDTH = SAFE_WIDTH;
export const BASE_HEIGHT = SAFE_HEIGHT;
