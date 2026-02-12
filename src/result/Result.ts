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
        });
        parent.appendChild(this.resultCt);

        this._onSessionStarted = (event: any) =>
            this.handleSessionStarted(event);
        this._onGameOver = (event: any) => this.handleGameOver(event);
        this._onShowResult = (event: any) => {
            this.showResult(event, event.data.mode);
        };
        this._onScoreUpdated = (event: any) => this.handleScoreUpdated(event);
        this._onResize = () => this.handleResize();

        EVT_HUB_SAFE.on(G_EVT.PLAY.SESSION_STARTED, this._onSessionStarted);
        EVT_HUB_SAFE.on(G_EVT.PLAY.GAME_OVER, this._onGameOver);
        EVT_HUB_SAFE.on(G_EVT.PLAY.SHOW_RESULT, this._onShowResult);
        EVT_HUB_SAFE.on(G_EVT.DATA.SCORE_UPDATED, this._onScoreUpdated);
        window.addEventListener('resize', this._onResize);
        this.handleResize();
    }

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

        if (this.resultCt && this.resultCt.parentElement) {
            this.resultCt.parentElement.removeChild(this.resultCt);
        }
    }

    // ✅ 폰트 크기 계산
    private px(baseSize: number): number {
        const sw = window.innerWidth;
        const baseWidth = 720;
        return Math.max(8, (baseSize * sw) / baseWidth);
    }

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

    private async showResult(
        event: any,
        type: 'GAME_OVER' | 'START'
    ): Promise<void> {
        if (this.isShowing) return;
        this.isShowing = true;

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

        this.resultCt.style.display = 'flex';
        this.resultCt.innerHTML = `<h2 style="color: white; font-size: ${this.px(
            18
        )}px;">Loading...</h2>`;

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

    private displayRanking(
        topRankings: RankingEntry[],
        myRanking: RankingEntry | null,
        previousScore: number,
        type: 'GAME_OVER' | 'START'
    ): void {
        const isGameOver = type === 'GAME_OVER';
        const isRankingOnly = type === 'START';
        const highScore = previousScore;
        let inner = '';

        const oldBtn = this.resultCt.querySelector(
            'button:not(#result-close-btn)'
        );
        if (oldBtn) oldBtn.remove();

        const myDisplayName = this.currentUsername || 'Guest';

        // ✅ 제목
        inner += `
            <div style="font-size: ${this.px(
                20
            )}px; font-weight: 600; color: #fff; margin-bottom: ${this.px(
            8
        )}px; letter-spacing: 0.5px;">
                ${isRankingOnly ? '🌍 Global Leaderboard' : myDisplayName}
            </div>
        `;

        // ✅ GAME OVER UI (크기 대폭 축소)
        if (isGameOver) {
            const currentScore = Number(this.finalScore);
            const isNewHighScore = currentScore > highScore;
            const displayHighScore = Math.max(currentScore, highScore);

            inner += `
            <h2 style="
                color:${isNewHighScore ? '#ffd700' : '#ffffff'};
                font-size:${this.px(22)}px;
                margin-bottom:${this.px(8)}px;
                letter-spacing:0.5px;
                text-shadow:0 0 8px rgba(255, 251, 0, 0.4);
                font-weight:700;
            ">
                ${isNewHighScore ? '🏆 NEW RECORD!' : 'GAME OVER'}
            </h2>
    
            <div style="
                margin:0 auto ${this.px(10)}px auto;
                max-width:${this.px(320)}px;
                display:flex;
                justify-content:space-around;
                text-align:center;
                border-radius:${this.px(6)}px;
                padding:${this.px(8)}px;
                background:rgba(0,0,0,0.4);
                backdrop-filter: blur(6px);
                border:1px solid rgba(255,255,255,0.1);
            ">
                <div style="flex:1;">
                    <p style="font-size:${this.px(
                        11
                    )}px; color:#aaa; margin:${this.px(
                2
            )}px 0; font-weight:500; letter-spacing:0.3px;">SCORE</p>
                    <p style="font-size:${this.px(
                        20
                    )}px; font-weight:700; margin:0;">${currentScore.toLocaleString()}</p>
                </div>
    
                <div style="flex:1; border-left:1px solid rgba(255,255,255,0.1);">
                    <p style="font-size:${this.px(
                        11
                    )}px; color:#aaa; margin:${this.px(
                2
            )}px 0; font-weight:500; letter-spacing:0.3px;">BEST</p>
                    <p style="font-size:${this.px(
                        20
                    )}px; font-weight:700; margin:0; color:${
                isNewHighScore ? '#00ff88' : '#66ffcc'
            };">
                        ${displayHighScore.toLocaleString()}
                    </p>
                </div>
            </div>
            `;
        }

        // ✅ 내 랭킹 표시 (TOP 20 밖일 경우)
        if (myRanking && myRanking.rank > 20) {
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
                    myRanking.rank
                } · ${myRanking.total_score.toLocaleString()} pts
            </div>
            `;
        }

        // ✅ RANKING TABLE
        inner += `
        <h3 style="
            margin-top:${this.px(10)}px; 
            font-size:${this.px(16)}px; 
            color:#00ffcc;
            text-align:center;
            text-shadow:0 0 6px rgba(0,255,180,0.4);
            font-weight:600;
            letter-spacing:0.5px;
        ">
            🏆 Top 20
        </h3>
        
        <table style="
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
        <tbody>
        `;

        for (let i = 0; i < topRankings.length; i++) {
            const entry = topRankings[i];
            const isMe = String(entry.userId) === String(this.currentUserId);
            inner += this.createRankingRow(entry, isMe);
        }

        inner += `</tbody></table>`;

        // ✅ 컨테이너
        this.resultCt.innerHTML = `
        <style>
            #inner-box::-webkit-scrollbar { width: ${this.px(4)}px; }
            #inner-box::-webkit-scrollbar-track { background: rgba(0, 43, 27, 0.4); border-radius: ${this.px(
                3
            )}px; }
            #inner-box::-webkit-scrollbar-thumb { background: rgba(0, 255, 150, 0.25); border-radius: ${this.px(
                3
            )}px; }
            #inner-box::-webkit-scrollbar-thumb:hover { background: rgba(0, 255, 150, 0.5); }
        </style>
        <div id="inner-box" style="
            width: 92%;
            max-width: ${this.px(650)}px;
            max-height: 85%;
            overflow-y: auto;
            padding: ${this.px(12)}px;
            border-radius: ${this.px(10)}px;
            background: linear-gradient(180deg, rgba(0,43,27,0.95), rgba(0,77,44,0.95));
            border: 1.5px solid rgba(255,255,255,0.1);
            box-shadow: 0 0 20px rgba(0,255,150,0.2);
            text-align: center;
            position: relative;
            color: #fff;
            margin: auto;
        ">
            <button id="result-close-btn"
                style="
                    position:absolute;
                    top:${this.px(8)}px;
                    right:${this.px(8)}px;
                    background:#ff4d4d;
                    color:#fff;
                    border:none;
                    border-radius:50%;
                    width:${this.px(26)}px;
                    height:${this.px(26)}px;
                    cursor:pointer;
                    font-size:${this.px(14)}px;
                    font-weight:bold;
                    box-shadow: 0 0 8px rgba(255,80,80,0.7);
                    display:flex;
                    align-items:center;
                    justify-content:center;
                ">
                ×
            </button>
    
            ${inner}
        </div>
        `;

        const closeBtn = document.getElementById(
            'result-close-btn'
        ) as HTMLButtonElement;
        closeBtn.onclick = () => {
            this.resultCt.style.display = 'none';
        };

        // ✅ Restart 버튼
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
            closeBtn.style.display = 'none';
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

        this.resultCt.style.display = 'flex';
    }

    private createRankingRow(entry: RankingEntry, isMe: boolean): string {
        const rank = entry.rank;
        const countryCode = (entry.countryCode || 'un').toLowerCase();
        const crown =
            rank === 1 ? '👑 ' : rank === 2 ? '🥈 ' : rank === 3 ? '🥉 ' : '';

        const flagImg = `<img src="https://flagcdn.com/w40/${countryCode}.png" 
                              style="width:${this.px(18)}px; 
                                     height:auto; 
                                     vertical-align:middle; 
                                     margin-right:${this.px(4)}px; 
                                     border-radius:2px;
                                     box-shadow: 0 0 3px rgba(0,0,0,0.3);" 
                              onerror="this.src='https://flagcdn.com/w40/un.png'"/>`;

        let bg = isMe ? 'rgba(0,255,255,0.15)' : 'transparent';
        let color = isMe ? '#00FFFF' : '#e6fff7';
        let fontWeight = isMe ? '700' : '500';
        let baseFontSize = 13;

        if (rank === 1) {
            color = '#ffd700';
            fontWeight = '800';
            baseFontSize = 14;
        } else if (rank === 2) {
            color = '#c0c0c0';
            fontWeight = '700';
            baseFontSize = 14;
        } else if (rank === 3) {
            color = '#cd7f32';
            fontWeight = '700';
            baseFontSize = 14;
        }

        return `
            <tr style="
                background:${bg};
                color:${color};
                font-weight:${fontWeight};
                font-size:${this.px(baseFontSize)}px;
                border-bottom: 1px solid rgba(255,255,255,0.04);
            ">
                <td style="padding:${this.px(6)}px ${this.px(
            4
        )}px; text-align:center;">${rank}</td>
                <td style="padding:${this.px(6)}px ${this.px(4)}px;">
                    ${flagImg}${crown}${entry.username}
                </td>
                <td style="padding:${this.px(6)}px ${this.px(
            4
        )}px; text-align:right; font-family: 'SF Mono', Consolas, monospace; font-size:${this.px(
            baseFontSize - 1
        )}px;">
                    ${entry.total_score.toLocaleString()}
                </td>
            </tr>
        `;
    }
}
