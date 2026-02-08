import ContainerX from '../../core/ContainerX';
import { EVT_HUB, G_EVT } from '../../events/EVT_HUB';
import { EVT_HUB_SAFE } from '../../events/SafeEventHub';

export class Score extends ContainerX {
    private currentScore: number = 0;
    private scoreRoot: createjs.MovieClip;
    private digitClips: createjs.MovieClip[] = [];

    constructor() {
        super();
        this.buildScoreDisplay();
        this.addEventListeners();
    }

    private buildScoreDisplay(): void {
        // 🔹 mScore 무비클립 가져오기
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
                clip.gotoAndStop(0); // 초기 프레임 (0)
                this.digitClips.push(clip); // ← push로 순서 유지
            }
        }

        // 중앙 또는 원하는 위치 조정
        this.scoreRoot.x = 240;
        this.scoreRoot.y = 80;
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
        const digits = this.currentScore.toString().split('').reverse(); // 1의 자리부터 접근
        const totalDigits = digits.length;

        // 전부 숨기지 않고 0 프레임으로 초기화
        for (const clip of this.digitClips) {
            clip.gotoAndStop(1);
        }

        for (let i = 0; i < this.digitClips.length; i++) {
            const clip = this.digitClips[i];
            if (i < totalDigits) {
                const digit = parseInt(digits[i]);
                clip.gotoAndStop(digit); // FLA는 frame1 = 0, frame10 = 9
            } else {
                clip.gotoAndStop(0); // 남는 자리 0으로
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
