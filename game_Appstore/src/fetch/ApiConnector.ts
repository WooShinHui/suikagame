// src/fetch/ApiConnector.ts
import { EVT_HUB_SAFE } from '../events/SafeEventHub';
import { G_EVT } from '../events/EVT_HUB';
import CryptoJS from 'crypto-js';
import {
    // ✅ bestScoresRef 추가 필요 (firebaseConfig.ts에서 export)
    db,
    sessionsRef,
    scoresRef,
    bestScoresRef, // ← firebaseConfig에 추가해야 함 (아래 주석 참고)
    doc,
    setDoc,
    getDoc,
    getDocs,
    deleteDoc,
    query,
    orderBy,
    limit,
    where,
    serverTimestamp,
    startAfter, // ← firebaseConfig에서 re-export 또는 아래처럼 직접 import
} from '../firebase/firebaseConfig';

// ✅ getCountFromServer는 firebase/firestore에서 직접 import
import { getCountFromServer } from 'firebase/firestore';

// ─────────────────────────────────────────────
// firebaseConfig.ts 에 아래 두 줄 추가 필요:
//
//   export const bestScoresRef = collection(db, 'bestScores');
//   export { startAfter } from 'firebase/firestore';
// ─────────────────────────────────────────────

interface RankingEntry {
    rank: number;
    username: string;
    total_score: number;
    userId: string;
    countryCode?: string;
}

