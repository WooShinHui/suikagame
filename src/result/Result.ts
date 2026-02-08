// Result.ts
import { EVT_HUB, G_EVT } from '../events/EVT_HUB';
import { EVT_HUB_SAFE } from '../events/SafeEventHub';
import { UIScale } from '../ui/UIScale';
import EVT from '../EVT';
import { API_CONNECTOR } from '../fetch/ApiConnector';

interface RankingEntry {
    rank: number;
    username: string;
    total_score: number; // 해당 유저의 최고 점수
    userId: string;
}

export class Result {
    private readonly SERVER_BASE_URL: string = 'https://suikagame.ddns.net';
    private readonly TEAM_KEY: string = 'guest_team_name';
    private readonly USER_KEY: string = 'guest_user_name';
    private readonly BEST_SCORE_KEY: string = 'highScore';

    private resultCt: HTMLDivElement;
    private inputOverlay: HTMLDivElement;
    private currentUserId: string | null = null; // session or logged-in id
    private currentGameSessionId: string | null = null;
    private finalScore: number = 0;
    private previousHighScore: number = 0;
    private isShowing: boolean = false;
    private isChecking: boolean = false;

    constructor() {
        const canvas = document.querySelector('canvas') as HTMLCanvasElement;
        const parent = canvas?.parentElement || document.body;

        // 결과 컨테이너
        this.resultCt = document.createElement('div');
        this.resultCt.id = 'result-container';
        Object.assign(this.resultCt.style, {
            position: 'absolute', // 부모 기준으로
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

        // 입력 오버레이 생성
        this.inputOverlay = document.createElement('div');
        this.inputOverlay.id = 'result-input-overlay';
        Object.assign(this.inputOverlay.style, {
            position: 'absolute', // 부모 기준으로
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.95)',
            color: 'white',
            display: 'none',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: '1001',
            fontFamily: 'Arial, sans-serif',
            boxSizing: 'border-box',
        });
        parent.appendChild(this.inputOverlay);

        // 1) 게임오버 이벤트
        EVT_HUB_SAFE.on(G_EVT.PLAY.GAME_OVER, (event: any) => {
            console.log(event);
            this.handlePreResultCheck(event);
        });

        // 2) 세션 시작
        EVT_HUB_SAFE.on(G_EVT.PLAY.SESSION_STARTED, (event: any) => {
            const data = event.data || {};
            this.currentUserId = data.userId;
        });

        // 3) 서버 결과 표시
        EVT_HUB_SAFE.on(G_EVT.PLAY.SHOW_RESULT, (event: any) => {
            this.currentUserId = event.data.userId;
            this.showResult(event, event.data.mode);
        });

        // 4) 점수 업데이트
        EVT_HUB_SAFE.on(G_EVT.DATA.SCORE_UPDATED, (event: any) => {
            const data = event.data || {};
            if (typeof data.totalScore === 'number')
                this.finalScore = data.totalScore;
            if (typeof data.previousHighScore === 'number')
                this.previousHighScore = data.previousHighScore;
        });

        // 리사이즈 대응 (canvas 크기 변경 시)
        const resizeHandler = () => {
            const rect = canvas.getBoundingClientRect();
            this.resultCt.style.width = `${rect.width}px`;
            this.resultCt.style.height = `${rect.height}px`;
            this.inputOverlay.style.width = `${rect.width}px`;
            this.inputOverlay.style.height = `${rect.height}px`;

            this.resultCt.style.top = `${canvas.offsetTop}px`;
            this.resultCt.style.left = `${canvas.offsetLeft}px`;
            this.inputOverlay.style.top = `${canvas.offsetTop}px`;
            this.inputOverlay.style.left = `${canvas.offsetLeft}px`;
        };

        window.addEventListener('resize', resizeHandler);
        resizeHandler(); // 초기 적용
    }

    // --- 1) GAME_OVER 처리: 이름 확인, 입력창 띄우기 또는 서버에 username 갱신 후 저장 요청 발생 ---
    private async handlePreResultCheck(event: any): Promise<void> {
        if (this.isChecking) {
            console.warn('[Result] 이미 점수 처리 중 — 중복 호출 무시');
            return;
        }
        this.isChecking = true;
        try {
            // 우선 event에서 finalScore, userId, gameSessionId 등을 가져옴 (View가 보냈을 것)
            const evData = event.data || {};
            const eventFinalScore = evData.finalScore;
            const eventUserId = evData.userId;
            const eventGameSessionId = evData.gameSessionId;

            // 우선 finalScore 저장 (View에서 보낸 값 우선)
            if (typeof eventFinalScore === 'number')
                this.finalScore = eventFinalScore;

            // 세션/유저 아이디는 우선순위로 저장
            // if (eventUserId) this.currentUserId = eventUserId;
            if (eventGameSessionId)
                this.currentGameSessionId = eventGameSessionId;

            // 로컬 스토리지에 이름이 있는지 확인
            const teamName = localStorage.getItem(this.TEAM_KEY);
            const userName = localStorage.getItem(this.USER_KEY);

            // case A: 이미 로컬스토리지에 팀/이름이 있다 -> 서버에 username 업데이트 후 저장 요청 발생
            if (teamName && userName) {
                const usernameForRanking = `${teamName}/${userName}`;

                // 1) 서버에 username 업데이트 (이 함수은 실패해도 다음 단계 진행되도록 처리)
                await this.updateUsernameOnServer(
                    this.currentUserId ||
                        this.currentGameSessionId ||
                        `guest_${Date.now()}`,
                    usernameForRanking
                );

                // 2) 서버에 점수 저장 요청을 보냄 (ApiConnector가 처리)
                EVT_HUB_SAFE.emit(G_EVT.PLAY.REQUEST_COLLISION_SAVE, {
                    finalScore: this.finalScore,
                    userId: this.currentUserId,
                    gameSessionId: this.currentGameSessionId,
                    username: usernameForRanking,
                });

                // 결과창은 ApiConnector가 서버 저장 후 SHOW_RESULT 이벤트로 띄움
                return;
            }

            // case B: 로컬에 이름이 없다 -> guest id 확보 후 입력폼 띄움
            if (!this.currentUserId) {
                // generate guest id for this session if not present
                this.currentUserId = 'guest_' + new Date().getTime();
            }

            this.showNameInput(this.currentUserId);
        } finally {
            this.isChecking = false;
        }
    }

    private async updateUsernameOnServer(
        userId: string | null,
        username: string
    ) {
        // 이미 ApiConnector에 구현해둔 메서드 호출!
        // apiConnector 인스턴스에 접근 가능하다고 가정
        API_CONNECTOR.updateRankingName(username);
    }
    // 입력창 표시 (사용자가 이름을 입력하면 서버에 username 업데이트하고 저장 요청 발생)
    private showNameInput(currentSessionId: string): void {
        const DESIGN_WIDTH = 1280;
        const DESIGN_HEIGHT = 800;
        const canvas = document.querySelector('canvas') as HTMLCanvasElement;

        const updateOverlaySize = () => {
            const canvas = document.querySelector('canvas');
            if (!canvas) return;

            const rect = canvas.getBoundingClientRect();

            Object.assign(this.inputOverlay.style, {
                left: `${rect.left}px`,
                top: `${rect.top}px`,
                width: `${rect.width}px`,
                height: `${rect.height}px`,
            });

            const box = this.inputOverlay.querySelector(
                '#input-box'
            ) as HTMLDivElement;

            if (box) {
                // 캔버스 기준 스케일 계산
                const scale = rect.width / DESIGN_WIDTH;

                Object.assign(box.style, {
                    width: `${DESIGN_WIDTH * 0.35}px`, // 디자인 기준
                    padding: `${DESIGN_WIDTH * 0.03}px`,
                    transform: `scale(${scale})`,
                    transformOrigin: 'center center',
                });
            }
        };

        // inputOverlay 기본 스타일
        Object.assign(this.inputOverlay.style, {
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'absolute',
            background: 'rgba(0,0,0,0.95)',
            zIndex: '1001',
        });
        document.body.appendChild(this.inputOverlay);

        const initialTeam = localStorage.getItem(this.TEAM_KEY) || '';
        const initialUser = localStorage.getItem(this.USER_KEY) || '';

        this.inputOverlay.innerHTML = `
            <div id="input-box" style="background: #222; border-radius: 10px; box-shadow: 0 0 20px rgba(0,0,0,0.5); text-align: left;">
                <h2 style="text-align: center; margin-bottom: 2em; color: #FFF;">팀/이름 등록 (최초 1회)</h2>
                <p style="color: #ccc; font-size: 0.9em; margin-bottom: 2em; text-align: center;">
                    등록 후 다음 게임부터는 자동으로 랭킹에 등록됩니다.
                </p>
                
                <label for="team-input" style="display: block; margin-bottom: 0.5em;">팀 이름</label>
                <input type="text" id="team-input" value="${initialTeam}" placeholder="팀 이름을 입력하세요" style="width: 93%; padding: 0.8em; margin-bottom: 1.5em; border: 1px solid #444; border-radius: 4px; background: #333; color: #FFF; font-size: 1em;">
                
                <label for="user-input" style="display: block; margin-bottom: 0.5em;">본인 이름</label>
                <input type="text" id="user-input" value="${initialUser}" placeholder="본인 이름을 입력하세요" style="width: 93%; padding: 0.8em; margin-bottom: 2em; border: 1px solid #444; border-radius: 4px; background: #333; color: #FFF; font-size: 1em;">
                
                <button id="register-btn" style="width: 100%; padding: 1em; border: none; border-radius: 4px; background: #007AFF; color: white; font-size: 1.1em; cursor: pointer; transition: background 0.2s;">등록하고 결과 보기</button>
            </div>
        `;

        updateOverlaySize(); // 초기 사이즈 적용

        const registerBtn = this.inputOverlay.querySelector(
            '#register-btn'
        ) as HTMLButtonElement;
        const teamInput = this.inputOverlay.querySelector(
            '#team-input'
        ) as HTMLInputElement;
        const userInput = this.inputOverlay.querySelector(
            '#user-input'
        ) as HTMLInputElement;

        registerBtn.onclick = async () => {
            const team = teamInput.value.trim();
            const user = userInput.value.trim();
            if (!team || !user) {
                alert('팀 이름과 본인 이름을 모두 입력해야 합니다.');
                return;
            }

            const usernameForRanking = `${team}/${user}`;
            localStorage.setItem(this.TEAM_KEY, team);
            localStorage.setItem(this.USER_KEY, user);
            this.inputOverlay.style.display = 'none';

            await this.updateUsernameOnServer(
                currentSessionId,
                usernameForRanking
            );

            EVT_HUB_SAFE.emit(G_EVT.PLAY.REQUEST_COLLISION_SAVE, {
                finalScore: this.finalScore,
                userId: currentSessionId,
                gameSessionId: this.currentGameSessionId,
                username: usernameForRanking,
            });
        };

        window.addEventListener('resize', updateOverlaySize);
    }

    // --- 2) 서버에서 SHOW_RESULT emit 해주면 실제 결과 UI를 그린다 ---
    //--------------------------------------------
    // SHOW RESULT
    //--------------------------------------------
    private async showResult(
        event: any,
        type: 'GAME_OVER' | 'START'
    ): Promise<void> {
        if (this.isShowing) return;
        this.isShowing = true;

        const isRankingOnly = type === 'START';

        // GAME OVER일 때만 점수 처리
        if (!isRankingOnly) {
            const eventData = event?.data || {};
            if (typeof eventData.finalScore === 'number') {
                this.finalScore = eventData.finalScore;
            }
            if (typeof eventData.previousHighScore === 'number') {
                this.previousHighScore = eventData.previousHighScore;
            }
        }

        this.resultCt.style.display = 'flex';
        this.resultCt.innerHTML = '<h2>랭킹을 불러오는 중...</h2>';

        try {
            const data = await API_CONNECTOR.getRankingData(
                this.currentUserId || 'guest'
            );

            const previousScore = event.data.previousHighScore;

            this.displayRanking(
                data.topRankings || [],
                data.myRanking || null,
                previousScore || 0,
                type
            );
        } catch (err) {
            console.error('랭킹 로드 에러:', err);
            this.resultCt.innerHTML = `<p>랭킹 로드 실패</p>`;
        } finally {
            this.isShowing = false;
        }
    }

    //--------------------------------------------
    // DISPLAY RANKING
    //--------------------------------------------
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

        // 유저 이름 표시
        const teamName = localStorage.getItem(this.TEAM_KEY);
        const userName = localStorage.getItem(this.USER_KEY);
        const myDisplayName =
            teamName && userName ? `${teamName}/${userName}` : 'Guest Player';

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
            전체 랭킹 (현재 참여 인원 : ${topRankings.length})
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

        let isMyRankShown = false;
        for (let i = 0; i < topRankings.length; i++) {
            const entry = topRankings[i];
            const isMe = String(entry.userId) === String(this.currentUserId);
            if (isMe) {
                entry.username = myDisplayName;
                isMyRankShown = true;
            }
            inner += this.createRankingRow(entry, isMe);
        }

        inner += `</tbody></table>`;

        // inner-box
        this.resultCt.innerHTML = `
        <style>
    /* 스크롤바 전체 너비 및 배경 */
    #inner-box::-webkit-scrollbar {
        width: 8px;
    }
    /* 스크롤바 트랙(바탕) */
    #inner-box::-webkit-scrollbar-track {
        background: rgba(0, 43, 27, 0.5);
        border-radius: 10px;
    }
    /* 스크롤바 막대(움직이는 부분) */
    #inner-box::-webkit-scrollbar-thumb {
        background: rgba(0, 255, 150, 0.3);
        border-radius: 10px;
        border: 2px solid transparent;
        background-clip: padding-box;
    }
    /* 마우스 올렸을 때 막대 색상 */
    #inner-box::-webkit-scrollbar-thumb:hover {
        background: rgba(0, 255, 150, 0.6);
    }
    /* Firefox용 설정 */
    #inner-box {
        scrollbar-width: thin;
        scrollbar-color: rgba(0, 255, 150, 0.3) rgba(0, 43, 27, 0.5);
    }
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
            <!-- 닫기 버튼 -->
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

        // --------------------------
        // Restart 버튼: inner-box 밖, 화면 하단 고정
        // --------------------------
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
            restartBtn.addEventListener('pointerdown', () => {
                restartBtn.style.backgroundImage =
                    'url("/assets/images/btn_re_n.png")';
            });
            restartBtn.addEventListener('pointerleave', () => {
                restartBtn.style.backgroundImage =
                    'url("/assets/images/btn_re_s.png")';
            });
            restartBtn.addEventListener('pointerup', () => {
                restartBtn.style.backgroundImage =
                    'url("/assets/images/btn_re_s.png")';
            });
            restartBtn.addEventListener('pointercancel', () => {
                restartBtn.style.backgroundImage =
                    'url("/assets/images/btn_re_s.png")';
            });
        } else if (isRankingOnly) {
            restartBtn.style.display = 'none';
        }

        // --------------------------
        // 반응형 처리
        // --------------------------
        const canvas: any = document.querySelector('canvas');
        const applyOverlaySize = () => {
            const rect = canvas.getBoundingClientRect();
            Object.assign(this.resultCt.style, {
                position: 'fixed', // absolute 대신 fixed를 쓰면 rect.top/left를 그대로 쓸 수 있습니다.
                width: `${rect.width}px`,
                height: `${rect.height}px`,
                top: `${rect.top}px`,
                left: `${rect.left}px`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: '1000',
            });

            const innerBox = this.resultCt.querySelector(
                '#inner-box'
            ) as HTMLDivElement;
            if (innerBox) {
                innerBox.style.width = `${rect.width * 0.9}px`;
                innerBox.style.maxHeight = `${rect.height * 0.8}px`;
                innerBox.style.padding = `${rect.height * 0.03}px`;
                innerBox.style.borderRadius = `${rect.height * 0.02}px`;

                if (closeBtn) {
                    closeBtn.style.width = `${rect.height * 0.05}px`;
                    closeBtn.style.height = `${rect.height * 0.05}px`;
                    closeBtn.style.top = `${rect.height * 0.02}px`;
                    closeBtn.style.right = `${rect.width * 0.02}px`;
                    closeBtn.style.fontSize = `${rect.height * 0.025}px`;
                }
                if (restartBtn) {
                    restartBtn.style.width = `${rect.height * 0.09}px`;
                    restartBtn.style.height = `${rect.height * 0.09}px`;
                    restartBtn.style.bottom = `${rect.height * 0.03}px`;
                }
            }
        };
        applyOverlaySize();
        window.addEventListener('resize', applyOverlaySize);

        // 표시
        this.resultCt.style.display = 'flex';
    }

    private createRankingRow(entry: RankingEntry, isMe: boolean): string {
        const rank = entry.rank;
        const crown = rank === 1 ? '👑 ' : '';

        // 기본 스타일
        let bg = isMe ? 'rgba(255,255,255,0.12)' : 'transparent';
        let color = isMe ? '#00FFFF' : '#e6fff7';
        let fontWeight = isMe ? '700' : 'normal';
        let fontSize = isMe ? '1.25em' : '1em';

        // 🔥 1등 (금색 + 왕관)
        if (rank === 1) {
            color = '#ffd700'; // 금색
            fontWeight = '900';
            fontSize = '1.35em';
        }

        // 🔥 2등 (은색)
        else if (rank === 2) {
            color = '#c0c0c0'; // 은색
            fontWeight = '800';
            fontSize = '1.25em';
        }

        // 🔥 3등 (동색)
        else if (rank === 3) {
            color = '#cd7f32'; // 동색
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
                <td style="padding:12px 10px;">${crown}${entry.username}</td>
                <td style="padding:12px 10px;">${entry.total_score.toLocaleString()}</td>
            </tr>
        `;
    }
}
