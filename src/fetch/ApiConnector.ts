import { EVT_HUB_SAFE } from '../events/SafeEventHub';
import { G_EVT } from '../events/EVT_HUB';
import CryptoJS from 'crypto-js';
import {
    db,
    sessionsRef,
    scoresRef,
    doc,
    setDoc,
    getDoc,
    getDocs,
    query,
    orderBy,
    limit,
    where,
    serverTimestamp,
} from '../firebase/firebaseConfig';

export class ApiConnector {
    private static instance: ApiConnector | null = null;

    private currentId: string | null = null;
    public currentSessionId: string | null = null;
    private currentUsername: string | null = null;
    private currentCountryCode: string | null = null;
    private sessionSecret: string | null = null;

    private constructor() {
        this.initEventListeners();
    }

    public static getInstance(): ApiConnector {
        if (!ApiConnector.instance) {
            ApiConnector.instance = new ApiConnector();
        }
        return ApiConnector.instance;
    }

    // ✅ CrazyGames 사용자 정보 설정
    public async setCrazyGamesUser(userInfo: {
        userId: string;
        username: string;
        countryCode: string;
        profilePicture: string | null;
    }) {
        this.currentId = userInfo.userId;
        this.currentUsername = userInfo.username;
        this.currentCountryCode = userInfo.countryCode;

        await this.initFirebaseSession(userInfo);
    }

    // ✅ Firebase 세션 생성
    private async initFirebaseSession(userInfo: {
        userId: string;
        username: string;
        countryCode: string;
    }) {
        try {
            // 1. 세션 ID 생성 (고유값)
            this.currentSessionId = `${userInfo.userId}_${Date.now()}`;

            // 2. 세션 비밀키 생성 (클라이언트 해시)
            this.sessionSecret = CryptoJS.SHA256(
                `${this.currentSessionId}_${Date.now()}_${Math.random()}`
            ).toString();

            // 3. Firestore에 세션 저장
            await setDoc(doc(sessionsRef, this.currentSessionId), {
                userId: userInfo.userId,
                username: userInfo.username,
                countryCode: userInfo.countryCode,
                sessionSecret: this.sessionSecret,
                createdAt: serverTimestamp(),
                itemCount: 1, // 기본 아이템 1개
            });

            console.log('✅ Firebase 세션 생성 완료:', this.currentSessionId);

            // 4. 이벤트 발행
            EVT_HUB_SAFE.emit(G_EVT.PLAY.SESSION_STARTED, {
                gameSessionId: this.currentSessionId,
                userId: userInfo.userId,
                username: userInfo.username,
                countryCode: userInfo.countryCode,
                itemCount: 1,
                isServerVerified: true,
            });
        } catch (error) {
            console.error('❌ Firebase 세션 생성 실패:', error);
        }
    }

    // ✅ 점수 저장 (Firestore)
    public async sendFinalScore(
        finalScore: number,
        userId: string,
        username: string | null,
        gameSessionId?: string
    ) {
        try {
            const sId = gameSessionId || this.currentSessionId;

            if (!sId) {
                console.error('[Firebase] 세션 ID 없음');
                return;
            }

            // 1. 세션 검증 (선택사항)
            const sessionDoc = await getDoc(doc(sessionsRef, sId));
            if (!sessionDoc.exists()) {
                console.error('[Firebase] 유효하지 않은 세션');
                return;
            }

            // 2. 점수 저장
            const scoreId = `${userId}_${Date.now()}`;
            await setDoc(doc(scoresRef, scoreId), {
                userId: userId,
                username: username || this.currentUsername || 'Guest',
                countryCode: this.currentCountryCode || 'XX',
                score: finalScore,
                sessionId: sId,
                timestamp: serverTimestamp(),
            });

            console.log('✅ 점수 저장 완료:', finalScore);

            // 3. 이전 최고 점수 조회
            const previousHighScore = await this.getUserHighScore(userId);

            // 4. 결과 표시 이벤트 발행
            EVT_HUB_SAFE.emit(G_EVT.PLAY.SHOW_RESULT, {
                mode: 'GAME_OVER',
                userId: userId,
                finalScore: finalScore,
                previousHighScore: previousHighScore,
            });
        } catch (error) {
            console.error('[Firebase] 점수 저장 실패:', error);
            alert('점수 저장에 실패했습니다. 다시 시도해주세요.');
        }
    }

    // ✅ 사용자 최고 점수 조회
    private async getUserHighScore(userId: string): Promise<number> {
        try {
            const q = query(
                scoresRef,
                where('userId', '==', userId),
                orderBy('score', 'desc'),
                limit(1)
            );

            const snapshot = await getDocs(q);

            if (snapshot.empty) return 0;

            const highScore = snapshot.docs[0].data().score;
            return highScore;
        } catch (error) {
            console.error('[Firebase] 최고 점수 조회 실패:', error);
            return 0;
        }
    }

    // ✅ 전체 랭킹 조회
    public async getRankingData(userId: string): Promise<any> {
        try {
            // 1. 전체 TOP 100 조회 (사용자별 최고 점수)
            const topRankings = await this.getTopRankings(100);

            // 2. 내 랭킹 찾기
            const myRanking = topRankings.find(
                (entry) => entry.userId === userId
            );

            return {
                topRankings,
                myRanking: myRanking || null,
            };
        } catch (error) {
            console.error('[Firebase] 랭킹 조회 실패:', error);
            throw error;
        }
    }