interface PaginatedRankings {
    rankings: RankingEntry[];
    lastDoc: any | null; // Firestore DocumentSnapshot (커서)
}

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

    public refreshSession() {
        console.log('[Firebase] refreshSession 호출');
    }

    // ─────────────────────────────────────────────
    // 유저 세션 초기화
    // ─────────────────────────────────────────────

    public async setCrazyGamesUser(userInfo: {
        userId: string;
        username: string;
        countryCode: string;
        profilePicture: string | null;
    }) {
        console.log('🔹 setCrazyGamesUser 호출:', userInfo);

        if (!userInfo.userId || userInfo.userId === 'undefined') {
            console.error('❌ userId가 없습니다!', userInfo);
            throw new Error('Invalid userId: ' + userInfo.userId);
        }

        this.currentId = userInfo.userId;
        this.currentUsername = userInfo.username || 'Guest';
        this.currentCountryCode = userInfo.countryCode || 'XX';

        await this.initFirebaseSession(userInfo);
    }

    private async initFirebaseSession(userInfo: {
        userId: string;
        username: string;
        countryCode: string;
    }) {
        try {
            if (!userInfo.userId) throw new Error('userId is required');

            this.currentSessionId = `${userInfo.userId}_${Date.now()}`;
            this.sessionSecret = CryptoJS.SHA256(
                `${this.currentSessionId}_${Date.now()}_${Math.random()}`
            ).toString();

            await setDoc(doc(sessionsRef, this.currentSessionId), {
                userId: userInfo.userId,
                username: userInfo.username || 'Guest',
                countryCode: userInfo.countryCode || 'XX',
                sessionSecret: this.sessionSecret,
                createdAt: serverTimestamp(),
                itemCount: 1,
            });

            console.log('✅ Firebase 세션 생성 완료:', this.currentSessionId);

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

    // ─────────────────────────────────────────────
    // 점수 저장 (핵심 개선)
    //
    // 변경 전: getTopRankings(500) → 500 reads
    // 변경 후: getDoc(bestScores/{userId}) → 1 read
    // ─────────────────────────────────────────────

    public async sendFinalScore(
        finalScore: number,
        userId: string,
        username: string | null,
        gameSessionId?: string
    ) {
        console.log('📤 sendFinalScore 호출');

        try {
            const effectiveUserId = userId || this.currentId || 'guest';
            const sId = gameSessionId || this.currentSessionId;

            if (!sId) {
                console.error('❌ 세션 ID 없음!');
                alert('세션이 초기화되지 않았습니다. 페이지를 새로고침하세요.');
                return;
            }

            const sessionDoc = await getDoc(doc(sessionsRef, sId));
            if (!sessionDoc.exists()) {
                console.error('❌ 유효하지 않은 세션:', sId);
                alert('세션이 만료되었습니다. 페이지를 새로고침하세요.');
                return;
            }

            // ✅ 이전 최고점 조회: bestScores/{userId} 단 1 read
            let previousHighScore = 0;
            try {
                const bestScoreDoc = await getDoc(
                    doc(bestScoresRef, effectiveUserId)
                );
                if (bestScoreDoc.exists()) {
                    previousHighScore = bestScoreDoc.data().score as number;
                }
            } catch (readError) {
                // ✅ read 실패해도 진행. 단, 신기록 판정을 보수적으로 처리
                console.warn(
                    '⚠️ bestScores read 실패, previousHighScore=0으로 fallback:',
                    readError
                );
            }
            console.log(
                `📊 이전 최고: ${previousHighScore}, 현재: ${finalScore}`
            );

            const isNewRecord = finalScore > previousHighScore;

            if (isNewRecord) {
                const scoreId = `${effectiveUserId}_${Date.now()}`;

                // ✅ 두 컬렉션에 병렬 write (read보다 훨씬 저렴)
                await Promise.all([
                    // 1) 원본 로그 (기존 유지)
                    setDoc(doc(scoresRef, scoreId), {
                        userId: effectiveUserId,
                        username: username || this.currentUsername || 'Guest',
                        countryCode: this.currentCountryCode || 'XX',
                        score: finalScore,
                        sessionId: sId,
                        timestamp: serverTimestamp(),
                    }),
                    // 2) ✅ 유저당 1개 최고점 문서 (새 컬렉션)
                    setDoc(doc(bestScoresRef, effectiveUserId), {
                        userId: effectiveUserId,
                        username: username || this.currentUsername || 'Guest',
                        countryCode: this.currentCountryCode || 'XX',
                        score: finalScore,
                        updatedAt: serverTimestamp(),
                    }),
                ]);

                console.log(
                    `🏆 신기록! ${finalScore} (이전: ${previousHighScore})`
                );
            } else {
                console.log(
                    `📉 ${finalScore} < 최고점 ${previousHighScore}, 저장 안 함`
                );
            }

            EVT_HUB_SAFE.emit(G_EVT.PLAY.SHOW_RESULT, {
                mode: 'GAME_OVER',
                userId: effectiveUserId,
                finalScore,
                previousHighScore: Math.max(finalScore, previousHighScore),
                isNewRecord,
            });
        } catch (error: any) {
            console.error('❌ Firebase 점수 저장 실패:', error);
            alert(`점수 저장 실패: ${error.message}`);
        }
    }

    // ─────────────────────────────────────────────
    // 랭킹 조회 (getRankingData)
    //
    // 변경 전: 최대 1,500 reads
    // 변경 후: 22~23 reads (top20=20, myDoc=1, count=1~2)
    // ─────────────────────────────────────────────

    public async getRankingData(userId: string): Promise<{
        topRankings: RankingEntry[];
        myRanking: RankingEntry | null;
    }> {
        try {
            // ✅ TOP 20 + 내 순위 병렬 조회
            const [{ rankings: topRankings }, myRanking] = await Promise.all([
                this.getTopBestScores(20),
                userId && userId !== 'guest'
                    ? this.getMyRanking(userId)
                    : Promise.resolve(null),
            ]);

            // TOP 20 rank 번호 부여
            topRankings.forEach((r, i) => (r.rank = i + 1));

            return { topRankings, myRanking };
        } catch (error) {
            console.error('[Firebase] 랭킹 조회 실패:', error);
            throw error;
        }
    }

    // ─────────────────────────────────────────────
    // TOP N 조회 with 페이지네이션 커서
    //
    // bestScores 컬렉션: 유저당 1개 문서
    // 20명 조회 = 정확히 20 reads
    // ─────────────────────────────────────────────

    public async getTopBestScores(
        pageSize: number = 20,
        lastDoc: any = null, // Firestore DocumentSnapshot 커서
        rankOffset: number = 0
    ): Promise<PaginatedRankings> {
        try {
            const q = lastDoc
                ? query(
                      bestScoresRef,
                      orderBy('score', 'desc'),
                      startAfter(lastDoc),
                      limit(pageSize)
                  )
                : query(
                      bestScoresRef,
                      orderBy('score', 'desc'),
                      limit(pageSize)
                  );

            const snapshot = await getDocs(q);
            console.log(
                `📊 bestScores 읽기: ${snapshot.docs.length}개 (offset: ${rankOffset})`
            );

            const rankings: RankingEntry[] = snapshot.docs.map((d, i) => ({
                rank: rankOffset + i + 1,
                userId: d.data().userId,
                username: d.data().username,
                total_score: d.data().score,
                countryCode: d.data().countryCode,
            }));

            // 다음 페이지 커서 (더 이상 없으면 null)
            const newLastDoc =
                snapshot.docs.length === pageSize
                    ? snapshot.docs[snapshot.docs.length - 1]
                    : null;

            return { rankings, lastDoc: newLastDoc };
        } catch (error) {
            console.error('[Firebase] TOP bestScores 조회 실패:', error);
            return { rankings: [], lastDoc: null };
        }
    }

    // ─────────────────────────────────────────────
    // 내 순위 조회
    //
    // 1 read (내 문서) + 1 count read (내 점수보다 높은 사람 수)
    // ─────────────────────────────────────────────

    public async getMyRanking(userId: string): Promise<RankingEntry | null> {
        try {
            const myDoc = await getDoc(doc(bestScoresRef, userId));
            if (!myDoc.exists()) return null;

            const myScore = myDoc.data().score as number;

            // ✅ count() 집계 쿼리: 내 점수보다 높은 사람 수 (1 read)
            const higherQuery = query(
                bestScoresRef,
                where('score', '>', myScore)
            );
            const countSnapshot = await getCountFromServer(higherQuery);
            const myRank = countSnapshot.data().count + 1;

            return {
                rank: myRank,
                userId,
                username: myDoc.data().username,
                total_score: myScore,
                countryCode: myDoc.data().countryCode,
            };
        } catch (error) {
            console.error('[Firebase] 내 순위 조회 실패:', error);
            return null;
        }
    }

    // ─────────────────────────────────────────────
    // 내 주변 ±5위 조회
    //
    // score 범위 쿼리 사용 → 정확히 11 reads (앞5 + 나포함뒤6)
    // 커서 방식 대비 훨씬 효율적
    // ─────────────────────────────────────────────

    public async getNearbyBestRankings(
        myRank: number,
        myScore: number
    ): Promise<RankingEntry[]> {
        try {
            // 내 점수보다 높은 5명 (asc 정렬 → 역순으로 높은 순 만들기)
            const aboveQuery = query(
                bestScoresRef,
                where('score', '>', myScore),
                orderBy('score', 'asc'),
                limit(5)
            );

            // 나 포함 내 점수 이하 6명 (desc 정렬)
            const belowQuery = query(
                bestScoresRef,
                where('score', '<=', myScore),
                orderBy('score', 'desc'),
                limit(6)
            );

            const [aboveSnap, belowSnap] = await Promise.all([
                getDocs(aboveQuery),
                getDocs(belowQuery),
            ]);

            // aboveSnap은 asc 정렬이므로 reverse → 내 위쪽을 높은 점수 순으로
            const aboveDocs = [...aboveSnap.docs].reverse();
            const belowDocs = belowSnap.docs;

            const allDocs = [...aboveDocs, ...belowDocs];
            const startRank = myRank - aboveDocs.length;

            const result: RankingEntry[] = allDocs.map((d, i) => ({
                rank: startRank + i,
                userId: d.data().userId,
                username: d.data().username,
                total_score: d.data().score,
                countryCode: d.data().countryCode,
            }));

            console.log(
                `👥 내 주변 ${result.length}명 (${result[0]?.rank}위 ~ ${
                    result[result.length - 1]?.rank
                }위)`
            );
            return result;
        } catch (error) {
            console.error('[Firebase] 내 주변 순위 조회 실패:', error);
            return [];
        }
    }

    // ─────────────────────────────────────────────
    // 아이템 관련
    // ─────────────────────────────────────────────

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

    public async refundGiftItem(): Promise<boolean> {
        try {
            if (!this.currentSessionId) return false;
            const sessionDocRef = doc(sessionsRef, this.currentSessionId);
            const sessionDoc = await getDoc(sessionDocRef);
            if (!sessionDoc.exists()) return false;

            await setDoc(sessionDocRef, {
                ...sessionDoc.data(),
                itemCount: (sessionDoc.data().itemCount || 0) + 1,
            });
            return true;
        } catch (error) {
            console.error('[Firebase] 아이템 환불 실패:', error);
            return false;
        }
    }

    public async requestItemReward(): Promise<boolean> {
        try {
            if (!this.currentSessionId) return false;
            const sessionDocRef = doc(sessionsRef, this.currentSessionId);
            const sessionDoc = await getDoc(sessionDocRef);
            if (!sessionDoc.exists()) return false;

            await setDoc(sessionDocRef, {
                ...sessionDoc.data(),
                itemCount: (sessionDoc.data().itemCount || 0) + 1,
            });
            return true;
        } catch (error) {
            console.error('[Firebase] 아이템 보상 실패:', error);
            return false;
        }
    }

    public async getItemCount(): Promise<number | null> {
        try {
            if (!this.currentSessionId) return null;
            const sessionDoc = await getDoc(
                doc(sessionsRef, this.currentSessionId)
            );
            if (!sessionDoc.exists()) return null;
            return sessionDoc.data().itemCount || 0;
        } catch (error) {
            console.error('[Firebase] 아이템 개수 조회 실패:', error);
            return null;
        }
    }

    // ─────────────────────────────────────────────
    // 점수 초기화 (scores + bestScores 모두)
    // ─────────────────────────────────────────────

    public async resetScoreAsync(): Promise<boolean> {
        try {
            if (!this.currentId) return false;

            const userScoresQuery = query(
                scoresRef,
                where('userId', '==', this.currentId)
            );
            const snapshot = await getDocs(userScoresQuery);
            const deletePromises = snapshot.docs.map((d) => deleteDoc(d.ref));

            // ✅ bestScores 문서도 삭제
            deletePromises.push(deleteDoc(doc(bestScoresRef, this.currentId)));

            await Promise.all(deletePromises);
            console.log('✅ 점수 초기화 완료 (scores + bestScores)');
            return true;
        } catch (error) {
            console.error('[Firebase] 점수 초기화 실패:', error);
            return false;
        }
    }

    // ─────────────────────────────────────────────
    // 이벤트 리스너
    // ─────────────────────────────────────────────

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
                userId,
                ranking: data.topRankings,
            });
        } catch (error) {
            console.error('[Firebase] 랭킹 로드 실패:', error);
        }
    }
}

export const API_CONNECTOR = ApiConnector.getInstance();

// ═══════════════════════════════════════════════════════════════
// 제거된 함수 목록 (사용처 없음, 기능 대체됨)
// ───────────────────────────────────────────────────────────────
// ❌ getUserHighScore(userId)       → bestScores 직접 read로 대체
// ❌ getHigherScoresCount(myScore) → getCountFromServer()로 대체
// ❌ getAllRankings()               → getNearbyBestRankings()로 대체
// ❌ getTopRankings(limitCount)    → getTopBestScores()로 대체
// ═══════════════════════════════════════════════════════════════
