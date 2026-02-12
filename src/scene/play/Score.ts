// src/scenes/play/Score.ts
import ContainerX from '../../core/ContainerX';
import { G_EVT } from '../../events/EVT_HUB';
import { EVT_HUB_SAFE } from '../../events/SafeEventHub';
import { UIScale, CANVAS_ORIGINAL_WIDTH } from '../../ui/UIScale';

export class Score extends ContainerX {
    private currentScore: number = 0;
    private scoreRoot: createjs.MovieClip;
    private digitClips: createjs.MovieClip[] = [];

    constructor() {
        super();
        this.buildScoreDisplay();
        this.addEventListeners();
        this.applyResize();
        window.addEventListener('resize', () => this.applyResize());
    }

    private buildScoreDisplay(): void {
        this.scoreRoot = this.resource.getLibrary(
            'circle_2',
            'mScore'
        ) as createjs.MovieClip;
        this.addChild(this.scoreRoot);

        for (let i = 0; i <= 3; i++) {
            const clip = this.scoreRoot.getChildByName(
                `n${i}`
            ) as createjs.MovieClip;
            if (clip) {
                clip.gotoAndStop(0);
                this.digitClips.push(clip);
            }
        }
    }

    private applyResize(): void {
        UIScale.update();

        const sw = window.innerWidth;
        const sh = window.innerHeight;

        // ✅ 위치는 항상 Canvas 중앙 고정 (900x1600 기준)
        const canvasX = CANVAS_ORIGINAL_WIDTH / 2;
        const canvasY = 260;

        this.scoreRoot.x = canvasX;
        this.scoreRoot.y = canvasY;

        // ✅ 화면 비율에 따라 크기만 조정
        const aspectRatio = sw / sh;
        const targetAspectRatio = 9 / 16;

        if (aspectRatio < targetAspectRatio) {
            // 가로가 좁을 때: 크기 축소 (0.6 ~ 0.8)
            const scale = UIScale.scale;
            const canvasRenderWidth = CANVAS_ORIGINAL_WIDTH * scale;
            const canvasLeft = (sw - canvasRenderWidth) / 2;

            if (canvasLeft < 0) {
                // Canvas가 잘릴 때만 크기 축소
                const visibleRatio = sw / (CANVAS_ORIGINAL_WIDTH * scale);
                const targetScale = Math.max(
                    0.5,
                    Math.min(0.9, 0.9 * visibleRatio)
                );
                this.scoreRoot.scaleX = targetScale;
                this.scoreRoot.scaleY = targetScale;
            } else {
                // 잘리지 않으면 기본 크기
                this.scoreRoot.scaleX = 0.9;
                this.scoreRoot.scaleY = 0.9;
            }
        } else {
            // 화면이 넓을 때: 기본 크기
            this.scoreRoot.scaleX = 0.9;
            this.scoreRoot.scaleY = 0.9;
        }
    }

    private addEventListeners(): void {
        EVT_HUB_SAFE.on(G_EVT.DATA.SCORE_UPDATED, (e) => {
            this.handleScoreUpdate(e);
        });
    }

    private handleScoreUpdate(event: any): void {
        const { totalScore } = event.data;
        const prevScore = this.currentScore;

        if (typeof totalScore === 'number') {
            this.currentScore = totalScore;
            this.updateDisplay();
        }

        const diff = totalScore - prevScore;
        if (diff > 0) this.showFloatingScore(diff);
    }

    private updateDisplay(): void {
        const digits = this.currentScore.toString().split('').reverse();
        const totalDigits = digits.length;

        for (const clip of this.digitClips) {
            clip.gotoAndStop(1);
        }

        for (let i = 0; i < this.digitClips.length; i++) {
            const clip = this.digitClips[i];
            if (i < totalDigits) {
                const digit = parseInt(digits[i]);
                clip.gotoAndStop(digit);
            } else {
                clip.gotoAndStop(0);
            }
        }
    }

    private showFloatingScore(value: number) {
        const floatTxt = new createjs.Text(
            `+${value}`,
            '28px Arial',
            '#FFD700'
        );
        floatTxt.x = this.scoreRoot.x;
        floatTxt.y = this.scoreRoot.y - 80;
        floatTxt.textAlign = 'center';
        this.addChild(floatTxt);

        createjs.Tween.get(floatTxt)
            .to({ y: floatTxt.y - 40, alpha: 0 }, 800, createjs.Ease.quadOut)
            .call(() => this.removeChild(floatTxt));
    }

    public resetScore(): void {
        this.currentScore = 0;
        this.updateDisplay();
    }

    public getFinalScore(): number {
        return this.currentScore;
    }
}
