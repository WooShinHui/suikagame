/**
 * Dom 매니저
 * 프로젝트마다 전역적으로 접근해서 사용해야 하는
 * Tag와 Element를 선언하여 사용한다.
 */

export class DomMgr {
    private static _handle: DomMgr;

    static get handle(): DomMgr {
        if (DomMgr._handle === undefined) {
            DomMgr._handle = new DomMgr();
        }
        return DomMgr._handle;
    }

    constructor() {
        // Tag 또는 Element 등록!
    }
}
