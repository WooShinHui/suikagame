import { EVT_HUB, G_EVT } from '../events/EVT_HUB';
import { EVT_HUB_SAFE } from '../events/SafeEventHub';
import CryptoJS from 'crypto-js'; // 해시 계산용 라이브러리

export class ApiConnector {
    private static instance: ApiConnector | null = null;
    private SERVER_BASE_URL: string = 'https://suikagame.ddns.net';
    private currentId: string | null = null;
    public currentSessionId: string | null = null;
    private currentUsername: string | null = null;
    private sessionSecret: string | null = null; // 서버에서 발급받은 비밀키

    private constructor() {
        this.initEventListeners();
        this.initServerSession({
            userId: localStorage.getItem('guest_user_id') || 'guest',
        });
    }

    // 3. 인스턴스 접근 메서드
    public static getInstance(): ApiConnector {
        if (!ApiConnector.instance) {
            ApiConnector.instance = new ApiConnector();
        }
        return ApiConnector.instance;
    }
    public refreshSession() {
        this.initServerSession({
            userId: localStorage.getItem('guest_user_id') || 'guest',
        });
    }
    /**
     * 최종 점수를 서버에 전송 (암호화 + 해시 포함)
     */
    public async submitFinalScore(score: number): Promise<any> {
        if (!this.currentSessionId || !this.sessionSecret) {
            console.error('세션 정보가 없습니다.');
            return null;
        }

        try {
            const userId = localStorage.getItem('guest_user_id') || 'guest';
            const username = localStorage.getItem('guest_user_name') || '익명';

            // 1. 서버와 약속한 해시 생성 (점수:세션ID:비밀키)
            // crypto-js의 SHA256을 사용합니다.
            const hash = CryptoJS.SHA256(
                `${score}:${this.currentSessionId}:${this.sessionSecret}`
            ).toString();

            // 2. 전송할 데이터 뭉치 (payload)
            const payload = {
                s: score, // score
                u: userId, // userId
                n: username, // username
                h: hash, // hash
                i: this.currentSessionId, // sessionId
            };

            // 3. 데이터 전체를 AES 암호화
            const encryptedData = CryptoJS.AES.encrypt(
                JSON.stringify(payload),
                this.sessionSecret
            ).toString();

            // 4. 서버로 전송
            const response = await fetch(
                `${this.SERVER_BASE_URL}/api/final-score`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        i: this.currentSessionId,
                        data: encryptedData,
                    }),
                }
            );

            const result = await response.json();

            // 5. 서버 응답도 암호화되어 오므로 복호화해서 반환
            if (result.d) {
                const bytes = CryptoJS.AES.decrypt(
                    result.d,
                    this.sessionSecret
                );
                const decryptedData = JSON.parse(
                    bytes.toString(CryptoJS.enc.Utf8)
                );
                console.log('🏆 점수 저장 완료:', decryptedData);
                return decryptedData;
            }

            return result;
        } catch (error) {
            console.error('점수 제출 중 오류 발생:', error);
            return null;
        }
    }

    private initEventListeners(): void {
        EVT_HUB_SAFE.on(
            G_EVT.PLAY.REQUEST_COLLISION_SAVE,
            this.handleCollisionSaveRequest.bind(this)
        );
        EVT_HUB_SAFE.on(
            G_EVT.LOGIN.LOGIN_SUCCESS,
            this.handleLoginSuccess.bind(this)
        );
        EVT_HUB_SAFE.on(G_EVT.PLAY.REQUEST_RANK_LOAD, (e) =>
            this.loadRanking(e.data.userId)
        );
        EVT_HUB_SAFE.on(G_EVT.DATA.SCORE_RESET, () => this.resetScore());

        EVT_HUB_SAFE.on(G_EVT.PLAY.SESSION_STARTED, (e: any) => {
            const data = e.data || {};
            if (data.isServerVerified) {
                this.currentSessionId = data.gameSessionId;
                return;
            }
            this.initServerSession(data);
            this.updateUsernameFromLocal();
        });
    }

    private updateUsernameFromLocal() {
        try {
            const localUsername = localStorage.getItem('guest_user_name');
            const localTeam = localStorage.getItem('guest_team_name');
            if (localTeam && localUsername) {
                this.currentUsername = `${localTeam}/${localUsername}`;
            }
        } catch (err) {}
    }

    private initServerSession(data: any) {
        fetch(`${this.SERVER_BASE_URL}/api/start-session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: data.userId }),
        })
            .then((res) => res.json())
            .then((resData) => {
                // 서버가 생성한 세션 ID와 비밀키 저장
                this.currentSessionId = resData.gameSessionId;
                this.sessionSecret = resData.sessionSecret;

                // 세션이 완전히 준비되었음을 다시 알림 (isServerVerified 플래그)
                EVT_HUB_SAFE.emit(G_EVT.PLAY.SESSION_STARTED, {
                    gameSessionId: this.currentSessionId,
                    userId: data.userId,
                    isServerVerified: true,
                });
            })
            .catch((err) =>
                console.error('[ApiConnector] Session Init Fail:', err)
            );
    }

    private handleCollisionSaveRequest(event: any): void {
        const { finalScore, gameSessionId, username } = event.data;

        // ✅ 수정: currentId가 없더라도 세션ID를 유저ID로 쓰지 말고, 로컬스토리지에서 가져옵니다.
        const userIdFromStorage = localStorage.getItem('guest_user_id');

        const userIdToSend =
            this.currentId && this.currentId !== 'guest'
                ? this.currentId
                : userIdFromStorage || 'guest'; // 👈 세션ID 대신 스토리지 ID 사용

        const usernameToSend = this.currentUsername || username || null;

        this.sendFinalScore(
            finalScore,
            userIdToSend,
            usernameToSend,
            gameSessionId || this.currentSessionId
        );
    }

    public async sendFinalScore(
        finalScore: number,
        userId: string,
        username: string | null,
        gameSessionId?: string
    ) {
        const url = `${this.SERVER_BASE_URL}/api/final-score`;

        const sessionKey = this.sessionSecret;
        const sId = gameSessionId || this.currentSessionId;

        if (!sessionKey || !sId) {
            console.error('[API] No Session Secret or ID found.');
            return;
        }

        const rawPayload = `${finalScore}:${sId}:${sessionKey}`;
        const hash = CryptoJS.SHA256(rawPayload).toString();

        const rawData = {
            s: finalScore,
            u: userId,
            i: sId,
            h: hash,
            n: username,
            t: Date.now(),
        };

        const encryptedData = CryptoJS.AES.encrypt(
            JSON.stringify(rawData),
            sessionKey
        ).toString();

        const finalBody = {
            i: sId,
            data: encryptedData,
        };

        fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(finalBody),
        })
            .then((r) => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            })
            .then((serverRes: any) => {
                // 🔥 [수정] 서버의 암호화된 응답 복호화
                try {
                    // 서버가 { d: "..." } 형태로 보낸다고 가정합니다.
                    const bytes = CryptoJS.AES.decrypt(serverRes.d, sessionKey);
                    const decryptedData = JSON.parse(
                        bytes.toString(CryptoJS.enc.Utf8)
                    );

                    // 복호화된 데이터를 사용하여 결과 화면 표시
                    EVT_HUB_SAFE.emit(G_EVT.PLAY.SHOW_RESULT, {
                        mode: 'GAME_OVER',
                        userId: decryptedData.userId, // 서버 resultData 필드명에 맞춤
                        finalScore: decryptedData.totalScore,
                        previousHighScore: decryptedData.previousHighScore,
                    });
                } catch (decodeError) {
                    console.error('[API] Response Decrypt Fail:', decodeError);
                }
            })
            .catch((e) => {
                console.error('[API] Save failed:', e);
                EVT_HUB_SAFE.emit(G_EVT.API.COLLISION_SAVE_FAIL, {
                    error: e.message,
                });
            });
    }

    // ... (loadRanking, handleLoginSuccess, resetScore 메서드는 기존과 동일하되 내부 ID 참조만 유지)
    private loadRanking(userId: string) {
        const sessionKey = this.sessionSecret;
        const sId = this.currentSessionId;

        // 세션이 없으면 일반 조회를 허용할 수도 있지만, 보안을 위해 세션 체크를 권장합니다.
        if (!sessionKey || !sId) {
            console.warn(
                '[API] No session for ranking load. Standard fetch fallback.'
            );
            // 기존 GET 방식 유지 혹은 차단
        }

        // 1. 암호화할 데이터 구성
        const rawData = { u: userId, t: Date.now() };
        const encryptedData = CryptoJS.AES.encrypt(
            JSON.stringify(rawData),
            sessionKey!
        ).toString();

        // 2. POST 방식으로 변경하여 전송 (Payload 은닉)
        fetch(`${this.SERVER_BASE_URL}/api/ranking`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                i: sId,
                data: encryptedData,
            }),
        })
            .then((res) => res.json())
            .then((data) => {
                // 서버 응답(data)도 암호화되어 온다면 여기서 복호화 로직을 추가하세요.
                // 일단은 결과만 뿌려주는 기존 로직 유지
                EVT_HUB_SAFE.emit(G_EVT.PLAY.SHOW_RESULT, {
                    mode: 'START',
                    userId: userId,
                    ranking: data.topRankings,
                });
            })
            .catch((err) => console.error('[API] Ranking load fail:', err));
    }

    private handleLoginSuccess(event: any): void {
        const d = event.data?.data || event.data;
        if (d?.userId) this.currentId = d.userId;
        if (d?.username) this.currentUsername = d.username;
    }

    public resetScore(): void {
        const userId = this.currentId || this.currentSessionId;
        const sessionKey = this.sessionSecret;
        const sId = this.currentSessionId;

        // 세션 정보가 없으면 일반적인 방식으로 보낼 수도 있지만, 보안을 위해 세션 필수 처리
        if (!userId || !sessionKey || !sId) {
            console.error('[API] Cannot reset score: Missing session info.');
            return;
        }

        // 전송할 데이터 구성
        const rawData = { u: userId, t: Date.now() };

        // 🔥 AES 암호화
        const encryptedData = CryptoJS.AES.encrypt(
            JSON.stringify(rawData),
            sessionKey
        ).toString();

        fetch(`${this.SERVER_BASE_URL}/api/reset-score`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                i: sId, // 서버가 세션을 찾기 위한 ID
                data: encryptedData, // 암호화된 본문
            }),
        })
            .then((res) => res.json())
            .then((data) => {
                EVT_HUB_SAFE.emit(
                    data.success
                        ? G_EVT.DATA.SCORE_RESET_SUCCESS
                        : G_EVT.DATA.SCORE_RESET_FAIL,
                    data.success
                );
            })
            .catch((err) => console.error('[API] Reset Score Fail:', err));
    }
    // ApiConnector.ts
    public async resetScoreAsync(): Promise<boolean> {
        const sId = this.currentSessionId;
        const key = this.sessionSecret;
        if (!sId || !key) return false;

        const rawData = { u: this.currentId, t: Date.now() };
        const encryptedData = CryptoJS.AES.encrypt(
            JSON.stringify(rawData),
            key
        ).toString();

        try {
            const res = await fetch(`${this.SERVER_BASE_URL}/api/reset-score`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ i: sId, data: encryptedData }),
            });
            const data = await res.json();
            return data.success;
        } catch (err) {
            return false;
        }
    }
    // ApiConnector 클래스 내부에 추가
    public updateRankingName(username: string): void {
        const userId = this.currentId || this.currentSessionId;
        const sessionKey = this.sessionSecret;
        const sId = this.currentSessionId;

        // 세션 정보가 없으면 서버가 403을 응답하므로 미리 체크
        if (!userId || !sessionKey || !sId) {
            console.error('[API] 세션 정보가 없어 이름을 수정할 수 없습니다.');
            return;
        }

        // 로컬 변수도 동기화
        this.currentUsername = username;

        // 1. 보낼 데이터 구성 (u: 유저ID, n: 닉네임)
        const rawData = { u: userId, n: username, t: Date.now() };

        // 2. 🔥 암호화 (서버가 해독할 수 있도록 AES 사용)
        const encryptedData = CryptoJS.AES.encrypt(
            JSON.stringify(rawData),
            sessionKey
        ).toString();

        // 3. 서버 전송 (POST /api/ranking)
        fetch(`${this.SERVER_BASE_URL}/api/ranking`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                i: sId,
                data: encryptedData,
            }),
        })
            .then((res) => res.json())
            .then((data) => {
                console.log('✅ 서버 이름 업데이트 완료:', username);
            })
            .catch((err) => console.error('❌ 서버 이름 업데이트 실패:', err));
    }
    public async refundGiftItem(): Promise<boolean> {
        const sId = this.currentSessionId;
        const key = this.sessionSecret;
        if (!sId || !key) return false;

        try {
            const rawData = { t: Date.now(), u: this.currentId };
            const encryptedData = CryptoJS.AES.encrypt(
                JSON.stringify(rawData),
                key
            ).toString();

            const response = await fetch(
                `${this.SERVER_BASE_URL}/api/refund-item`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ i: sId, data: encryptedData }),
                }
            );

            const result = await response.json();
            return result.success;
        } catch (e) {
            return false;
        }
    }
    // ApiConnector 클래스 내부에 추가
    public async getRankingData(userId: string): Promise<any> {
        const sessionKey = this.sessionSecret;
        const sId = this.currentSessionId;

        if (!sessionKey || !sId) {
            throw new Error('세션 정보가 없습니다. 다시 시작해주세요.');
        }

        const rawData = { u: userId, t: Date.now() };
        const encryptedData = CryptoJS.AES.encrypt(
            JSON.stringify(rawData),
            sessionKey
        ).toString();

        const response = await fetch(`${this.SERVER_BASE_URL}/api/ranking`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ i: sId, data: encryptedData }),
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const serverRes = await response.json();

        // 🔥 서버 응답 'd' 복호화
        const bytes = CryptoJS.AES.decrypt(serverRes.d, sessionKey);
        const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

        return decryptedData; // { topRankings, myRanking } 반환
    }
    // ApiConnector.ts 내부에 추가
    public async useGiftItem(): Promise<boolean> {
        const sId = this.currentSessionId;
        const key = this.sessionSecret;

        if (!sId || !key) return false;

        try {
            // 1. 데이터 암호화 (u: userId 포함)
            const rawData = {
                t: Date.now(),
                u: this.currentId || localStorage.getItem('guest_user_id'),
            };
            const encryptedData = CryptoJS.AES.encrypt(
                JSON.stringify(rawData),
                key
            ).toString();

            // 2. 서버 전송 (서버 컨트롤러의 키값 'i'에 맞춤)
            const response = await fetch(
                `${this.SERVER_BASE_URL}/api/use-item`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        i: sId, // 👈 i로 전달
                        data: encryptedData,
                    }),
                }
            );

            if (response.status === 503) {
                alert('대회가 종료되어 아이템을 사용할 수 없습니다.');
                return false;
            }

            const result = await response.json();
            return result.success;
        } catch (e) {
            console.error('아이템 사용 실패:', e);
            return false;
        }
    }
    // ApiConnector.ts
    public async requestItemReward(): Promise<boolean> {
        const sId = this.currentSessionId;
        if (!sId) return false;

        try {
            const rawData = { t: Date.now(), u: this.currentId };
            const encryptedData = CryptoJS.AES.encrypt(
                JSON.stringify(rawData),
                this.sessionSecret
            ).toString();

            const response = await fetch(
                `${this.SERVER_BASE_URL}/api/item-reward`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ i: sId, data: encryptedData }),
                }
            );

            const result = await response.json();
            return result.success;
        } catch (e) {
            return false;
        }
    }
}
export const API_CONNECTOR = ApiConnector.getInstance();
