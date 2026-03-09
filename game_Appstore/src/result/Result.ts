// src/result/Result.ts
import { EVT_HUB_SAFE } from '../events/SafeEventHub';
import { G_EVT } from '../events/EVT_HUB';
import { API_CONNECTOR } from '../fetch/ApiConnector';

interface RankingEntry {
    rank: number;
    username: string;
    total_score: number;
    userId: string;
    countryCode?: string;
}

export class Result {
    private resultCt: HTMLDivElement;
    private currentUserId: string | null = null;
    private currentUsername: string | null = null;
    private finalScore: number = 0;
    private previousHighScore: number = 0;
    private isShowing: boolean = false;

    private paginationCursor: any = null;
    private paginationOffset: number = 0;

    private _onSessionStarted: any;
    private _onGameOver: any;
    private _onShowResult: any;
    private _onScoreUpdated: any;
    private _onResize: any;

    constructor() {
        const canvas = document.querySelector('canvas') as HTMLCanvasElement;
        const parent = canvas?.parentElement || document.body;

        this.resultCt = document.createElement('div');
        this.resultCt.id = 'result-container';
        Object.assign(this.resultCt.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            // 게임 배경과 어울리는 하늘색 반투명 오버레이
            background: 'rgba(27, 27, 27, 0.82)',
            color: '#5a3000',
            display: 'none',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '0',
            zIndex: '1001',
            fontFamily: '"SchoolSafeDungGeunMiSo", "Montserrat", sans-serif',
            boxSizing: 'border-box',
            textAlign: 'center',
            opacity: '0',
            transition: 'opacity 0.25s ease',
        });
        parent.appendChild(this.resultCt);

        this._onSessionStarted = (e: any) => this.handleSessionStarted(e);
        this._onGameOver = (e: any) => this.handleGameOver(e);
        this._onShowResult = (e: any) => this.showResult(e, e.data.mode);
        this._onScoreUpdated = (e: any) => this.handleScoreUpdated(e);
        this._onResize = () => this.handleResize();

