/**
 * CreateJS 기반 컨테이너 클래스
 * Author: 김태신
 * Date: 2025-01-02
 */
import { SystemMgr } from '../manager/SystemMgr';
import { RscMgr } from '../manager/RscMgr';
import { ExternalMgr } from '../manager/ExternalMgr';
import { DomMgr } from '../manager/DomMgr';
import { GlobalStoreMgr } from '../manager/GlobalStoreMgr';
import { TimeMgr } from '../manager/TimeMgr';
import { SoundMgr } from '../manager/SoundMgr';
import BaseComponent, { mixin } from './BaseComponent';

class ContainerX extends createjs.Container {
    /**
     * CreateJS Container에 id 와 name 속성은 이미 있음
     * index 만 속성을 추가해서 사용.
     */
    private _index: number;

    constructor() {
        super();
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
    get time(): TimeMgr {
        return TimeMgr.handle;
    }
    get sound(): SoundMgr {
        return SoundMgr.handle;
    }
}

interface ContainerX extends BaseComponent {}
mixin(ContainerX, BaseComponent);

export default ContainerX;
