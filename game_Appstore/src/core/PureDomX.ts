/**
 * 순수 HTML DOM 컴포넌트 (CreateJS 무관)
 * Author: 김태신
 * Date: 2025-03-18
 */
import { SystemMgr } from '../manager/SystemMgr';
import { RscMgr } from '../manager/RscMgr';
import { ExternalMgr } from '../manager/ExternalMgr';
import { GlobalStoreMgr } from '../manager/GlobalStoreMgr';

class PureDomX {
    protected htmlElement: HTMLElement;
    private _index: number = 0;

    constructor($htmlElement: HTMLElement) {
        this.htmlElement = $htmlElement;

        // ✅ 기본 스타일 (CreateJS transform 차단)
        Object.assign(this.htmlElement.style, {
            position: 'absolute',
            transform: 'none',
            transformOrigin: 'top left',
        });
    }

    set index($n: number) {
        this._index = $n;
    }

    get index(): number {
        return this._index;
    }

    public setPosition($x: number, $y: number) {
        this.htmlElement.style.left = `${$x}px`;
        this.htmlElement.style.top = `${$y}px`;
    }

    public removeElement(): void {
        this.htmlElement.remove();
    }

    // 매니저 접근자
    get system(): SystemMgr {
        return SystemMgr.handle;
    }

    get resource(): RscMgr {
        return RscMgr.handle;
    }

    get external(): ExternalMgr {
        return ExternalMgr.handle;
    }

    get global(): GlobalStoreMgr {
        return GlobalStoreMgr.handle;
    }
}

export default PureDomX;
