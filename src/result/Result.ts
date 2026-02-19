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

    // ✅ 페이지네이션 상태
    private paginationCursor: any = null; // Firestore DocumentSnapshot
    private paginationOffset: number = 0; // 현재까지 로드된 항목 수

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
            background: 'rgba(0, 0, 0, 0.92)',
            color: 'white',
            display: 'none',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '0',
            zIndex: '1001',
            fontFamily:
                '"SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            boxSizing: 'border-box',
            textAlign: 'center',
            opacity: '0',
            transition: 'opacity 0.25s ease',
        });
        parent.appendChild(this.resultCt);

        this._onSessionStarted = (event: any) =>
            this.handleSessionStarted(event);
        this._onGameOver = (event: any) => this.handleGameOver(event);
        this._onShowResult = (event: any) =>
            this.showResult(event, event.data.mode);
        this._onScoreUpdated = (event: any) => this.handleScoreUpdated(event);
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
        const data = event.data || {};
        this.currentUserId = data.userId;
        this.currentUsername = data.username;
    }

    private handleScoreUpdated(event: any) {
        const data = event.data || {};
        if (typeof data.totalScore === 'number') {
            this.finalScore = data.totalScore;
        }
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
        console.log('🧹 Result - 리소스 해제 (dispose)');
        EVT_HUB_SAFE.off(G_EVT.PLAY.SESSION_STARTED, this._onSessionStarted);
        EVT_HUB_SAFE.off(G_EVT.PLAY.GAME_OVER, this._onGameOver);
        EVT_HUB_SAFE.off(G_EVT.PLAY.SHOW_RESULT, this._onShowResult);
        EVT_HUB_SAFE.off(G_EVT.DATA.SCORE_UPDATED, this._onScoreUpdated);
        window.removeEventListener('resize', this._onResize);

        if (this.resultCt?.parentElement) {
            this.resultCt.parentElement.removeChild(this.resultCt);
        }
    }

    private px(baseSize: number): number {
        const sw = window.innerWidth;
        return Math.max(8, (baseSize * sw) / 720);
    }

    // ─────────────────────────────────────────────
    // 게임 오버 → 점수 저장 요청
    // ─────────────────────────────────────────────

    private async handleGameOver(event: any): Promise<void> {
        const evData = event.data || {};
        if (typeof evData.finalScore === 'number') {
            this.finalScore = evData.finalScore;
        }

        EVT_HUB_SAFE.emit(G_EVT.PLAY.REQUEST_COLLISION_SAVE, {
            finalScore: this.finalScore,
            userId: this.currentUserId,
            gameSessionId: null,
            username: this.currentUsername,
        });
    }

    // ─────────────────────────────────────────────
    // 결과 화면 표시 (로딩 → 랭킹 렌더)
    // ─────────────────────────────────────────────

    private async showResult(
        event: any,
        type: 'GAME_OVER' | 'START'
    ): Promise<void> {
        if (this.isShowing) return;
        this.isShowing = true;

        // 페이지네이션 상태 초기화
        this.paginationCursor = null;
        this.paginationOffset = 0;

        const isRankingOnly = type === 'START';

        if (!isRankingOnly) {
            const eventData = event?.data || {};
            if (typeof eventData.finalScore === 'number') {
                this.finalScore = eventData.finalScore;
            }
            if (typeof eventData.previousHighScore === 'number') {
                this.previousHighScore = eventData.previousHighScore;
            }
            this.currentUserId = eventData.userId || this.currentUserId;
        }

        // 로딩 화면
        this.resultCt.style.display = 'flex';
        this.resultCt.style.opacity = '0';
        this.resultCt.innerHTML = `<h2 style="color: white; font-size: ${this.px(
            18
        )}px;">Loading...</h2>`;

        requestAnimationFrame(() => {
            this.resultCt.style.opacity = '1';
        });

        try {
            const data = await API_CONNECTOR.getRankingData(
                this.currentUserId || 'guest'
            );

            this.displayRanking(
                data.topRankings || [],
                data.myRanking || null,
                this.previousHighScore || 0,
                type
            );
        } catch (err) {
            console.error('❌ 랭킹 로드 에러:', err);
            this.resultCt.innerHTML = `<p style="color: red; font-size: ${this.px(
                14
            )}px;">Failed to load rankings</p>`;
        } finally {
            this.isShowing = false;
        }
    }

    // ─────────────────────────────────────────────
    // 랭킹 화면 렌더링
    // ─────────────────────────────────────────────

    private displayRanking(
        topRankings: RankingEntry[],
        myRanking: RankingEntry | null,
        previousScore: number,
        type: 'GAME_OVER' | 'START'
    ): void {
        const isGameOver = type === 'GAME_OVER';
        const isRankingOnly = type === 'START';

        const myDisplayName = this.currentUsername || 'Guest';
        const currentScore = Number(this.finalScore);
        const isNewHighScore = isGameOver && currentScore === previousScore;

        // ── 상단 헤더 ──────────────────────────────
        let inner = `
        <div style="font-size:${this.px(20)}px; font-weight:600; color:#fff;
                    margin-bottom:${this.px(8)}px; letter-spacing:0.5px;">
            ${isRankingOnly ? '🌍 Global Leaderboard' : myDisplayName}
        </div>`;

        // ── 점수 카드 (게임오버 시만) ───────────────
        if (isGameOver) {
            inner += `
            <h2 style="
                color:${isNewHighScore ? '#ffd700' : '#ffffff'};
                font-size:${this.px(22)}px;
                margin-bottom:${this.px(8)}px;
                letter-spacing:0.5px;
                text-shadow:0 0 8px rgba(255,251,0,0.4);
                font-weight:700;
            ">
                ${isNewHighScore ? '🏆 NEW RECORD!' : 'GAME OVER'}
            </h2>

            <div style="
                margin:0 auto ${this.px(10)}px auto;
                max-width:${this.px(320)}px;
                display:flex;
                justify-content:space-around;
                border-radius:${this.px(6)}px;
                padding:${this.px(8)}px;
                background:rgba(0,0,0,0.4);
                backdrop-filter:blur(6px);
                border:1px solid rgba(255,255,255,0.1);
            ">
                <div style="flex:1;">
                    <p style="font-size:${this.px(
                        11
                    )}px; color:#aaa; margin:${this.px(2)}px 0;
                              font-weight:500; letter-spacing:0.3px;">SCORE</p>
                    <p id="score-val" style="font-size:${this.px(
                        20
                    )}px; font-weight:700; margin:0;">
                        ${currentScore.toLocaleString()}
                    </p>
                </div>
                <div style="flex:1; border-left:1px solid rgba(255,255,255,0.1);">
                    <p style="font-size:${this.px(
                        11
                    )}px; color:#aaa; margin:${this.px(2)}px 0;
                              font-weight:500; letter-spacing:0.3px;">BEST</p>
                    <p style="font-size:${this.px(
                        20
                    )}px; font-weight:700; margin:0;
                              color:${isNewHighScore ? '#00ff88' : '#66ffcc'};">
                        ${previousScore.toLocaleString()}
                    </p>
                </div>
            </div>`;
        }

        // ── 내 순위 뱃지 (TOP 20 밖일 때) ─────────
        const showNearbyTab = !!(myRanking && myRanking.rank > 20);

        if (showNearbyTab) {
            inner += `
            <div style="
                margin:${this.px(8)}px auto;
                max-width:${this.px(320)}px;
                padding:${this.px(6)}px ${this.px(10)}px;
                background:rgba(0,255,255,0.1);
                border:1px solid rgba(0,255,255,0.3);
                border-radius:${this.px(4)}px;
                font-size:${this.px(12)}px;
                color:#00ffff;
            ">
                Your Rank: #${
                    myRanking!.rank
                } · ${myRanking!.total_score.toLocaleString()} pts
            </div>

            <div style="
                display:flex; gap:${this.px(8)}px; justify-content:center;
                margin:${this.px(10)}px auto; max-width:${this.px(320)}px;
            ">
                <button id="tab-top" style="
                    flex:1; padding:${this.px(6)}px;
                    background:rgba(0,255,180,0.2);
                    border:1px solid rgba(0,255,180,0.5);
                    border-radius:${this.px(4)}px;
                    color:#00ffcc; font-size:${this.px(
                        12
                    )}px; font-weight:600; cursor:pointer;">
                    🏆 TOP
                </button>
                <button id="tab-nearby" style="
                    flex:1; padding:${this.px(6)}px;
                    background:rgba(255,255,255,0.1);
                    border:1px solid rgba(255,255,255,0.2);
                    border-radius:${this.px(4)}px;
                    color:#ccc; font-size:${this.px(
                        12
                    )}px; font-weight:600; cursor:pointer;">
                    👥 내 주변
                </button>
            </div>`;
        }

        inner += `<div id="ranking-content"></div>`;

        // ── 전체 컨테이너 HTML ──────────────────────
        this.resultCt.innerHTML = `
        <style>
            #inner-box::-webkit-scrollbar { width:${this.px(4)}px; }
            #inner-box::-webkit-scrollbar-track { background:rgba(0,43,27,0.4); border-radius:${this.px(
                3
            )}px; }
            #inner-box::-webkit-scrollbar-thumb { background:rgba(0,255,150,0.25); border-radius:${this.px(
                3
            )}px; }
            #inner-box::-webkit-scrollbar-thumb:hover { background:rgba(0,255,150,0.5); }
        </style>
        <div id="inner-box" style="
            width:92%;
            max-width:${this.px(650)}px;
            max-height:85%;
            overflow-y:auto;
            padding:${this.px(12)}px;
            border-radius:${this.px(10)}px;
            background:linear-gradient(180deg, rgba(0,43,27,0.95), rgba(0,77,44,0.95));
            border:1.5px solid rgba(255,255,255,0.1);
            box-shadow:0 0 20px rgba(0,255,150,0.2);
            text-align:center;
            position:relative;
            color:#fff;
            margin:auto;
        ">
            <button id="result-close-btn" style="
                position:absolute; top:${this.px(8)}px; right:${this.px(8)}px;
                background:#ff4d4d; color:#fff; border:none; border-radius:50%;
                width:${this.px(26)}px; height:${this.px(26)}px;
                cursor:pointer; font-size:${this.px(14)}px; font-weight:bold;
                box-shadow:0 0 8px rgba(255,80,80,0.7);
                display:flex; align-items:center; justify-content:center;">
                ×
            </button>
            ${inner}
        </div>`;

        // ── 버튼 바인딩 ────────────────────────────
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

        // 첫 페이지 커서 저장 (더 보기용)
        // paginationCursor는 getTopBestScores 호출 시 받아온 것이 없으므로
        // displayRanking 외부에서 받아야 함 → showResult에서 별도 처리
        this.bindLoadMoreButton(rankingContent);

        // ── 내 주변 탭 ─────────────────────────────
        if (showNearbyTab) {
            const tabTop = document.getElementById('tab-top')!;
            const tabNearby = document.getElementById('tab-nearby')!;

            const setActive = (active: HTMLElement, inactive: HTMLElement) => {
                active.style.background = 'rgba(0,255,180,0.2)';
                active.style.borderColor = 'rgba(0,255,180,0.5)';
                active.style.color = '#00ffcc';
                inactive.style.background = 'rgba(255,255,255,0.1)';
                inactive.style.borderColor = 'rgba(255,255,255,0.2)';
                inactive.style.color = '#ccc';
            };

            tabTop.onclick = () => {
                setActive(tabTop, tabNearby);
                // ✅ 페이지네이션 상태 복원
                this.paginationOffset = topRankings.length;
                rankingContent.innerHTML = this.buildRankingTable(
                    topRankings,
                    '🏆 Global Top'
                );
                this.bindLoadMoreButton(rankingContent);
            };

            tabNearby.onclick = async () => {
                setActive(tabNearby, tabTop);
                rankingContent.innerHTML = `<p style="color:#aaa; font-size:${this.px(
                    13
                )}px;">로딩 중...</p>`;

                try {
                    const nearby = await API_CONNECTOR.getNearbyBestRankings(
                        myRanking!.rank,
                        myRanking!.total_score
                    );
                    // 내 주변 탭은 페이지네이션 없이 단순 표시
                    rankingContent.innerHTML = this.buildRankingTable(
                        nearby,
                        '👥 내 주변 순위'
                    );
                } catch (e) {
                    rankingContent.innerHTML = `<p style="color:red;">순위 로드 실패</p>`;
                }
            };
        }

        // ── 재시작 버튼 ────────────────────────────
        const restartBtn = document.createElement('button');
        Object.assign(restartBtn.style, {
            position: 'absolute',
            bottom: `${this.px(40)}px`,
            left: '50%',
            transform: 'translateX(-50%)',
            width: `${this.px(80)}px`,
            height: `${this.px(80)}px`,
            background:
                'url("./assets/images/btn_re_s.png") no-repeat center center',
            backgroundSize: 'contain',
            border: 'none',
            cursor: 'pointer',
            filter: 'drop-shadow(0 0 8px #00ffaa)',
            transition: 'transform 0.15s',
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
            });
            restartBtn.addEventListener('pointerup', () => {
                restartBtn.style.backgroundImage =
                    'url("./assets/images/btn_re_s.png")';
            });
            restartBtn.addEventListener('pointerleave', () => {
                restartBtn.style.backgroundImage =
                    'url("./assets/images/btn_re_s.png")';
            });
        } else if (isRankingOnly) {
            restartBtn.style.display = 'none';
        }

        // ── 애니메이션 실행 ────────────────────────
        this.injectAnimationStyles();
        this.applyEntryAnimation();

        if (isNewHighScore) {
            setTimeout(() => this.playNewRecordEffect(), 450);
        }

        // score-pop 효과
        const scoreVal = document.getElementById('score-val');
        if (scoreVal) {
            scoreVal.classList.add('score-pop');
        }
    }

    // ─────────────────────────────────────────────
    // 랭킹 테이블 HTML 생성
    // ─────────────────────────────────────────────

    private buildRankingTable(rankings: RankingEntry[], title: string): string {
        let html = `
        <h3 style="
            margin-top:${this.px(10)}px;
            font-size:${this.px(16)}px;
            color:#00ffcc;
            text-align:center;
            text-shadow:0 0 6px rgba(0,255,180,0.4);
            font-weight:600;
            letter-spacing:0.5px;
        ">${title}</h3>

        <table id="ranking-table" style="
            width:100%;
            max-width:${this.px(550)}px;
            margin:${this.px(8)}px auto;
            border-collapse:collapse;
            text-align:left;
            font-size:${this.px(13)}px;
            border-radius:${this.px(6)}px;
            overflow:hidden;
            background:rgba(255,255,255,0.03);
            backdrop-filter:blur(4px);
            border:1px solid rgba(255,255,255,0.08);
            box-shadow:0 0 12px rgba(0,255,160,0.2);
        ">
        <thead>
            <tr style="background:rgba(0,120,90,0.6); color:#eafff8; letter-spacing:0.5px; font-weight:600;">
                <th style="padding:${this.px(5)}px; width:${this.px(
            40
        )}px; text-align:center; font-size:${this.px(11)}px;">RANK</th>
                <th style="padding:${this.px(5)}px; font-size:${this.px(
            11
        )}px;">PLAYER</th>
                <th style="padding:${this.px(5)}px; width:${this.px(
            75
        )}px; text-align:right; font-size:${this.px(11)}px;">SCORE</th>
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
    // "더 보기" 버튼 바인딩
    // paginationCursor가 있으면 버튼을 추가한다
    // ─────────────────────────────────────────────

    private bindLoadMoreButton(container: HTMLElement): void {
        // 기존 버튼 제거
        const old = container.querySelector('#load-more-btn');
        if (old) old.remove();

        if (!this.paginationCursor) return;

        const nextStart = this.paginationOffset + 1;
        const btn = document.createElement('button');
        btn.id = 'load-more-btn';
        btn.textContent = `+ 더 보기 (${nextStart}위 ~)`;
        Object.assign(btn.style, {
            display: 'block',
            margin: `${this.px(10)}px auto`,
            padding: `${this.px(8)}px ${this.px(20)}px`,
            background: 'rgba(0,255,150,0.15)',
            border: '1px solid rgba(0,255,150,0.4)',
            borderRadius: `${this.px(20)}px`,
            color: '#00ffaa',
            fontSize: `${this.px(12)}px`,
            fontWeight: '600',
            cursor: 'pointer',
            letterSpacing: '0.5px',
            transition: 'opacity 0.2s',
        });

        btn.onclick = async () => {
            btn.textContent = '로딩 중...';
            btn.style.opacity = '0.5';
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
            rank === 1 ? '👑 ' : rank === 2 ? '🥈 ' : rank === 3 ? '🥉 ' : '';

        const flagImg = `<img src="https://flagcdn.com/w40/${countryCode}.png"
            style="width:${this.px(18)}px; height:auto; vertical-align:middle;
                   margin-right:${this.px(4)}px; border-radius:2px;
                   box-shadow:0 0 3px rgba(0,0,0,0.3);"
            onerror="this.src='https://flagcdn.com/w40/un.png'"/>`;

        let bg = isMe ? 'rgba(0,255,255,0.15)' : 'transparent';
        let color = isMe ? '#00FFFF' : '#e6fff7';
        let fontWeight = isMe ? '700' : '500';
        let fontSize = 13;

        if (rank === 1) {
            color = '#ffd700';
            fontWeight = '800';
            fontSize = 14;
        } else if (rank === 2) {
            color = '#c0c0c0';
            fontWeight = '700';
            fontSize = 14;
        } else if (rank === 3) {
            color = '#cd7f32';
            fontWeight = '700';
            fontSize = 14;
        }

        return `
        <tr style="
            background:${bg}; color:${color}; font-weight:${fontWeight};
            font-size:${this.px(fontSize)}px;
            border-bottom:1px solid rgba(255,255,255,0.04);
        ">
            <td style="padding:${this.px(6)}px ${this.px(
            4
        )}px; text-align:center;">${rank}</td>
            <td style="padding:${this.px(6)}px ${this.px(4)}px;">
                ${flagImg}${crown}${entry.username}
            </td>
            <td style="padding:${this.px(6)}px ${this.px(
            4
        )}px; text-align:right;
                       font-family:'SF Mono',Consolas,monospace; font-size:${this.px(
                           fontSize - 1
                       )}px;">
                ${entry.total_score.toLocaleString()}
            </td>
        </tr>`;
    }

    // ─────────────────────────────────────────────
    // 애니메이션: 박스 바운스 등장
    // ─────────────────────────────────────────────

    private applyEntryAnimation(): void {
        const innerBox = document.getElementById('inner-box');
        if (!innerBox) return;

        innerBox.style.transform = 'translateY(60px) scale(0.85)';
        innerBox.style.opacity = '0';
        innerBox.style.transition = 'none';

        this.resultCt.style.opacity = '0';
        this.resultCt.style.transition = 'opacity 0.25s ease';
        this.resultCt.style.display = 'flex';

        requestAnimationFrame(() => {
            this.resultCt.style.opacity = '1';
            requestAnimationFrame(() => {
                innerBox.style.transition =
                    'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease';
                innerBox.style.transform = 'translateY(0) scale(1)';
                innerBox.style.opacity = '1';
            });
        });
    }

    // ─────────────────────────────────────────────
    // 애니메이션: 신기록 과일 파티클
    // ─────────────────────────────────────────────

    private playNewRecordEffect(): void {
        const emojis = ['🍉', '🍊', '🍋', '🍇', '⭐', '✨'];
        const directions = ['fruitFallCW', 'fruitFallCCW'];

        for (let i = 0; i < 14; i++) {
            const el = document.createElement('div');
            el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
            const animName = directions[Math.floor(Math.random() * 2)];
            Object.assign(el.style, {
                position: 'fixed',
                left: `${15 + Math.random() * 70}%`,
                top: `${25 + Math.random() * 35}%`,
                fontSize: `${14 + Math.random() * 22}px`,
                pointerEvents: 'none',
                zIndex: '2000',
                animation: `${animName} ${
                    0.7 + Math.random() * 0.9
                }s ease-out forwards`,
                animationDelay: `${Math.random() * 0.45}s`,
            });
            document.body.appendChild(el);
            el.addEventListener('animationend', () => el.remove());
        }
    }

    // ─────────────────────────────────────────────
    // CSS 키프레임 주입 (한 번만)
    // ─────────────────────────────────────────────

    private injectAnimationStyles(): void {
        if (document.getElementById('result-anim-style')) return;

        const style = document.createElement('style');
        style.id = 'result-anim-style';

        // 순위 행 순차 fadein 딜레이 생성
        const rowDelays = Array.from(
            { length: 25 },
            (_, i) =>
                `#ranking-tbody tr:nth-child(${i + 1}) { animation-delay: ${
                    0.04 * (i + 1)
                }s; }`
        ).join('\n');

        style.textContent = `
        @keyframes fruitFallCW {
            0%   { transform: translateY(0)    rotate(0deg);   opacity: 1; }
            100% { transform: translateY(130px) rotate(360deg); opacity: 0; }
        }
        @keyframes fruitFallCCW {
            0%   { transform: translateY(0)    rotate(0deg);    opacity: 1; }
            100% { transform: translateY(130px) rotate(-360deg); opacity: 0; }
        }
        @keyframes scoreCountUp {
            0%   { transform: scale(1.35); color: #ffd700; }
            100% { transform: scale(1);    color: inherit; }
        }
        .score-pop {
            animation: scoreCountUp 0.45s ease-out;
        }
        @keyframes rankRowFadeIn {
            from { opacity: 0; transform: translateX(-12px); }
            to   { opacity: 1; transform: translateX(0); }
        }
        #ranking-tbody tr {
            animation: rankRowFadeIn 0.3s ease-out both;
        }
        ${rowDelays}
        `;
        document.head.appendChild(style);
    }
}

// ═══════════════════════════════════════════════════════════════
// 제거된 함수 목록
// ───────────────────────────────────────────────────────────────
// ❌ getNearbyRankings()   → ApiConnector.getNearbyBestRankings()로 이동
// ❌ allRankingsCache      → 캐싱이 API 레이어로 이동(불필요)
// ═══════════════════════════════════════════════════════════════
