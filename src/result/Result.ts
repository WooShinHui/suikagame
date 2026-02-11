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
        // 결과 컨테이너
        this.resultCt = document.createElement('div');
        this.resultCt.id = 'result-container';
        Object.assign(this.resultCt.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.9)',
            color: 'white',
            display: 'none',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '0',
            zIndex: '1000',
            fontFamily: 'Arial, sans-serif',
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
        EVT_HUB_SAFE.on(G_EVT.PLAY.SHOW_RESULT, this._onShowResult); // <-- 여기 수정!
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

        // 이벤트 허브 해제
        EVT_HUB_SAFE.off(G_EVT.PLAY.SESSION_STARTED, this._onSessionStarted);
        EVT_HUB_SAFE.off(G_EVT.PLAY.GAME_OVER, this._onGameOver);
        EVT_HUB_SAFE.off(G_EVT.PLAY.SHOW_RESULT, this._onShowResult);
        EVT_HUB_SAFE.off(G_EVT.DATA.SCORE_UPDATED, this._onScoreUpdated);

        // 윈도우 이벤트 해제
        window.removeEventListener('resize', this._onResize);

        // DOM 제거 (선택 사항)
        if (this.resultCt && this.resultCt.parentElement) {
            this.resultCt.parentElement.removeChild(this.resultCt);
        }
    }
    // ✅ 반응형 픽셀 계산 (화면 너비 기준)
    private px(baseSize: number): number {
        const sw = window.innerWidth;
        const baseWidth = 720; // 기준 너비 (Safe Area)
        return Math.max(10, (baseSize * sw) / baseWidth);
    }

    private async handleGameOver(event: any): Promise<void> {
        const evData = event.data || {};

        console.log('🎮 handleGameOver 실행');
        console.log('  - 이벤트 데이터:', evData);
        console.log('  - 현재 userId:', this.currentUserId);

        if (typeof evData.finalScore === 'number') {
            this.finalScore = evData.finalScore;
        }

        console.log('  - 최종 점수:', this.finalScore);

        console.log('📤 REQUEST_COLLISION_SAVE 이벤트 발행');
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
        if (this.isShowing) {
            console.log('⚠️ 이미 결과 표시 중 - 무시');
            return;
        }
        this.isShowing = true;

        const isRankingOnly = type === 'START';

        console.log('📊 showResult 시작:', { type, event });

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
        this.resultCt.innerHTML =
            '<h2 style="color: white;">랭킹을 불러오는 중...</h2>';

        try {
            console.log('📡 Firebase 랭킹 조회 시작...');
            const data = await API_CONNECTOR.getRankingData(
                this.currentUserId || 'guest'
            );

            console.log('✅ 랭킹 데이터 수신:', data);

            this.displayRanking(
                data.topRankings || [],
                data.myRanking || null,
                this.previousHighScore || 0,
                type
            );
        } catch (err) {
            console.error('❌ 랭킹 로드 에러:', err);
            this.resultCt.innerHTML = `<p style="color: red;">랭킹 로드 실패: ${err.message}</p>`;
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
        console.log('🎨 displayRanking 실행:', {
            topRankings: topRankings.length,
            myRanking,
            previousScore,
            type,
        });

        const myDisplayName = this.currentUsername || 'Guest Player';

        // ✅ 제목
        inner += `
            <div style="font-size: ${this.px(
                28
            )}px; font-weight: bold; color: #fff; margin-bottom: ${this.px(
            12
        )}px;">
                ${isRankingOnly ? '🌍 Global Ranking' : `${myDisplayName}`}
            </div>
        `;

        // ✅ GAME OVER UI
        if (isGameOver) {
            const currentScore = Number(this.finalScore);
            const isNewHighScore = currentScore > highScore;
            const displayHighScore = Math.max(currentScore, highScore);

            inner += `
            <h2 style="
                color:${isNewHighScore ? '#ffd700' : '#ffffff'};
                font-size:${this.px(36)}px;
                margin-bottom:${this.px(12)}px;
                letter-spacing:1px;
                text-shadow:0 0 12px rgba(255, 251, 0, 0.6);
                font-weight:700;
            ">
                ${isNewHighScore ? '🏆 NEW HIGH SCORE!' : 'GAME OVER'}
            </h2>
    
            <div style="
                margin:0 auto ${this.px(15)}px auto;
                max-width:${this.px(450)}px;
                display:flex;
                justify-content:space-around;
                text-align:center;
                border-radius:${this.px(10)}px;
                padding:${this.px(12)}px;
                background:rgba(0,0,0,0.35);
                backdrop-filter: blur(8px);
                border:1px solid rgba(255,255,255,0.08);
            ">
                <div style="flex:1;">
                    <p style="font-size:${this.px(
                        16
                    )}px; color:#bbbbbb; margin:${this.px(
                4
            )}px 0; font-weight:600;">SCORE</p>
                    <p style="font-size:${this.px(
                        32
                    )}px; font-weight:700; margin:0;">${currentScore.toLocaleString()}</p>
                </div>
    
                <div style="flex:1; border-left:1px solid rgba(255,255,255,0.08);">
                    <p style="font-size:${this.px(
                        16
                    )}px; color:#bbbbbb; margin:${this.px(
                4
            )}px 0; font-weight:600;">BEST</p>
                    <p style="font-size:${this.px(
                        32
                    )}px; font-weight:700; margin:0; color:${
                isNewHighScore ? '#00ff88' : '#66ffcc'
            };">
                        ${displayHighScore.toLocaleString()}
                    </p>
                </div>
            </div>
            `;
        }

        // ✅ RANKING TABLE
        inner += `
        <h3 style="
            margin-top:${this.px(15)}px; 
            font-size:${this.px(24)}px; 
            color:#00ffcc;
            text-align:center;
            text-shadow:0 0 8px rgba(0,255,180,0.55);
        ">
            🌐 Top ${topRankings.length} Players
        </h3>
        
        <table style="
            width:100%;
            max-width:${this.px(700)}px;
            margin:${this.px(12)}px auto;
            border-collapse:collapse;
            text-align:left;
            font-size:${this.px(18)}px;
            border-radius:${this.px(8)}px;
            overflow:hidden;
            background:rgba(255,255,255,0.04);
            backdrop-filter:blur(6px);
            border:1px solid rgba(255,255,255,0.08);
            box-shadow:0 0 15px rgba(0,255,160,0.25);
        ">
        <thead>
        <tr style="background:rgba(0,120,90,0.7); color:#eafff8; letter-spacing:1px; font-weight:600;">
            <th style="padding:${this.px(8)}px; width:${this.px(
            55
        )}px; text-align:center;">Rank</th>
            <th style="padding:${this.px(8)}px;">Player</th>
            <th style="padding:${this.px(8)}px; width:${this.px(
            90
        )}px;">Score</th>
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
            #inner-box::-webkit-scrollbar { width: ${this.px(5)}px; }
            #inner-box::-webkit-scrollbar-track { background: rgba(0, 43, 27, 0.5); border-radius: ${this.px(
                4
            )}px; }
            #inner-box::-webkit-scrollbar-thumb { background: rgba(0, 255, 150, 0.3); border-radius: ${this.px(
                4
            )}px; }
            #inner-box::-webkit-scrollbar-thumb:hover { background: rgba(0, 255, 150, 0.6); }
        </style>
        <div id="inner-box" style="
            width: 90%;
            max-width: ${this.px(900)}px;
            max-height: 80%;
            overflow-y: auto;
            padding: ${this.px(18)}px;
            border-radius: ${this.px(12)}px;
            background: linear-gradient(180deg, #002b1b, #004d2c);
            border: 2px solid rgba(255,255,255,0.08);
            box-shadow: 0 0 25px rgba(0,255,150,0.25);
            text-align: center;
            position: relative;
            color: #fff;
            margin: auto;
        ">
            <button id="result-close-btn"
                style="
                    position:absolute;
                    top:${this.px(10)}px;
                    right:${this.px(10)}px;
                    background:#ff4d4d;
                    color:#fff;
                    border:none;
                    border-radius:50%;
                    width:${this.px(32)}px;
                    height:${this.px(32)}px;
                    cursor:pointer;
                    font-size:${this.px(16)}px;
                    font-weight:bold;
                    box-shadow: 0 0 10px rgba(255,80,80,0.8);
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
            bottom: `${this.px(60)}px`,
            left: '50%',
            transform: 'translateX(-50%)',
            width: `${this.px(120)}px`,
            height: `${this.px(120)}px`,
            background:
                'url("./assets/images/btn_re_s.png") no-repeat center center',
            backgroundSize: 'contain',
            border: 'none',
            cursor: 'pointer',
            filter: 'drop-shadow(0 0 10px #00ffaa)',
            transition: 'transform 0.15s',
            zIndex: '1010',
        });
        restartBtn.id = 'restart-action-btn';
        this.resultCt.appendChild(restartBtn);

        if (isGameOver) {
            closeBtn.style.display = 'none';
            restartBtn.onclick = () => {
                console.log('🔄 재시작 버튼 클릭');
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
        console.log('✅ 결과창 표시 완료');
    }

    private createRankingRow(entry: RankingEntry, isMe: boolean): string {
        const rank = entry.rank;
        // 국가 코드가 없으면 'un'(유엔)을 기본값으로 사용
        const countryCode = (entry.countryCode || 'un').toLowerCase();
        const crown = rank === 1 ? '👑 ' : '';

        // ✅ flagcdn 이미지 태그 생성
        // 40px 너비(w40)의 이미지를 가져오며, 텍스트와 높이를 맞추기 위해 스타일 조정
        const flagImg = `<img src="https://flagcdn.com/w40/${countryCode}.png" 
                              style="width:${this.px(30)}px; 
                                     height:auto; 
                                     vertical-align:middle; 
                                     margin-right:${this.px(6)}px; 

                                     box-shadow: 0 0 4px rgba(0,0,0,0.3);" 
                              onerror="this.src='https://flagcdn.com/w40/un.png'"/>`;

        let bg = isMe ? 'rgba(255,255,255,0.12)' : 'transparent';
        let color = isMe ? '#00FFFF' : '#e6fff7';
        let fontWeight = isMe ? '700' : 'normal';
        let baseFontSize = isMe ? 20 : 16;

        // 순위별 스타일 차별화
        if (rank === 1) {
            color = '#ffd700';
            fontWeight = '900';
            baseFontSize = 22;
        } else if (rank === 2) {
            color = '#c0c0c0';
            fontWeight = '800';
            baseFontSize = 20;
        } else if (rank === 3) {
            color = '#cd7f32';
            fontWeight = '800';
            baseFontSize = 18;
        }

        return `
            <tr style="
                background:${bg};
                color:${color};
                font-weight:${fontWeight};
                font-size:${this.px(baseFontSize)}px;
                border-bottom: 1px solid rgba(255,255,255,0.05);
            ">
                <td style="padding:${this.px(
                    10
                )}px; text-align:center;">${rank}</td>
                <td style="padding:${this.px(10)}px;">
                    ${flagImg} ${crown}${entry.username}
                </td>
                <td style="padding:${this.px(10)}px; font-family: monospace;">
                    ${entry.total_score.toLocaleString()}
                </td>
            </tr>
        `;
    }
}