    // ✅ TOP N 랭킹 조회 (사용자별 최고 점수)
    private async getTopRankings(limitCount: number = 100): Promise<any[]> {
        try {
            // 모든 점수 가져오기 (Firestore는 GROUP BY 미지원)
            const allScoresQuery = query(
                scoresRef,
                orderBy('timestamp', 'desc')
            );

            const snapshot = await getDocs(allScoresQuery);

            // 사용자별 최고 점수 계산 (클라이언트에서)
            const userMaxScores = new Map<string, any>();

            snapshot.forEach((doc) => {
                const data = doc.data();
                const userId = data.userId;
                const score = data.score;

                if (
                    !userMaxScores.has(userId) ||
                    userMaxScores.get(userId).score < score
                ) {
                    userMaxScores.set(userId, {
                        userId: data.userId,
                        username: data.username,
                        total_score: score,
                        countryCode: data.countryCode,
                    });
                }
            });

            // 배열로 변환 및 정렬
            const rankings = Array.from(userMaxScores.values())
                .sort((a, b) => b.total_score - a.total_score)
                .slice(0, limitCount)
                .map((entry, index) => ({
                    rank: index + 1,
                    ...entry,
                }));

            return rankings;
        } catch (error) {
            console.error('[Firebase] TOP 랭킹 조회 실패:', error);
            return [];
        }
    }

    // ✅ 아이템 사용
    public async useGiftItem(): Promise<boolean> {
        try {
            if (!this.currentSessionId) return false;

            const sessionDoc = await getDoc(
                doc(sessionsRef, this.currentSessionId)
            );

            if (!sessionDoc.exists()) return false;

            const itemCount = sessionDoc.data().itemCount || 0;

            if (itemCount <= 0) {
                alert('아이템이 부족합니다.');
                return false;
            }

            // 아이템 차감
            await setDoc(doc(sessionsRef, this.currentSessionId), {
                ...sessionDoc.data(),
                itemCount: itemCount - 1,
            });

            return true;
        } catch (error) {
            console.error('[Firebase] 아이템 사용 실패:', error);
            return false;
        }
    }

    // ✅ 아이템 환불
    public async refundGiftItem(): Promise<boolean> {
        try {
            if (!this.currentSessionId) return false;

            const sessionDoc = await getDoc(
                doc(sessionsRef, this.currentSessionId)
            );

            if (!sessionDoc.exists()) return false;

            const itemCount = sessionDoc.data().itemCount || 0;

            await setDoc(doc(sessionsRef, this.currentSessionId), {
                ...sessionDoc.data(),
                itemCount: itemCount + 1,
            });

            return true;
        } catch (error) {
            console.error('[Firebase] 아이템 환불 실패:', error);
            return false;
        }
    }

    // ✅ 아이템 보상
    public async requestItemReward(): Promise<boolean> {
        try {
            if (!this.currentSessionId) return false;

            const sessionDoc = await getDoc(
                doc(sessionsRef, this.currentSessionId)
            );

            if (!sessionDoc.exists()) return false;

            const itemCount = sessionDoc.data().itemCount || 0;

            await setDoc(doc(sessionsRef, this.currentSessionId), {
                ...sessionDoc.data(),
                itemCount: itemCount + 1,
            });

            return true;
        } catch (error) {
            console.error('[Firebase] 아이템 보상 실패:', error);
            return false;
        }
    }

    // ✅ 점수 초기화 (개발/테스트용)
    public async resetScoreAsync(): Promise<boolean> {
        try {
            if (!this.currentId) return false;

            // 해당 유저의 모든 점수 삭제
            const userScoresQuery = query(
                scoresRef,
                where('userId', '==', this.currentId)
            );

            const snapshot = await getDocs(userScoresQuery);

            const deletePromises = snapshot.docs.map((doc) => doc.ref.delete());

            await Promise.all(deletePromises);

            console.log('✅ 점수 초기화 완료');
            return true;
        } catch (error) {
            console.error('[Firebase] 점수 초기화 실패:', error);
            return false;
        }
    }

    // ✅ 이벤트 리스너 초기화
    private initEventListeners(): void {
        EVT_HUB_SAFE.on(
            G_EVT.PLAY.REQUEST_COLLISION_SAVE,
            this.handleCollisionSaveRequest.bind(this)
        );

        EVT_HUB_SAFE.on(G_EVT.PLAY.REQUEST_RANK_LOAD, (e) =>
            this.loadRanking(e.data.userId)
        );
    }

    private handleCollisionSaveRequest(event: any): void {
        const { finalScore, gameSessionId, username } = event.data;

        this.sendFinalScore(
            finalScore,
            this.currentId || 'guest',
            username || this.currentUsername,
            gameSessionId || this.currentSessionId
        );
    }

    private async loadRanking(userId: string) {
        try {
            const data = await this.getRankingData(userId);

            EVT_HUB_SAFE.emit(G_EVT.PLAY.SHOW_RESULT, {
                mode: 'START',
                userId: userId,
                ranking: data.topRankings,
            });
        } catch (error) {
            console.error('[Firebase] 랭킹 로드 실패:', error);
        }
    }

    // ❌ 제거: updateRankingName (Firebase는 실시간 업데이트 불필요)
    // ❌ 제거: 모든 암호화 관련 로직
    // ❌ 제거: 서버 통신 관련 fetch
}

export const API_CONNECTOR = ApiConnector.getInstance();
