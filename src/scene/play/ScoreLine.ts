import ContainerX from '../../core/ContainerX';
import { UIScale, SAFE_WIDTH, SAFE_HEIGHT } from '../../ui/UIScale';

export class ScoreLine extends ContainerX {
    private icons: createjs.MovieClip[] = [];
    private totalFruits = 11; // bead 0~10

    constructor() {
        super();

        // mLine 무비클립 가져오기
        const base = this.resource.getLibrary('circle_2', 'mLine');
        this.addChild(base);

        // 내부 아이콘 참조
        for (let i = 0; i < this.totalFruits; i++) {
            const icon = base.getChildByName(`n${i}`) as createjs.MovieClip;
            if (icon) {
                icon.alpha = 0.15; // 처음엔 반투명
                this.icons.push(icon);
            }
        }

        this.x = UIScale.safeToCanvasX(64);
        this.y = UIScale.safeToCanvasY(SAFE_HEIGHT - 60); // 하단에서 100px 위
    }

    /** 특정 캐릭터를 "획득 완료"로 표시 */
    public activateFruit(type: number) {
        const icon = this.icons[type];
        if (!icon) return;

        // 이미 활성화된 경우 무시
        if (icon.alpha === 1) return;

        createjs.Tween.get(icon)
            .to({ alpha: 1 }, 300, createjs.Ease.quadOut)
            .call(() => {
                // 살짝 튀는 애니메이션 (피드백용)
                createjs.Tween.get(icon)
                    .to({ scaleX: 1.2, scaleY: 1.2 }, 100)
                    .to({ scaleX: 1.0, scaleY: 1.0 }, 100);
            });
    }
}
