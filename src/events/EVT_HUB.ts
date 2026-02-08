// EVT_HUB.ts (수정된 코드)

// 1️⃣ 이벤트 타입 정의 (변수명 A_EVT -> G_EVT로 수정 반영)
export const G_EVT = {
    INTRO: {
        SKIP: 'INTRO_SKIP',
        FINISHED: 'INTRO_FINISHED',
        SKIP_CLICKED: 'SKIP_CLICKED',
    },
    MENU: {
        START_GAME: 'START_GAME',
        INTRO_OPEN_OPTION: 'INTRO_OPEN_OPTION',
        INGAME_OPEN_OPTION: 'INGAME_OPEN_OPTION',
        OPEN_PROFILE: 'OPEN_PROFILE',
    },
    PLAY: {
        GAME_OVER: 'PLAY_GAME_OVER',
        REQUEST_COLLISION_SAVE: 'PLAY_REQUEST_COLLISION_SAVE',
        SHOW_RESULT: 'SHOW_RESULT',
        SESSION_STARTED: 'SESSION_STARTED',
        REQUEST_SESSION_INIT: 'PLAY_REQUEST_SESSION_INIT',
        REQUEST_RANK_LOAD: 'PLAY_REQUEST_RANK_LOAD',
        MERGE_SUCCESS: 'PLAY_MERGE_SUCCESS',
        MERGE_REQUEST: 'PLAY_MERGE_REQUEST',
        MERGE_RESET: 'PLAY_MERGE_RESET',
        MERGE_FAIL: 'PLAY_MERGE_FAIL',
        WARNING_ON: 'PLAY_WARNING_ON',
        WARNING_OFF: 'PLAY_WARNING_OFF',
        TIME_OUT: 'PLAY_TIME_OUT',
    },
    API: {
        COLLISION_SAVE_SUCCESS: 'API_COLLISION_SAVE_SUCCESS',
        COLLISION_SAVE_FAIL: 'API_COLLISION_SAVE_FAIL',
    },
    LOGIN: {
        SHOW_LOGIN: 'SHOW_LOGIN',
        LOGIN_SUCCESS: 'LOGIN_SUCCESS',
    },
    DATA: {
        DATA_SEND: 'DATA_SEND',
        SCORE_UPDATED: 'SCORE_UPDATED',
        SAVE_SCORE_RESULT: 'SAVE_SCORE_RESULT',
        SCORE_RESET: 'SCORE_RESET',
        SCORE_RESET_FAIL: 'SCORE_RESET_FAIL',
        SCORE_RESET_SUCCESS: 'SCORE_RESET_SUCCESS',
    },
    VIDEO: {
        PLAY: 'VIDEO_PLAY',
    },
    RE: {
        START: 'RE_START',
    },
    BGM: {
        CHANGE: 'BGM_CHANGE',
    },
};

// 2️⃣ EventEmitter 본체 (emit 메서드에 로깅 추가)
export const EVT_HUB = new (class {
    private debugMode: boolean = true; // 🚨 디버그 모드 On/Off 스위치

    constructor() {
        (createjs.EventDispatcher as any).initialize(this);
    }

    on(type: string, listener: (e: any) => void) {
        if (!(this as any)._listeners)
            (createjs.EventDispatcher as any).initialize(this);

        const listeners = (this as any)._listeners?.[type] || [];
        if (!listeners.includes(listener)) {
            (this as any).addEventListener(type, listener);
        }
    }

    off(type: string, listener: (e: any) => void) {
        console.log(`[EVENT OFF] 시도: ${type}`, listener);
        (this as any).removeEventListener(type, listener);

        // 확인용: 여전히 남아있는 리스너
        const remaining = (this as any)._listeners?.[type]?.length || 0;
        console.log(`[EVENT OFF] ${type} 남은 리스너 수: ${remaining}`);
    }

    emit(type: string, data?: any) {
        if (this.debugMode) {
            // 🚨 이벤트 발행 시 콘솔에 기록 🚨
            console.groupCollapsed(`[EVENT EMIT] ${type}`);
            console.log('Payload:', data);
            // 이벤트를 발생시킨 호출 스택을 보여주어 어디서 emit했는지 추적 가능
            console.trace('Origin Stack:');
            console.groupEnd();
        }

        (this as any).dispatchEvent({ type, data });
    }

    once(type: string, listener: (e: any) => void) {
        const wrapper = (e: any) => {
            listener(e);
            this.off(type, wrapper);
        };
        this.on(type, wrapper);
    }
})();
