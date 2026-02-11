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
    deleteDoc, // ✅ 추가
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

    // ✅ 호환성 메서드 (PLAY.ts에서 호출)
    public refreshSession() {
        console.log('[Firebase] refreshSession 호출 (현재는 불필요)');
        // Firebase는 세션 갱신 불필요
    }

    // ✅ CrazyGames 사용자 정보 설정
    public async setCrazyGamesUser(userInfo: {
        userId: string;
        username: string;
        countryCode: string;
        profilePicture: string | null;
    }) {
        console.log('🔹 setCrazyGamesUser 호출:', userInfo);
        console.log('  - userId:', userInfo.userId);
        console.log('  - username:', userInfo.username);
        console.log('  - countryCode:', userInfo.countryCode);

        // ✅ undefined/null 체크
        if (!userInfo.userId || userInfo.userId === 'undefined') {
            console.error('❌ userId가 없습니다!', userInfo);
            throw new Error('Invalid userId: ' + userInfo.userId);
        }

        this.currentId = userInfo.userId;
        this.currentUsername = userInfo.username || 'Guest';
        this.currentCountryCode = userInfo.countryCode || 'XX';

        await this.initFirebaseSession(userInfo);
    }

    // ✅ Firebase 세션 생성
    private async initFirebaseSession(userInfo: {
        userId: string;
        username: string;
        countryCode: string;
    }) {
        try {
            // ✅ userId 검증
            if (!userInfo.userId) {
                throw new Error('userId is required');
            }

            // 1. 세션 ID 생성 (고유값)
            this.currentSessionId = `${userInfo.userId}_${Date.now()}`;

            // 2. 세션 비밀키 생성 (클라이언트 해시)
            this.sessionSecret = CryptoJS.SHA256(
                `${this.currentSessionId}_${Date.now()}_${Math.random()}`
            ).toString();

            // 3. Firestore에 세션 저장
            const sessionData = {
                userId: userInfo.userId,
                username: userInfo.username || 'Guest',
                countryCode: userInfo.countryCode || 'XX',
                sessionSecret: this.sessionSecret,
                createdAt: serverTimestamp(),
                itemCount: 1, // 기본 아이템 1개
            };

            console.log('🔹 세션 데이터:', sessionData);

            await setDoc(doc(sessionsRef, this.currentSessionId), sessionData);

            console.log('✅ Firebase 세션 생성 완료:', this.currentSessionId);

            // 4. 이벤트 발행
            EVT_HUB_SAFE.emit(G_EVT.PLAY.SESSION_STARTED, {
                gameSessionId: this.currentSessionId,
                userId: userInfo.userId,
                username: userInfo.username || 'Guest',
                countryCode: userInfo.countryCode || 'XX',
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
        console.log('📤 sendFinalScore 호출');
        console.log('  - finalScore:', finalScore);
        console.log('  - userId:', userId);
        console.log('  - username:', username);
        console.log('  - gameSessionId:', gameSessionId);
        console.log('  - currentId:', this.currentId);
        console.log('  - currentSessionId:', this.currentSessionId);

        try {
            const effectiveUserId = userId || this.currentId || 'guest';
            const sId = gameSessionId || this.currentSessionId;

            console.log('  → effectiveUserId:', effectiveUserId);
            console.log('  → sessionId:', sId);

            if (!sId) {
                console.error('❌ 세션 ID 없음!');
                alert('세션이 초기화되지 않았습니다. 페이지를 새로고침하세요.');
                return;
            }

            // 1. 세션 검증
            const sessionDoc = await getDoc(doc(sessionsRef, sId));
            if (!sessionDoc.exists()) {
                console.error('❌ 유효하지 않은 세션:', sId);
                alert('세션이 만료되었습니다. 페이지를 새로고침하세요.');
                return;
            }

            console.log('✅ 세션 검증 완료');

            // 2. 점수 저장
            const scoreId = `${effectiveUserId}_${Date.now()}`;
            await setDoc(doc(scoresRef, scoreId), {
                userId: effectiveUserId,
                username: username || this.currentUsername || 'Guest',
                countryCode: this.currentCountryCode || 'XX',
                score: finalScore,
                sessionId: sId,
                timestamp: serverTimestamp(),
            });

            console.log('✅ Firebase 점수 저장 완료:', finalScore);

            // 3. 이전 최고 점수 조회
            const previousHighScore = await this.getUserHighScore(
                effectiveUserId
            );
            console.log('📊 이전 최고 점수:', previousHighScore);

            // 4. 결과 표시 이벤트 발행
            console.log('📤 SHOW_RESULT 이벤트 발행');
            EVT_HUB_SAFE.emit(G_EVT.PLAY.SHOW_RESULT, {
                mode: 'GAME_OVER',
                userId: effectiveUserId,
                finalScore: finalScore,
                previousHighScore: previousHighScore,
            });
            console.log('✅ SHOW_RESULT 이벤트 발행 완료');
        } catch (error) {
            console.error('❌ Firebase 점수 저장 실패:', error);
            alert(`점수 저장 실패: ${error.message}`);
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

            snapshot.forEach((docSnapshot) => {
                const data = docSnapshot.data();
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

            const sessionDocRef = doc(sessionsRef, this.currentSessionId);
            const sessionDoc = await getDoc(sessionDocRef);

            if (!sessionDoc.exists()) return false;

            const itemCount = sessionDoc.data().itemCount || 0;

            if (itemCount <= 0) {
                alert('아이템이 부족합니다.');
                return false;
            }

            // 아이템 차감
            await setDoc(sessionDocRef, {
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

            const sessionDocRef = doc(sessionsRef, this.currentSessionId);
            const sessionDoc = await getDoc(sessionDocRef);

            if (!sessionDoc.exists()) return false;

            const itemCount = sessionDoc.data().itemCount || 0;

            await setDoc(sessionDocRef, {
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

            const sessionDocRef = doc(sessionsRef, this.currentSessionId);
            const sessionDoc = await getDoc(sessionDocRef);

            if (!sessionDoc.exists()) return false;

            const itemCount = sessionDoc.data().itemCount || 0;

            await setDoc(sessionDocRef, {
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

            // ✅ deleteDoc 사용
            const deletePromises = snapshot.docs.map((docSnapshot) =>
                deleteDoc(docSnapshot.ref)
            );

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
    public async getItemCount(): Promise<number | null> {
        try {
            if (!this.currentSessionId) return null;

            const sessionDocRef = doc(sessionsRef, this.currentSessionId);
            const sessionDoc = await getDoc(sessionDocRef);

            if (!sessionDoc.exists()) return null;

            const itemCount = sessionDoc.data().itemCount || 0;
            return itemCount;
        } catch (error) {
            console.error('[Firebase] 아이템 개수 조회 실패:', error);
            return null;
        }
    }
}

export const API_CONNECTOR = ApiConnector.getInstance();
