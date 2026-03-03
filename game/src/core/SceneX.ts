/**
 * 베이스 씬 클래스
 * Author: 김태신
 * Date: 2025-01-02
 */

import ContainerX from './ContainerX';
import EVT from '../EVT';
import { SystemMgr } from '../manager/SystemMgr';
import { RscMgr } from '../manager/RscMgr';
import { ExternalMgr } from '../manager/ExternalMgr';
import { DomMgr } from '../manager/DomMgr';
import { GlobalStoreMgr } from '../manager/GlobalStoreMgr';
import { TimeMgr } from '../manager/TimeMgr';
import { SoundMgr } from '../manager/SoundMgr';
import * as SoundX from '../util/SoundX';

class SceneX extends ContainerX {
    constructor() {
        super();
        this.name = this.constructor.name;
    }

    reset() {
        this.removeAllEventListeners();
        this.removeAllChildren();
        this.hide();
    }

    show() {
        this.visible = true;
    }
    hide() {
        this.visible = false;
    }

    // override ----------------------------------------
    async preload() {
        const scene_table = this.resource.MANIFEST[this.name];
        if (scene_table) {
            // 필요한 사운드 리소스가 있으면...
            if (scene_table['sounds']) {
                const len = scene_table['sounds'].length;
                for (let i = 0; i < len; i++) {
                    const key = scene_table['sounds'][i].key;
                    await SoundX.waitForSoundLoad(key);
                }
            }
        }
    }
    async create() {}

    public onMounted() {}

    onUnmounted() {
        this.removeAllEventListenerX();
        this.removeAllEventListeners();
        this.removeAllChildren();
        this.system.stopBGM();
    }

    public goScene($sceneName: string): void {
        this.dispatchEventX({ type: EVT.SCENE_START, sceneName: $sceneName });
    }

    // 매니저 싱글턴 클래스 --------------------------------------------------------------------
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

export default SceneX;
