/**
 * CreateJS DOMElement 확장 클래스
 * Author: 김태신
 * Date: 2025-03-18
 */
import { SystemMgr } from '../manager/SystemMgr';
import { RscMgr } from '../manager/RscMgr';
import { ExternalMgr } from '../manager/ExternalMgr';
import { DomMgr } from '../manager/DomMgr';
import { GlobalStoreMgr } from '../manager/GlobalStoreMgr';
import BaseComponent, { mixin } from './BaseComponent';

class DomX extends createjs.DOMElement {
    /**
     * CreateJS DOMElement id 와 name 속성은 이미 있음
     * index 만 속성을 추가해서 사용.
     */
    private _index: number;

    constructor($htmlElement: HTMLElement) {
        super($htmlElement);
    }

    set index($n: number) {
        this._index = $n;
    }
    get index(): number {
        return this._index;
    }

    // [공통 유틸리티 기능] --------------------------------------------------------------------
    public setPostiion($x: number, $y: number) {
        this.x = $x;
        this.y = $y;
    }

    // [전용 기능]
    /**
     * 해당 클래스로 생성된 객체를 removeChild() 해도
     * Tag는 HTML에 남아있게 된다.
     * 수동으로 삭제할것.
     */
    public removeElement(): void {
        this.htmlElement.remove();
    }

    // 매니저  클래스 --------------------------------------------------------------------
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
    get dom(): DomMgr {
        return DomMgr.handle;
    }
}
interface DomX extends BaseComponent {}
mixin(DomX, BaseComponent);

export default DomX;
