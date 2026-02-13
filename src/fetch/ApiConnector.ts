// src/fetch/ApiConnector.ts
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
    deleteDoc,
    query,
    orderBy,
    limit,
    where,
    serverTimestamp,
} from '../firebase/firebaseConfig';

// ✅ 타입 정의
interface RankingEntry {
    rank: number;
    username: string;
    total_score: number;
    userId: string;
    countryCode?: string;
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
        console.log('[Firebase] refreshSession 호출 (현재는 불필요)');
    }

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
            if (!userInfo.userId) {
                throw new Error('userId is required');
            }

            this.currentSessionId = `${userInfo.userId}_${Date.now()}`;

            this.sessionSecret = CryptoJS.SHA256(
                `${this.currentSessionId}_${Date.now()}_${Math.random()}`
            ).toString();

            const sessionData = {
                userId: userInfo.userId,
                username: userInfo.username || 'Guest',
                countryCode: userInfo.countryCode || 'XX',
                sessionSecret: this.sessionSecret,
                createdAt: serverTimestamp(),
                itemCount: 1,
            };

            await setDoc(doc(sessionsRef, this.currentSessionId), sessionData);

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

    public async sendFinalScore(
        finalScore: number,
        userId: string,
        username: string | null,
        gameSessionId?: string
    ) {
        console.log('📤 sendFinalScore 호출');

        try {
            const effectiveUserId = userId || this.currentId || 'guest';
            console.log('🔑 effectiveUserId:', effectiveUserId); // ✅ 추가

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

            console.log('✅ 세션 검증 완료');

            // ✅ 1. 최고 점수 조회 (getTopRankings 재사용)
            const allRankings = await this.getTopRankings(500);

            // ✅ 디버깅 로그 추가
            console.log('📊 전체 랭킹 개수:', allRankings.length);
            console.log('📊 첫 3개 랭킹:', allRankings.slice(0, 3));
            console.log('🔍 내 userId로 검색:', effectiveUserId);

            const myData = allRankings.find((entry) => {
                console.log(
                    `   비교: "${entry.userId}" === "${effectiveUserId}" ?`,
                    entry.userId === effectiveUserId
                );
                return entry.userId === effectiveUserId;
            });

            console.log('🎯 찾은 내 데이터:', myData); // ✅ 추가

            const previousHighScore = myData ? myData.total_score : 0;

            console.log(
                `📊 이전 최고 점수: ${previousHighScore}, 현재 점수: ${finalScore}`
            );

            // ✅ 2. 현재 점수가 최고 점수보다 높을 때만 저장
            let isNewRecord = false;
            if (finalScore > previousHighScore) {
                const scoreId = `${effectiveUserId}_${Date.now()}`;
                await setDoc(doc(scoresRef, scoreId), {
                    userId: effectiveUserId,
                    username: username || this.currentUsername || 'Guest',
                    countryCode: this.currentCountryCode || 'XX',
                    score: finalScore,
                    sessionId: sId,
                    timestamp: serverTimestamp(),
                });

                console.log(
                    `🏆 신기록! Firebase 점수 저장: ${finalScore} (이전: ${previousHighScore})`
                );
                isNewRecord = true;
            } else {
                console.log(
                    `📉 점수 ${finalScore}은 최고 점수 ${previousHighScore}보다 낮아 저장 안 함`
                );
            }

            // ✅ 3. Result 화면에 최고 점수 전달
            EVT_HUB_SAFE.emit(G_EVT.PLAY.SHOW_RESULT, {
                mode: 'GAME_OVER',
                userId: effectiveUserId,
                finalScore: finalScore,
                previousHighScore: Math.max(finalScore, previousHighScore),
                isNewRecord: isNewRecord,
            });
        } catch (error) {
            console.error('❌ Firebase 점수 저장 실패:', error);
            alert(`점수 저장 실패: ${error.message}`);
        }
    }

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
    public async getRankingData(userId: string): Promise<any> {
        try {
            // ✅ 1. TOP 랭킹 조회 (이미 모든 유저의 최고 점수 계산됨)
            const topRankings = await this.getTopRankings(20);

            // ✅ 2. TOP 20에서 내 랭킹 찾기
            let myRanking = topRankings.find(
                (entry) => entry.userId === userId
            );

            // ✅ 3. TOP 20에 없으면 전체 랭킹에서 찾기
            if (!myRanking && userId && userId !== 'guest') {
                const allRankings = await this.getTopRankings(500); // 전체 조회
                myRanking = allRankings.find(
                    (entry) => entry.userId === userId
                );
            }

            return {
                topRankings,
                myRanking: myRanking || null,
            };
        } catch (error) {
            console.error('[Firebase] 랭킹 조회 실패:', error);
            throw error;
        }
    }
    private async getTopRankings(limitCount: number = 20): Promise<any[]> {
        try {
            const recentScoresQuery = query(
                scoresRef,
                orderBy('timestamp', 'desc'),
                limit(500)
            );

            const snapshot = await getDocs(recentScoresQuery);

            console.log(`📊 Firebase 읽기: ${snapshot.docs.length}개 문서`);

            const userMaxScores = new Map<string, any>();

            snapshot.forEach((docSnapshot) => {
                const data = docSnapshot.data();
                const userId = data.userId;
                const score = data.score;

                // ✅ 첫 10개 문서 로그 (디버깅용)
                if (userMaxScores.size < 10) {
                    console.log(`  문서: userId="${userId}", score=${score}`);
                }

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

            console.log(`📊 중복 제거 후 유저 수: ${userMaxScores.size}명`);

            const rankings = Array.from(userMaxScores.values())
                .sort((a, b) => b.total_score - a.total_score)
                .slice(0, limitCount)
                .map((entry, index) => ({
                    rank: index + 1,
                    ...entry,
                }));

            console.log(`📊 최종 반환 랭킹: ${rankings.length}명`);

            return rankings;
        } catch (error) {
            console.error('[Firebase] TOP 랭킹 조회 실패:', error);
            return [];
        }
    }

    // ✅ 전체 순위 조회 (500개 전부 반환)
    public async getAllRankings(): Promise<RankingEntry[]> {
        try {
            const recentScoresQuery = query(
                scoresRef,
                orderBy('timestamp', 'desc'),
                limit(500)
            );

            const snapshot = await getDocs(recentScoresQuery);

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

            const rankings = Array.from(userMaxScores.values())
                .sort((a, b) => b.total_score - a.total_score)
                .map((entry, index) => ({
                    rank: index + 1,
                    ...entry,
                }));

            console.log(`📊 전체 순위 반환: ${rankings.length}명`);
            return rankings;
        } catch (error) {
            console.error('[Firebase] 전체 순위 조회 실패:', error);
            return [];
        }
    }
    private async getHigherScoresCount(myScore: number): Promise<number> {
        try {
            const higherScoresQuery = query(
                scoresRef,
                orderBy('score', 'desc'),
                limit(500)
            );

            const snapshot = await getDocs(higherScoresQuery);

            const userMaxScores = new Map<string, number>();
            snapshot.forEach((docSnapshot) => {
                const data = docSnapshot.data();
                const userId = data.userId;
                const score = data.score;

                if (
                    !userMaxScores.has(userId) ||
                    userMaxScores.get(userId)! < score
                ) {
                    userMaxScores.set(userId, score);
                }
            });

            let higherCount = 0;
            userMaxScores.forEach((score) => {
                if (score > myScore) higherCount++;
            });

            return higherCount;
        } catch (error) {
            console.error('[Firebase] 순위 계산 실패:', error);
            return 0;
        }
    }

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

    public async resetScoreAsync(): Promise<boolean> {
        try {
            if (!this.currentId) return false;

            const userScoresQuery = query(
                scoresRef,
                where('userId', '==', this.currentId)
            );

            const snapshot = await getDocs(userScoresQuery);

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
