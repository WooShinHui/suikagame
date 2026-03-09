import ContainerX from '../../core/ContainerX';
import { UIScale, SAFE_WIDTH, SAFE_HEIGHT } from '../../ui/UIScale';
import { Box } from './Box';

export class ScoreLine extends ContainerX {
    private icons: createjs.MovieClip[] = [];
    private totalFruits = 11;
    private base: createjs.MovieClip;
    private box: Box;

    private readonly BOX_BOTTOM_OFFSET = 60; // 박스 하단에서 아래로 간격

    constructor(box: Box) {
        super();
        this.box = box;

        this.base = this.resource.getLibrary('circle_2', 'mLine');
        this.addChild(this.base);
        console.log('mLine bounds:', this.base.getBounds());
        for (let i = 0; i < this.totalFruits; i++) {
            const icon = this.base.getChildByName(
                `n${i}`
            ) as createjs.MovieClip;
            if (icon) {
                icon.alpha = 0.15;
                this.icons.push(icon);
            }
        }

        this.applyLayout();
        window.addEventListener('resize', () => this.applyLayout());
    }

    private applyLayout(): void {
        const { centerX, bottomY } = this.box.getPhysicsParams();
        const boxScale = this.box.physicsScale;

        // ✅ bounds 기준 정확한 중앙 설정
        // x: -28.2, width: 616 → 중앙 = -28.2 + 616/2 = 279.8
        this.base.regX =
            this.base.getBounds()!.x + this.base.getBounds()!.width / 2;
        this.base.regY =
            this.base.getBounds()!.y + this.base.getBounds()!.height / 2;

        this.scaleX = boxScale;
        this.scaleY = boxScale;

        this.x = centerX;
        this.y = bottomY + this.BOX_BOTTOM_OFFSET;
    }

    public activateFruit(type: number) {
        const icon = this.icons[type];
        if (!icon) return;
        if (icon.alpha === 1) return;

        createjs.Tween.get(icon)
            .to({ alpha: 1 }, 300, createjs.Ease.quadOut)
            .call(() => {
                createjs.Tween.get(icon)
                    .to({ scaleX: 1.2, scaleY: 1.2 }, 100)
                    .to({ scaleX: 1.0, scaleY: 1.0 }, 100);
            });
    }
}
