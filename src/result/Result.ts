// Result.ts (Firebase 버전)
import { EVT_HUB, G_EVT } from '../events/EVT_HUB';
import { EVT_HUB_SAFE } from '../events/SafeEventHub';
import { UIScale } from '../ui/UIScale';
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
    private finalScore: number = 0;
    private previousHighScore: number = 0;
    private isShowing: boolean = false;

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

        // ✅ 이벤트 리스너
        EVT_HUB_SAFE.on(G_EVT.PLAY.GAME_OVER, (event: any) => {
            console.log('🎮 GAME_OVER 이벤트:', event);
            this.handleGameOver(event);
        });

        EVT_HUB_SAFE.on(G_EVT.PLAY.SHOW_RESULT, (event: any) => {
            console.log('📊 SHOW_RESULT 이벤트:', event);
            this.showResult(event, event.data.mode);
        });

        EVT_HUB_SAFE.on(G_EVT.DATA.SCORE_UPDATED, (event: any) => {
            const data = event.data || {};
            if (typeof data.totalScore === 'number')
                this.finalScore = data.totalScore;
        });

        // 리사이즈
        const resizeHandler = () => {
            const rect = canvas.getBoundingClientRect();
            this.resultCt.style.width = `${rect.width}px`;
            this.resultCt.style.height = `${rect.height}px`;
            this.resultCt.style.top = `${canvas.offsetTop}px`;
            this.resultCt.style.left = `${canvas.offsetLeft}px`;
        };

        window.addEventListener('resize', resizeHandler);
        resizeHandler();
    }

    // ✅ GAME_OVER 이벤트 처리
    private async handleGameOver(event: any): Promise<void> {
        const evData = event.data || {};

        console.log('🎮 handleGameOver 호출');
        console.log('🔹 이벤트 데이터:', evData);

        if (typeof evData.finalScore === 'number') {
            this.finalScore = evData.finalScore;
        }

        console.log('🔹 최종 점수:', this.finalScore);

        // ✅ Firebase에 점수 저장 요청
        console.log('🔹 REQUEST_COLLISION_SAVE 이벤트 발행');
        EVT_HUB_SAFE.emit(G_EVT.PLAY.REQUEST_COLLISION_SAVE, {
            finalScore: this.finalScore,
            userId: this.currentUserId,
            gameSessionId: null,
            username: null,
        });
    }

    // ✅ 결과 표시
    private async showResult(
        event: any,
        type: 'GAME_OVER' | 'START'
    ): Promise<void> {
        if (this.isShowing) return;
        this.isShowing = true;

        const isRankingOnly = type === 'START';

        console.log('🔹 showResult 시작:', { type, event });

        // GAME OVER일 때만 점수 처리
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
        this.resultCt.innerHTML = '<h2>랭킹을 불러오는 중...</h2>';

        try {
            // ✅ Firebase에서 랭킹 조회
            const data = await API_CONNECTOR.getRankingData(
                this.currentUserId || 'guest'
            );

            console.log('📊 랭킹 데이터:', data);

            this.displayRanking(
                data.topRankings || [],
                data.myRanking || null,
                this.previousHighScore || 0,
                type
            );
        } catch (err) {
            console.error('❌ 랭킹 로드 에러:', err);
            this.resultCt.innerHTML = `<p>랭킹 로드 실패: ${err.message}</p>`;
        } finally {
            this.isShowing = false;
        }
    }

    // ✅ 랭킹 표시
    private displayRanking(
        topRankings: RankingEntry[],
        myRanking: RankingEntry | null,
        previousScore: number | 0,
        type: 'GAME_OVER' | 'START'
    ): void {
        const isGameOver = type === 'GAME_OVER';
        const isRankingOnly = type === 'START';
        const highScore = previousScore;
        let inner = '';

        console.log('🔹 displayRanking:', {
            topRankings: topRankings.length,
            myRanking,
            previousScore,
            type,
        });

        // 유저 이름 표시
        const myDisplayName = myRanking?.username || 'Guest Player';

        inner += `
            <div style="font-size: 1.8em; font-weight: bold; color: #fff; margin-bottom: 20px;">
                ${isRankingOnly ? '전체 랭킹' : `${myDisplayName} 님의 기록`}
            </div>
        `;

        // GAME OVER UI
        if (isGameOver) {
            const currentScore = Number(this.finalScore);
            const isNewHighScore = currentScore > highScore;
            const displayHighScore = Math.max(currentScore, highScore);

            inner += `
            <h2 style="
                color:${isNewHighScore ? '#ffd700' : '#ffffff'};
                font-size:2.6em;
                margin-bottom:20px;
                letter-spacing:1px;
                text-shadow:0 0 12px rgba(255, 251, 0, 0.6);
                font-weight:700;
            ">
                ${isNewHighScore ? 'NEW HIGH SCORE!' : 'GAME OVER'}
            </h2>
    
            <div style="
                margin:0 auto 30px auto;
                max-width:600px;
                display:flex;
                justify-content:space-around;
                text-align:center;
                border-radius:14px;
                padding:20px;
                background:rgba(0,0,0,0.35);
                backdrop-filter: blur(8px);
                border:1px solid rgba(255,255,255,0.08);
            ">
                <div style="flex:1;">
                    <p style="font-size:1.1em; color:#bbbbbb; margin:5px 0; font-weight:600;">SCORE</p>
                    <p style="font-size:2.4em; font-weight:700; margin:0;">${currentScore.toLocaleString()}</p>
                </div>
    
                <div style="flex:1; border-left:1px solid rgba(255,255,255,0.08);">
                    <p style="font-size:1.1em; color:#bbbbbb; margin:5px 0; font-weight:600;">BEST</p>
                    <p style="font-size:2.4em; font-weight:700; margin:0; color:${
                        isNewHighScore ? '#00ff88' : '#66ffcc'
                    };">
                        ${displayHighScore.toLocaleString()}
                    </p>
                </div>
            </div>
            `;
        }

        // RANKING TABLE
        inner += `
        <h3 style="
            margin-top:30px; 
            font-size:1.8em; 
            color:#00ffcc;
            text-align:center;
            text-shadow:0 0 8px rgba(0,255,180,0.55);
        ">
            전체 랭킹 (참여 인원: ${topRankings.length})
        </h3>
        
        <table style="
            width:100%;
            max-width:1000px;
            margin:25px auto;
            border-collapse:collapse;
            text-align:left;
            font-size:1.15em;
            border-radius:12px;
            overflow:hidden;
            background:rgba(255,255,255,0.04);
            backdrop-filter:blur(6px);
            border:1px solid rgba(255,255,255,0.08);
            box-shadow:0 0 15px rgba(0,255,160,0.25);
        ">
        <thead>
        <tr style="background:rgba(0,120,90,0.7); color:#eafff8; letter-spacing:1px; font-weight:600;">
            <th style="padding:12px 10px; width:80px; text-align:center;">순위</th>
            <th style="padding:12px 10px;">이름</th>
            <th style="padding:12px 10px; width:150px;">점수</th>
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

        // inner-box
        this.resultCt.innerHTML = `
        <style>
    #inner-box::-webkit-scrollbar { width: 8px; }
    #inner-box::-webkit-scrollbar-track { background: rgba(0, 43, 27, 0.5); border-radius: 10px; }
    #inner-box::-webkit-scrollbar-thumb { background: rgba(0, 255, 150, 0.3); border-radius: 10px; }
    #inner-box::-webkit-scrollbar-thumb:hover { background: rgba(0, 255, 150, 0.6); }
</style>
        <div id="inner-box" style="
            width: 90%;
            max-width: 1200px;
            max-height: 80%;
            overflow-y: auto;
            padding: 30px;
            border-radius: 18px;
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
                    top:15px;
                    right:15px;
                    background:#ff4d4d;
                    color:#fff;
                    border:none;
                    border-radius:50%;
                    width:40px;
                    height:40px;
                    cursor:pointer;
                    font-size:20px;
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

        // Restart 버튼
        const restartBtn = document.createElement('button');
        Object.assign(restartBtn.style, {
            position: 'absolute',
            bottom: UIScale.px(30),
            left: '50%',
            transform: 'translateX(-50%)',
            width: UIScale.px(90),
            height: UIScale.px(90),
            background:
                'url("/assets/images/btn_re_s.png") no-repeat center center',
            backgroundSize: 'contain',
            border: 'none',
            cursor: 'pointer',
            filter: 'drop-shadow(0 0 10px #00ffaa)',
            transition: 'transform 0.15s',
            zIndex: '1010',
        });
        this.resultCt.appendChild(restartBtn);

        if (isGameOver) {
            closeBtn.style.display = 'none';
            restartBtn.onclick = () => {
                EVT_HUB_SAFE.emit(G_EVT.RE.START);
                this.resultCt.style.display = 'none';
            };
        } else if (isRankingOnly) {
            restartBtn.style.display = 'none';
        }

        this.resultCt.style.display = 'flex';
    }

    private createRankingRow(entry: RankingEntry, isMe: boolean): string {
        const rank = entry.rank;

        // ✅ 국가 코드 처리
        const countryCode = entry.countryCode || 'XX';
        const flagEmoji = this.getCountryFlag(countryCode);

        const crown = rank === 1 ? '👑 ' : '';

        let bg = isMe ? 'rgba(255,255,255,0.12)' : 'transparent';
        let color = isMe ? '#00FFFF' : '#e6fff7';
        let fontWeight = isMe ? '700' : 'normal';
        let fontSize = isMe ? '1.25em' : '1em';

        if (rank === 1) {
            color = '#ffd700';
            fontWeight = '900';
            fontSize = '1.35em';
        } else if (rank === 2) {
            color = '#c0c0c0';
            fontWeight = '800';
            fontSize = '1.25em';
        } else if (rank === 3) {
            color = '#cd7f32';
            fontWeight = '800';
            fontSize = '1.2em';
        }

        return `
            <tr style="
                background:${bg};
                color:${color};
                font-weight:${fontWeight};
                font-size:${fontSize};
            ">
                <td style="padding:12px 10px; text-align:center;">${rank}</td>
                <td style="padding:12px 10px;">${flagEmoji} ${crown}${
            entry.username
        }</td>
                <td style="padding:12px 10px;">${entry.total_score.toLocaleString()}</td>
            </tr>
        `;
    }

    private getCountryFlag(countryCode: string): string {
        if (!countryCode || countryCode === 'XX') return '🌍';

        const codePoints = countryCode
            .toUpperCase()
            .split('')
            .map((char) => 127397 + char.charCodeAt(0));
        return String.fromCodePoint(...codePoints);
    }
}