        EVT_HUB_SAFE.on(G_EVT.PLAY.SESSION_STARTED, this._onSessionStarted);
        EVT_HUB_SAFE.on(G_EVT.PLAY.GAME_OVER, this._onGameOver);
        EVT_HUB_SAFE.on(G_EVT.PLAY.SHOW_RESULT, this._onShowResult);
        EVT_HUB_SAFE.on(G_EVT.DATA.SCORE_UPDATED, this._onScoreUpdated);
        window.addEventListener('resize', this._onResize);
        this.handleResize();
    }

    // ─────────────────────────────────────────────
    // 이벤트 핸들러
    // ─────────────────────────────────────────────

    private handleSessionStarted(event: any) {
        const d = event.data || {};
        this.currentUserId = d.userId;
        this.currentUsername = d.username;
    }

    private handleScoreUpdated(event: any) {
        const d = event.data || {};
        if (typeof d.totalScore === 'number') this.finalScore = d.totalScore;
    }

    private handleResize() {
        const canvas = document.querySelector('canvas');
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        this.resultCt.style.width = `${rect.width}px`;
        this.resultCt.style.height = `${rect.height}px`;
        this.resultCt.style.top = `${canvas.offsetTop}px`;
        this.resultCt.style.left = `${canvas.offsetLeft}px`;
    }

    public dispose() {
        EVT_HUB_SAFE.off(G_EVT.PLAY.SESSION_STARTED, this._onSessionStarted);
        EVT_HUB_SAFE.off(G_EVT.PLAY.GAME_OVER, this._onGameOver);
        EVT_HUB_SAFE.off(G_EVT.PLAY.SHOW_RESULT, this._onShowResult);
        EVT_HUB_SAFE.off(G_EVT.DATA.SCORE_UPDATED, this._onScoreUpdated);
        window.removeEventListener('resize', this._onResize);
        if (this.resultCt?.parentElement) {
            this.resultCt.parentElement.removeChild(this.resultCt);
        }
    }

    private px(base: number): number {
        return Math.max(8, (base * window.innerWidth) / 720);
    }

    // ─────────────────────────────────────────────
    // 게임 오버 → 점수 저장 요청
    // ─────────────────────────────────────────────

    private async handleGameOver(event: any): Promise<void> {
        const d = event.data || {};
        if (typeof d.finalScore === 'number') this.finalScore = d.finalScore;
        EVT_HUB_SAFE.emit(G_EVT.PLAY.REQUEST_COLLISION_SAVE, {
            finalScore: this.finalScore,
            userId: this.currentUserId, // ← 여기가 null이면 guest 처리됨
            gameSessionId: null,
            username: this.currentUsername,
        });
    }

    // ─────────────────────────────────────────────
    // 결과 화면 표시
    // ─────────────────────────────────────────────

    private async showResult(
        event: any,
        type: 'GAME_OVER' | 'START'
    ): Promise<void> {
        if (this.isShowing) return;
        this.isShowing = true;

        this.paginationCursor = null;
        this.paginationOffset = 0;

        let isNewRecord = false;
        const isRankingOnly = type === 'START';

        if (!isRankingOnly) {
            const d = event?.data || {};
            if (typeof d.finalScore === 'number')
                this.finalScore = d.finalScore;
            if (typeof d.previousHighScore === 'number')
                this.previousHighScore = d.previousHighScore;
            if (typeof d.isNewRecord === 'boolean') isNewRecord = d.isNewRecord;
            this.currentUserId = d.userId || this.currentUserId;
        }

        // ✅ 로딩 UI 즉시 표시
        this.resultCt.style.display = 'flex';
        this.resultCt.style.opacity = '0';
        this.resultCt.innerHTML = `
            <div style="
                background: linear-gradient(180deg,#f0c060 0%,#e8a020 50%,#c47010 100%);
                border-radius:${this.px(16)}px;
                padding:${this.px(16)}px ${this.px(32)}px;
                box-shadow: 0 3px 0 #7a4a05, 0 ${this.px(4)}px ${this.px(
            6
        )}px rgba(0,0,0,0.25);
                color:#fff; font-size:${this.px(15)}px; font-weight:800;
                letter-spacing:3px;
                text-shadow: 0 2px 0 rgba(0,0,0,0.2);
            ">LOADING...</div>`;

        requestAnimationFrame(() => {
            this.resultCt.style.opacity = '1';
        });

        // ✅ 랭킹 로드 즉시 시작 (이벤트 수신과 동시에)
        const rankingPromise = API_CONNECTOR.getRankingData(
            this.currentUserId || 'guest'
        );

        try {
            const data = await rankingPromise;
            let topRankings: RankingEntry[] = data.topRankings || [];
            let myRanking: RankingEntry | null = data.myRanking || null;

            // ✅ 신기록인 경우 랭킹에 내 점수 낙관적으로 반영
            if (isNewRecord && this.currentUserId) {
                // 기존 내 항목 제거
                topRankings = topRankings.filter(
                    (e) => String(e.userId) !== String(this.currentUserId)
                );

                // 새 점수로 삽입
                const myEntry: RankingEntry = {
                    userId: this.currentUserId,
                    username: this.currentUsername || 'Me',
                    total_score: this.finalScore,
                    rank: 0, // 임시, 아래서 재계산
                    countryCode: myRanking?.countryCode || 'un',
                };

                topRankings.push(myEntry);
                // 점수 내림차순 정렬 후 rank 재부여
                topRankings.sort((a, b) => b.total_score - a.total_score);
                topRankings.forEach((e, i) => (e.rank = i + 1));

                // myRanking도 갱신
                myRanking =
                    topRankings.find(
                        (e) => String(e.userId) === String(this.currentUserId)
                    ) || myRanking;
            }

            this.displayRanking(
                topRankings,
                myRanking,
                this.previousHighScore || 0,
                type,
                isNewRecord
            );
        } catch (err) {
            console.error('❌ 랭킹 로드 에러:', err);
            this.resultCt.innerHTML = `<p style="color:#c00;">Failed to load rankings</p>`;
        } finally {
            this.isShowing = false;
        }
    }

    // ─────────────────────────────────────────────
    // 결과 화면 렌더링
    // ─────────────────────────────────────────────

    private displayRanking(
        topRankings: RankingEntry[],
        myRanking: RankingEntry | null,
        previousScore: number,
        type: 'GAME_OVER' | 'START',
        isNewRecord: boolean
    ): void {
        const isGameOver = type === 'GAME_OVER';
        const isRankingOnly = type === 'START';
        const currentScore = Number(this.finalScore);
        const isNewHighScore = isGameOver && isNewRecord;

        // 나무판 버튼 스타일 헬퍼
        const woodBtn = (id: string, label: string, active = true) => `
            <button id="${id}" style="
                flex:1; padding:${this.px(7)}px ${this.px(4)}px;
                background:linear-gradient(180deg,${
                    active ? '#f0c060,#c47010' : '#c8a050,#907030'
                });
                border:none; border-radius:${this.px(10)}px;
                box-shadow:0 ${this.px(2)}px 0 ${
            active ? '#7a4a05' : '#5a3a00'
        };
                color:${active ? '#fff' : 'rgba(255,255,255,0.65)'};
                font-size:${this.px(11)}px; font-weight:700;
                cursor:pointer; letter-spacing:1px;
                text-shadow:0 1px 0 rgba(0,0,0,0.2);
                font-family:inherit; transition:transform 0.1s;
            ">${label}</button>`;

        // ── 타이틀 ──────────────────────────────────
        const titleText = isRankingOnly
            ? '🌍 LEADERBOARD'
            : isNewHighScore
            ? '🏆 NEW RECORD!'
            : '🎮 GAME OVER';

        let inner = `
        <div style="
            background:linear-gradient(180deg,#f0c060 0%,#e8a020 50%,#c47010 100%);
            border-radius:${this.px(14)}px;
            padding:${this.px(8)}px ${this.px(12)}px;
box-shadow: 0 3px 0 #7a4a05, inset 0 1px 0 rgba(255,255,255,0.4);
            margin-bottom:${this.px(10)}px;
        ">
            <div style="
                font-size:${this.px(17)}px; font-weight:800; color:#fff;
                letter-spacing:2px; text-shadow:0 2px 0 rgba(0,0,0,0.2);
            ">${titleText}</div>
        </div>`;

        // ── 점수 카드 ───────────────────────────────
        if (isGameOver) {
            const bestGradient = isNewHighScore
                ? '#ffcc00 0%,#ff9900 50%,#cc6600 100%'
                : '#f0c060 0%,#e8a020 50%,#c47010 100%';

            inner += `
                <div style="display:flex; gap:${this.px(
                    8
                )}px; margin-bottom:${this.px(10)}px;">
                    <!-- SCORE: 하늘색 계열 (현재 점수) -->
                    <div style="
                        flex:1;
                        background:linear-gradient(180deg,#6ec6f0 0%,#3aa0d8 50%,#1a7ab0 100%);
                        border-radius:${this.px(12)}px;
                        padding:${this.px(8)}px ${this.px(6)}px;
                        box-shadow: 0 3px 0 #0e4a70, inset 0 1px 0 rgba(255,255,255,0.4);
                    ">
                        <div style="font-size:${this.px(
                            9
                        )}px;color:rgba(255,255,255,0.85);letter-spacing:2px;font-weight:600;">SCORE</div>
                        <div id="score-val" style="font-size:${this.px(
                            20
                        )}px;font-weight:800;color:#fff;text-shadow:0 2px 0 rgba(0,0,0,0.2);">
                            ${currentScore.toLocaleString()}
                        </div>
                    </div>
                    <!-- BEST: 기존 나무색 유지 (또는 신기록 시 골드) -->
                    <div style="
                        flex:1;
                        background:linear-gradient(180deg,${bestGradient});
                        border-radius:${this.px(12)}px;
                        padding:${this.px(8)}px ${this.px(6)}px;
                        box-shadow: 0 3px 0 #7a4a05, inset 0 1px 0 rgba(255,255,255,0.4);
                    ">
                        <div style="font-size:${this.px(
                            9
                        )}px;color:rgba(255,255,255,0.85);letter-spacing:2px;font-weight:600;">BEST</div>
                        <div style="font-size:${this.px(
                            20
                        )}px;font-weight:800;color:#fff;text-shadow:0 2px 0 rgba(0,0,0,0.2);">
                            ${previousScore.toLocaleString()}
                        </div>
                    </div>
                </div>`;
        }

        // ── 내 순위 뱃지 ────────────────────────────
        const showNearbyTab = !!(myRanking && myRanking.rank > 20);

        if (showNearbyTab) {
            inner += `
            <div style="
                background:linear-gradient(180deg,#f0c060,#c47010);
                border-radius:${this.px(10)}px;
                padding:${this.px(6)}px ${this.px(10)}px;
box-shadow: 0 3px 0 #7a4a05;
                color:#fff; font-size:${this.px(11)}px; font-weight:700;
                letter-spacing:1px; margin-bottom:${this.px(8)}px;
                text-shadow:0 1px 0 rgba(0,0,0,0.2);
            ">MY RANK &nbsp;#${
                myRanking!.rank
            }&nbsp;&nbsp;·&nbsp;&nbsp;${myRanking!.total_score.toLocaleString()} pts</div>

            <div style="display:flex; gap:${this.px(
                6
            )}px; margin-bottom:${this.px(8)}px;">
                ${woodBtn('tab-top', '🏆 TOP', true)}
                ${woodBtn('tab-nearby', '👥 NEARBY', false)}
            </div>`;
        }

        inner += `<div id="ranking-content"></div>`;

        // ── 메인 패널 ───────────────────────────────
        this.resultCt.innerHTML = `
        <style>
            #inner-box::-webkit-scrollbar { width:${this.px(5)}px; }
            #inner-box::-webkit-scrollbar-track { background:rgba(200,150,50,0.15); border-radius:${this.px(
                4
            )}px; }
            #inner-box::-webkit-scrollbar-thumb { background:rgba(180,110,20,0.4);  border-radius:${this.px(
                4
            )}px; }
        </style>
        <div id="inner-box" style="
            width:90%;
            max-width:${this.px(580)}px;
            max-height:88%;
            overflow-y:auto;
            padding:${this.px(14)}px;
            border-radius:${this.px(20)}px;
            /* 크림색 나무판 내부 */
            background:linear-gradient(180deg,#fffbe8 0%,#fff3c8 100%);
            border:${this.px(4)}px solid #e8a020;
box-shadow: 0 3px 0 #7a4a05
                0 6px 16px rgba(0,0,0,0.25),
                inset 0 1px 0 rgba(255,255,255,0.95);
            text-align:center;
            position:relative;
            color:#5a3000;
        ">
            <!-- 닫기 버튼 -->
            <button id="result-close-btn" style="
                position:absolute; top:${this.px(10)}px; right:${this.px(10)}px;
                background:linear-gradient(180deg,#ff7070,#cc3030);
                color:#fff; border:none; border-radius:50%;
                width:${this.px(28)}px; height:${this.px(28)}px;
                cursor:pointer; font-size:${this.px(15)}px; font-weight:900;
                box-shadow: 0 1px 0 #880000;
                display:flex; align-items:center; justify-content:center;
                font-family:inherit; line-height:1;">×</button>
            ${inner}
        </div>`;

        // ── 닫기 바인딩 ─────────────────────────────
        const closeBtn = document.getElementById(
            'result-close-btn'
        ) as HTMLButtonElement;
        if (closeBtn) {
            closeBtn.onclick = () => {
                this.resultCt.style.opacity = '0';
                setTimeout(() => {
                    this.resultCt.style.display = 'none';
                    this.resultCt.style.opacity = '1';
                }, 250);
            };
        }

        // ── 랭킹 테이블 렌더 ───────────────────────
        const rankingContent = document.getElementById('ranking-content')!;
        rankingContent.innerHTML = this.buildRankingTable(
            topRankings,
            '🏆 Global Top'
        );
        this.bindLoadMoreButton(rankingContent);

        // ── 내 주변 탭 바인딩 ───────────────────────
        if (showNearbyTab) {
            const tabTop = document.getElementById('tab-top')!;
            const tabNearby = document.getElementById('tab-nearby')!;

            const setActive = (active: HTMLElement, inactive: HTMLElement) => {
                active.style.background =
                    'linear-gradient(180deg,#f0c060,#c47010)';
                active.style.color = '#fff';
                active.style.boxShadow = `0 ${this.px(4)}px 0 #7a4a05`;
                inactive.style.background =
                    'linear-gradient(180deg,#c8a050,#907030)';
                inactive.style.color = 'rgba(255,255,255,0.65)';
                inactive.style.boxShadow = `0 ${this.px(4)}px 0 #5a3a00`;
            };

            tabTop.onclick = () => {
                setActive(tabTop, tabNearby);
                this.paginationOffset = topRankings.length;
                rankingContent.innerHTML = this.buildRankingTable(
                    topRankings,
                    '🏆 Global Top'
                );
                this.bindLoadMoreButton(rankingContent);
            };

            tabNearby.onclick = async () => {
                setActive(tabNearby, tabTop);
                rankingContent.innerHTML = `
                    <div style="padding:${this.px(16)}px;color:#a07030;
                                font-size:${this.px(
                                    12
                                )}px;letter-spacing:1px;">로딩 중...</div>`;
                try {
                    const nearby = await API_CONNECTOR.getNearbyBestRankings(
                        myRanking!.rank,
                        myRanking!.total_score
                    );
                    rankingContent.innerHTML = this.buildRankingTable(
                        nearby,
                        '👥 내 주변 순위'
                    );
                } catch {
                    rankingContent.innerHTML = `<p style="color:#c00;font-size:${this.px(
                        12
                    )}px;">순위 로드 실패</p>`;
                }
            };
        }

        // ── 재시작 버튼 ─────────────────────────────
        const restartBtn = document.createElement('button');
        const isLandscape = window.innerWidth > window.innerHeight;
        const btnSize = isLandscape ? this.px(50) : this.px(80);
        const btnBottom = isLandscape ? this.px(20) : this.px(40);

        Object.assign(restartBtn.style, {
            position: 'absolute',
            bottom: `${btnBottom}px`,
            left: '50%',
            transform: 'translateX(-50%)',
            width: `${btnSize}px`,
            height: `${btnSize}px`,
            background:
                'url("./assets/images/btn_re_s.png") no-repeat center center',
            backgroundSize: 'contain',
            border: 'none',
            cursor: 'pointer',
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.25))',
            transition: 'transform 0.12s',
            zIndex: '1010',
        });
        restartBtn.id = 'restart-action-btn';
        this.resultCt.appendChild(restartBtn);

        if (isGameOver) {
            if (closeBtn) closeBtn.style.display = 'none';
            restartBtn.onclick = () => {
                EVT_HUB_SAFE.emit(G_EVT.RE.START);
                this.resultCt.style.display = 'none';
            };
            restartBtn.addEventListener('pointerdown', () => {
                restartBtn.style.backgroundImage =
                    'url("./assets/images/btn_re_n.png")';
                restartBtn.style.transform = 'translateX(-50%) scale(0.93)';
            });
            restartBtn.addEventListener('pointerup', () => {
                restartBtn.style.backgroundImage =
                    'url("./assets/images/btn_re_s.png")';
                restartBtn.style.transform = 'translateX(-50%) scale(1)';
            });
            restartBtn.addEventListener('pointerleave', () => {
                restartBtn.style.backgroundImage =
                    'url("./assets/images/btn_re_s.png")';
                restartBtn.style.transform = 'translateX(-50%) scale(1)';
            });
        } else if (isRankingOnly) {
            restartBtn.style.display = 'none';
        }

        // ── 애니메이션 ──────────────────────────────
        this.injectAnimationStyles();
        this.applyEntryAnimation();
        if (isNewHighScore) setTimeout(() => this.playNewRecordEffect(), 450);

        const scoreVal = document.getElementById('score-val');
        if (scoreVal) scoreVal.classList.add('score-pop');
    }

    // ─────────────────────────────────────────────
    // 랭킹 테이블 HTML 생성
    // ─────────────────────────────────────────────

    private buildRankingTable(rankings: RankingEntry[], title: string): string {
        let html = `
        <div style="
            font-size:${this.px(12)}px; font-weight:800; color:#c47010;
            letter-spacing:2px; margin:${this.px(8)}px 0 ${this.px(6)}px;
            text-shadow:0 1px 0 rgba(255,255,255,0.7);
        ">${title}</div>

        <table id="ranking-table" style="
            width:100%; border-collapse:collapse;
            font-size:${this.px(12)}px;
            border-radius:${this.px(10)}px; overflow:hidden;
box-shadow: 0 3px 0 #7a4a05
        ">
        <thead>
            <tr style="
                background:linear-gradient(180deg,#e8a020,#c47010);
                color:#fff; font-weight:700; letter-spacing:1px;
                text-shadow:0 1px 0 rgba(0,0,0,0.18);
            ">
                <th style="padding:${this.px(7)}px ${this.px(
            4
        )}px;width:${this.px(34)}px;text-align:center;font-size:${this.px(
            9
        )}px;">RANK</th>
                <th style="padding:${this.px(7)}px ${this.px(
            4
        )}px;text-align:left;font-size:${this.px(9)}px;">PLAYER</th>
                <th style="padding:${this.px(7)}px ${this.px(
            4
        )}px;width:${this.px(68)}px;text-align:right;font-size:${this.px(
            9
        )}px;">SCORE</th>
            </tr>
        </thead>
        <tbody id="ranking-tbody">`;

        for (const entry of rankings) {
            const isMe = String(entry.userId) === String(this.currentUserId);
            html += this.createRankingRow(entry, isMe);
        }

        html += `</tbody></table>`;
        return html;
    }

    // ─────────────────────────────────────────────
    // "더 보기" 버튼
    // ─────────────────────────────────────────────

    private bindLoadMoreButton(container: HTMLElement): void {
        const old = container.querySelector('#load-more-btn');
        if (old) old.remove();
        if (!this.paginationCursor) return;

        const btn = document.createElement('button');
        btn.id = 'load-more-btn';
        btn.textContent = `+ 더 보기 (${this.paginationOffset + 1}위~)`;
        Object.assign(btn.style, {
            display: 'block',
            margin: `${this.px(10)}px auto`,
            padding: `${this.px(7)}px ${this.px(20)}px`,
            background: 'linear-gradient(180deg,#f0c060,#c47010)',
            border: 'none',
            borderRadius: `${this.px(20)}px`,
            boxShadow: `0 ${this.px(4)}px 0 #7a4a05`,
            color: '#fff',
            fontSize: `${this.px(11)}px`,
            fontWeight: '700',
            cursor: 'pointer',
            letterSpacing: '1px',
            textShadow: '0 1px 0 rgba(0,0,0,0.2)',
            fontFamily: 'inherit',
        });

        btn.onclick = async () => {
            btn.textContent = '로딩 중...';
            btn.style.opacity = '0.6';
            btn.style.pointerEvents = 'none';

            const { rankings: newPage, lastDoc } =
                await API_CONNECTOR.getTopBestScores(
                    20,
                    this.paginationCursor,
                    this.paginationOffset
                );
            this.paginationCursor = lastDoc;
            this.paginationOffset += newPage.length;

            const tbody = document.getElementById('ranking-tbody');
            if (tbody) {
                for (const entry of newPage) {
                    const isMe =
                        String(entry.userId) === String(this.currentUserId);
                    tbody.insertAdjacentHTML(
                        'beforeend',
                        this.createRankingRow(entry, isMe)
                    );
                }
            }
            btn.remove();
            this.bindLoadMoreButton(container);
        };

        container.appendChild(btn);
    }

    // ─────────────────────────────────────────────
    // 랭킹 행 HTML 생성
    // ─────────────────────────────────────────────

    private createRankingRow(entry: RankingEntry, isMe: boolean): string {
        const rank = entry.rank;
        const countryCode = (entry.countryCode || 'un').toLowerCase();
        const crown =
            rank === 1
                ? '👑'
                : rank === 2
                ? '🥈'
                : rank === 3
                ? '🥉'
                : `${rank}`;

        const flagImg = `<img
            src="https://flagcdn.com/w40/${countryCode}.png"
            style="width:${this.px(15)}px;height:auto;vertical-align:middle;
                   margin-right:${this.px(4)}px;border-radius:2px;
                   box-shadow:0 1px 2px rgba(0,0,0,0.15);"
            onerror="this.src='https://flagcdn.com/w40/un.png'"/>`;

        let rowBg =
            rank % 2 === 0 ? 'rgba(230,160,30,0.07)' : 'rgba(255,255,255,0.55)';
        let color = '#5a3000';
        let weight = '500';
        let size = 12;
        let outline = '';

        if (rank === 1) {
            rowBg = 'rgba(255,215,0,0.22)';
            color = '#7a4f00';
            weight = '800';
            size = 13;
        }
        if (rank === 2) {
            rowBg = 'rgba(192,192,192,0.18)';
            color = '#555';
            weight = '700';
            size = 13;
        }
        if (rank === 3) {
            rowBg = 'rgba(205,127,50,0.18)';
            color = '#7a4010';
            weight = '700';
            size = 13;
        }
        if (isMe) {
            rowBg = 'rgba(255,200,40,0.35)';
            color = '#6a3000';
            weight = '800';
            outline = `
                border-left: 3px solid #e8a020;
                border-top: 1px solid rgba(232,160,32,0.4);
                border-bottom: 1px solid rgba(232,160,32,0.4);
            `;
        }

        const youBadge = isMe
            ? `<span style="
                display:inline-block;
                background:#e8a020; color:#fff;
                font-size:${this.px(8)}px; font-weight:800;
                padding:1px ${this.px(4)}px;
                border-radius:${this.px(4)}px;
                margin-left:${this.px(4)}px;
                vertical-align:middle;
                letter-spacing:0.5px;
              ">YOU</span>`
            : '';

        return `
        <tr style="
            background:${rowBg}; color:${color}; font-weight:${weight};
            font-size:${this.px(size)}px;
            border-bottom:1px solid rgba(200,140,40,0.12);
            ${outline}
        ">
            <td style="padding:${this.px(6)}px ${this.px(
            3
        )}px;text-align:center;font-weight:800;">${crown}</td>
            <td style="padding:${this.px(6)}px ${this.px(
            3
        )}px;text-align:left;">
                ${flagImg}${entry.username}${youBadge}
            </td>
            <td style="padding:${this.px(6)}px ${this.px(3)}px;text-align:right;
                       font-family:'SF Mono',Consolas,monospace;font-size:${this.px(
                           size - 1
                       )}px;">
                ${entry.total_score.toLocaleString()}
            </td>
        </tr>`;
    }

    // ─────────────────────────────────────────────
    // 바운스 등장 애니메이션
    // ─────────────────────────────────────────────

    private applyEntryAnimation(): void {
        const box = document.getElementById('inner-box');
        if (!box) return;

        box.style.transform = 'translateY(50px) scale(0.88)';
        box.style.opacity = '0';
        box.style.transition = 'none';

        this.resultCt.style.opacity = '0';
        this.resultCt.style.transition = 'opacity 0.25s ease';
        this.resultCt.style.display = 'flex';

        requestAnimationFrame(() => {
            this.resultCt.style.opacity = '1';
            requestAnimationFrame(() => {
                box.style.transition =
                    'transform 0.55s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease';
                box.style.transform = 'translateY(0) scale(1)';
                box.style.opacity = '1';
            });
        });
    }

    // ─────────────────────────────────────────────
    // 신기록 파티클
    // ─────────────────────────────────────────────

    private playNewRecordEffect(): void {
        const emojis = ['🍉', '🍊', '🍋', '🍇', '🍓', '⭐', '✨'];
        const directions = ['fruitFallCW', 'fruitFallCCW'];

        for (let i = 0; i < 14; i++) {
            const el = document.createElement('div');
            el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
            const anim = directions[Math.floor(Math.random() * 2)];
            Object.assign(el.style, {
                position: 'fixed',
                left: `${15 + Math.random() * 70}%`,
                top: `${20 + Math.random() * 40}%`,
                fontSize: `${16 + Math.random() * 20}px`,
                pointerEvents: 'none',
                zIndex: '2000',
                animation: `${anim} ${
                    0.7 + Math.random() * 0.9
                }s ease-out forwards`,
                animationDelay: `${Math.random() * 0.4}s`,
            });
            document.body.appendChild(el);
            el.addEventListener('animationend', () => el.remove());
        }
    }

    // ─────────────────────────────────────────────
    // CSS 주입 (한 번만)
    // ─────────────────────────────────────────────

    private injectAnimationStyles(): void {
        if (document.getElementById('result-anim-style')) return;
        const style = document.createElement('style');
        style.id = 'result-anim-style';

        const rowDelays = Array.from(
            { length: 25 },
            (_, i) =>
                `#ranking-tbody tr:nth-child(${i + 1}) { animation-delay:${
                    0.04 * (i + 1)
                }s; }`
        ).join('\n');

        style.textContent = `
        @keyframes fruitFallCW {
            0%   { transform:translateY(0) rotate(0deg);     opacity:1; }
            100% { transform:translateY(140px) rotate(360deg); opacity:0; }
        }
        @keyframes fruitFallCCW {
            0%   { transform:translateY(0) rotate(0deg);      opacity:1; }
            100% { transform:translateY(140px) rotate(-360deg); opacity:0; }
        }
        @keyframes scoreCountUp {
            0%   { transform:scale(1.4); color:#e8a020; }
            100% { transform:scale(1);   color:inherit; }
        }
        .score-pop { animation:scoreCountUp 0.5s ease-out; }
        @keyframes rankRowFadeIn {
            from { opacity:0; transform:translateX(-10px); }
            to   { opacity:1; transform:translateX(0); }
        }
        #ranking-tbody tr { animation:rankRowFadeIn 0.3s ease-out both; }
        ${rowDelays}`;

        document.head.appendChild(style);
    }
}
