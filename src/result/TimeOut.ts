import { EVT_HUB_SAFE } from '../events/SafeEventHub';
import { G_EVT } from '../events/EVT_HUB';

export class TimeOut {
    private static instance: TimeOut;
    private deadline: number;
    private checkInterval: number | null = null;
    private isFinished: boolean = false;
    private isWarningSent: boolean = false; // 1분 전 알림 보냈는지 여부

    // ✅ 날짜 형식 수정 (초까지만 입력)
    private readonly TARGET_TIME = new Date('2025-12-23T14:30:00').getTime();

    constructor() {
        // this.deadline = this.TARGET_TIME;
        // this.startTimer();
    }

    public static getInstance(): TimeOut {
        if (!TimeOut.instance) {
            TimeOut.instance = new TimeOut();
        }
        return TimeOut.instance;
    }

    private startTimer() {
        if (this.checkInterval) return;

        this.checkInterval = window.setInterval(() => {
            const now = Date.now();
            const remain = this.deadline - now;

            // 1️⃣ 종료 1분 전 (60,000ms) 알림
            if (remain <= 60000 && remain > 0 && !this.isWarningSent) {
                this.isWarningSent = true;
                alert(
                    '대회 종료 1분 전입니다! 설정을 눌러 `포기하기` 버튼을 눌러주세요. \n버튼을 누르시지 않으시면 점수는 저장되지 않습니다.'
                );
            }

            // 2️⃣ 종료 시각 도달
            if (remain <= 0 && !this.isFinished) {
                this.isFinished = true;
                if (this.checkInterval) clearInterval(this.checkInterval);

                this.forceTerminate();
            }
        }, 1000);
    }

    private async forceTerminate() {
        // 게임 화면(캔버스)이 있을 때만 동작
        const isInGame = document.querySelector('canvas');
        if (!isInGame) return;

        console.log('⏰ 마감 시각 도달. 즉시 종료합니다.');

        // 랭킹판 같은 UI를 띄우지 않고 오직 alert만 띄웁니다.
        alert('종료되었습니다! 마감 시간이 지나 더 이상 참여하실 수 없습니다.');

        // 확인 버튼 누르면 즉시 메인 페이지로 이동하거나 새로고침
        window.location.reload();
    }
}

export const TIME_OUT = TimeOut.getInstance();
