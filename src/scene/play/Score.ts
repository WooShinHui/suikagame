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
        const { totalScore, x, y } = event.data;
        const prevScore = this.currentScore;

        if (typeof totalScore === 'number') {
            this.currentScore = totalScore;
            this.updateDisplay();
        }

        const diff = totalScore - prevScore;
        if (diff > 0) {
            // ✅ 좌표 있으면 합체 지점, 없으면 점수판 위 fallback
            const floatX = x ?? this.scoreRoot.x;
            const floatY = y != null ? y - 40 : this.scoreRoot.y - 60;
            this.showFloatingScore(diff, floatX, floatY);
        }
    }

    private showFloatingScore(value: number, x: number, y: number) {
        const fontSize = value >= 100 ? 80 : value >= 20 ? 72 : 64;
        const fillColor =
            value >= 100 ? '#FFD700' : value >= 20 ? '#FFF176' : '#ffffff';
        const outlineColor = value >= 100 ? '#7a4a00' : '#5a2000';
        const text = `+${value}`;
        const font = `bold ${fontSize}px "SchoolSafeDungGeunMiSo", Arial`;

        // ✅ 컨테이너로 묶어서 한 번에 트윈
        const ct = new createjs.Container();
        ct.x = x;
        ct.y = y;

        // 외곽선 레이어 (4방향 offset으로 테두리 효과)
        const offsets = [
            [-3, 0],
            [3, 0],
            [0, -3],
            [0, 3],
            [-2, -2],
            [2, -2],
            [-2, 2],
            [2, 2],
        ];
        for (const [ox, oy] of offsets) {
            const outline = new createjs.Text(text, font, outlineColor);
            outline.x = ox;
            outline.y = oy;
            outline.textAlign = 'center';
            ct.addChild(outline);
        }

        // 메인 텍스트 레이어
        const fill = new createjs.Text(text, font, fillColor);
        fill.x = 0;
        fill.y = 0;
        fill.textAlign = 'center';
        ct.addChild(fill);

        ct.scaleX = 0.1;
        ct.scaleY = 0.1;
        ct.alpha = 0;
        this.addChild(ct);

        createjs.Tween.get(ct)
            .to(
                { scaleX: 1.5, scaleY: 1.5, alpha: 1, y: y - 30 },
                100,
                createjs.Ease.quadOut
            )
            .to({ scaleX: 0.9, scaleY: 1.1 }, 80, createjs.Ease.quadIn)
            .to({ scaleX: 1.1, scaleY: 0.9 }, 60, createjs.Ease.quadOut)
            .to({ scaleX: 1.0, scaleY: 1.0 }, 50, createjs.Ease.quadIn)
            .wait(250)
            .to(
                { y: y - 120, alpha: 0, scaleX: 0.8, scaleY: 0.8 },
                450,
                createjs.Ease.quadIn
            )
            .call(() => this.removeChild(ct));

        // 파티클
        const particleCount =
            value >= 100 ? 4 : value >= 20 ? 3 : value >= 10 ? 2 : 0;
        const particles = ['⭐', '✨', '💫'];

        for (let i = 0; i < particleCount; i++) {
            const star = new createjs.Text(
                particles[i % particles.length],
                `${16 + Math.random() * 10}px Arial`,
                '#FFD700'
            );
            const angle = (i / particleCount) * Math.PI * 2;
            const dist = 25 + Math.random() * 20;
            star.x = x + Math.cos(angle) * 15;
            star.y = y;
            star.textAlign = 'center';
            star.alpha = 0;
            this.addChild(star);

            createjs.Tween.get(star)
                .wait(i * 40)
                .to(
                    {
                        alpha: 1,
                        x: star.x + Math.cos(angle) * dist,
                        y: star.y + Math.sin(angle) * dist - 20,
                        scaleX: 1.3,
                        scaleY: 1.3,
                    },
                    200,
                    createjs.Ease.quadOut
                )
                .to(
                    { alpha: 0, y: star.y - 60, scaleX: 0.5, scaleY: 0.5 },
                    300,
                    createjs.Ease.quadIn
                )
                .call(() => this.removeChild(star));
        }
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
    public resetScore(): void {
        this.currentScore = 0;
        this.updateDisplay();
    }

    public getFinalScore(): number {
        return this.currentScore;
    }
}
