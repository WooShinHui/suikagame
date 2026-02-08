import { RscMgr } from '../manager/RscMgr';

/**
 * 사운드 파일의 재생 시간을 가져온다.
 * @param key
 * @returns
 */
export function getSoundDuration(key: string): number {
    const snd = RscMgr.handle.getSound(key);
    return snd?.duration ?? 0;
}

/**
 * 해당 사운드 키가 등록되었는지 확인한다.
 * @param $key
 * @returns
 */
export function getSoundLoadComplete($key: string): boolean {
    return createjs.Sound.loadComplete($key);
}

/**
 * 사운드가 로드 되었는지 체크한다.
 * 최대 시간을 초과하면 실패 처리.
 * @param $key
 * @param interval 재시도 간격
 * @param timeout  전체 재시도 시간
 * @returns
 */
export async function waitForSoundLoad(
    $key: string,
    interval: number = 100,
    timeout: number = 10000
): Promise<void> {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        function check() {
            if (createjs.Sound.loadComplete($key)) {
                resolve();
            } else if (Date.now() - startTime > timeout) {
                reject(new Error(`Sound "${$key}" 로드 실패... 시간 초과`));
            } else {
                setTimeout(check, interval);
            }
        }

        check();
    });
}

// 생각중...
export function playOnceSound(): void {}
