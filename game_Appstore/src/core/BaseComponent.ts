/**
 * 버블링, 캔슬링을 위한 공용 이벤트 리스너
 * 코어라면 해당 클래스를 상속 받아서 사용하고
 * 코어가 있는 클래스는 믹스인하여 사용.
 * Author: 김태신
 * Date: 2025-02-28
 */
import ContainerX from './ContainerX';
import SceneX from './SceneX';

export interface EventX {
    type: string;
    target?: ContainerX | SceneX;
    // 전달 인자용
    [key: string]: any;
}

export function mixin<
    T extends new (...args: any[]) => {},
    U extends new (...args: any[]) => {}
>(targetClass: T, sourceClass: U) {
    Object.getOwnPropertyNames(sourceClass.prototype).forEach((name) => {
        if (name !== 'constructor') {
            (targetClass as any).prototype[name] = sourceClass.prototype[name];
        }
    });
}

class BaseComponent {
    private listener: object;
    private once: object;
    constructor() {
        this.listener = {};
        this.once = {};
    }

    //  [이벤트 부분]
    public onceX(
        $eventType: string,
        $callBack: string | Function,
        $scope: ContainerX | SceneX | BaseComponent
    ): void {
        if (this.once === undefined) this.once = {};
        if (this.once[$eventType] === undefined) {
            this.once[$eventType] = {};
        }

        let fnc: Function;

        if (typeof $callBack === 'string') {
            fnc = $scope[$callBack]['bind']($scope);
            try {
                fnc = $scope[$callBack]['bind']($scope);
            } catch {
                // if (!fnc)
                console.error(
                    `이벤트(${$eventType.toUpperCase()})의 콜백 함수${$callBack}를 찾을 수 없습니다.`
                );
            }
        } else {
            fnc = $callBack.bind($scope);
        }

        this.once[$eventType] = {};
        this.once[$eventType].param = { type: $eventType, target: this };
        this.once[$eventType].callback = fnc;
    }

    public onX(
        $eventType: string,
        $callBack: string | Function,
        $scope: ContainerX | SceneX | BaseComponent
    ): void {
        if (this.listener === undefined) this.listener = {};
        if (this.listener[$eventType] === undefined) {
            this.listener[$eventType] = {};
        }

        let fnc: Function;

        if (typeof $callBack === 'string') {
            fnc = $scope[$callBack]['bind']($scope);
            try {
                fnc = $scope[$callBack]['bind']($scope);
            } catch {
                // if (!fnc)
                console.error(
                    `이벤트(${$eventType.toUpperCase()})의 콜백 함수${$callBack}를 찾을 수 없습니다.`
                );
            }
        } else {
            fnc = $callBack.bind($scope);
        }

        this.listener[$eventType] = {};
        this.listener[$eventType].param = { type: $eventType, target: this };
        this.listener[$eventType].callback = fnc;
    }

    public addEventListenerX(
        $eventType: string,
        $callBack: string | Function,
        $scope: ContainerX | SceneX | BaseComponent
    ): void {
        if (this.listener === undefined) this.listener = {};
        if (this.listener[$eventType] === undefined) {
            this.listener[$eventType] = {};
        }

        let fnc: Function;

        if (typeof $callBack === 'string') {
            fnc = $scope[$callBack]['bind']($scope);
            try {
                fnc = $scope[$callBack]['bind']($scope);
            } catch {
                // if (!fnc)
                console.error(
                    `이벤트(${$eventType.toUpperCase()})의 콜백 함수${$callBack}를 찾을 수 없습니다.`
                );
            }
        } else {
            fnc = $callBack.bind($scope);
        }

        this.listener[$eventType] = {};
        this.listener[$eventType].param = { type: $eventType, target: this };
        this.listener[$eventType].callback = fnc;
    }

    public offX($eventType: string): void {
        if (this.listener[$eventType]) {
            delete this.listener[$eventType];
        }
    }

    public removeEventListenerX($eventType: string): void {
        if (this.listener[$eventType]) {
            delete this.listener[$eventType];
        }
    }

    // 모든 이벤트 삭제
    public removeAllEventListenerX(): void {
        for (let evt in this.listener) {
            delete this.listener[evt];
        }
        this.listener = {};
    }

    // 이벤트 디스패쳐
    public dispatchEventX($e: EventX): void {
        // if (this.listener === undefined) return;

        if (this.listener != undefined) {
            if (this.listener[$e.type] != undefined) {
                const param = this.listener[$e.type].param;

                // 버블링 과정에서 추가 또는 업데이트된 속성이 있다면 반영한다.
                for (let property in $e) {
                    param[property] = $e[property];
                }
                this.listener[$e.type].callback(param);
            }
        }

        if (this.once != undefined) {
            if (this.once[$e.type] != undefined) {
                const param = this.once[$e.type].param;

                // 버블링 과정에서 추가 또는 업데이트된 속성이 있다면 반영한다.
                for (let property in $e) {
                    param[property] = $e[property];
                }
                this.once[$e.type].callback(param);
                this.once[$e.type] = null;
            }
        }
    }
}

export default BaseComponent;
