/**
 * Play 화면의 View
 * Matter.js의 물린엔진과 연동해서
 * CreateJS 객체를 동기화 처리
 */
import Matter from 'matter-js';
import ContainerX from '../../core/ContainerX';
import EVT from '../../EVT';
import { G_EVT, EVT_HUB } from '../../events/EVT_HUB';
import { EVT_HUB_SAFE } from '../../events/SafeEventHub';
import { Score } from './Score';
import { SoundMgr } from '../../manager/SoundMgr';
import { NextCh } from './NextCh';
import { ScoreLine } from './ScoreLine';
import { UIScale, SAFE_WIDTH, SAFE_HEIGHT } from '../../ui/UIScale';
interface MyBody extends Matter.Body {
    typeX: number;
}

interface Compos {
    body?: Matter.Body;
    mc?: createjs.MovieClip;
}

// 생성되어야 하는 bead의 순차적 반지름
const size = [15, 30, 46, 56, 66, 80, 90, 106, 116, 136, 160];

class View extends ContainerX {
    // Matter.js 엔진 객체
    private engine: Matter.Engine;

    // 생성된 bead의 숫자를 기록하는 변수
    private cnt: number = 0;

    // 중력값. 클수록 낙하속도가 증가
    private gravity: number = 2.5;

    // Matter.js의 객체와 CreateJS 객체를 매칭해서 보관하는 객체
    private arr_compos: { [key: string]: Compos };

    // 게임 진행 여부
    // false가 되면 게임이 멈춘다.
    private bActive: boolean;

    // 터치 가능 여부
    private bClick: boolean;

    // 기준선이 움직일수 있는 최소 최대 범위값
    private move_min_x: number;
    private move_max_x: number;

    // 낙하 대상
    private drop_target: createjs.MovieClip;
    // 낙하 기준선
    private base_line: createjs.MovieClip;

    // bead가 add 되는 컨테이너
    private beadCt: ContainerX;

    // 구슬 순서
    private bead_order: Array<number>;

    // 현재 로그인 ID
    private currentId: string | null = null;

    private currentUserId: string | null = null;
    private currentUserName: string | null = null;
    // 💡 PLAY 클래스에서 세션 ID를 받아서 저장할 변수
    private currentGameSessionId: string | null = null;

    private gameOverLine: number = 480;

    // 게임오버라인 점멸
    private readonly WARNING_LINE_OFFSET: number = 60;
    private warningVisual: createjs.Shape;

    private gameOverLineVisual: createjs.MovieClip;

    private gameOverLineShape: createjs.Shape;

    // 💡 낙하 중인 구슬 관리
    private droppingBeads: Set<string> = new Set();
    public scoreDisplay: Score;

    // 💡 경고 타이머: 경고가 시작된 시간 (Date.now())을 저장
    private warningStartTime: number = 0;

    private hasMerged: boolean = false;

    private canMerged: boolean = false;

    // 💡 게임 오버 대기 시간 (밀리초)
    private readonly GAME_OVER_DELAY: number = 4000;

    // 💡 점수 테이블: 각 캐릭터 타입별 점수
    private readonly SCORE_TABLE: number[] = [
        1, 3, 6, 10, 15, 21, 28, 36, 45, 200, 500,
    ];

    private readonly SOUND_TABLE: string[] = [
        'pu_0', // type 0
        'pu_1', // type 1
        'pu_2', // type 2
        'pu_3', // type 3
        'pu_4', // type 4
        'beori', // type 5
        'nyangi', // type 6
        'tori', // type 7
        'dogi', // type 8
        'deumi', // type 9
        'clear', // type 10
    ];

    // 총 점수
    private totalScore: number = 0;

    // 오버라인 사운드 재생 boolean
    private isWarningSoundPlayed: boolean = false;

    // 경고 시각 효과용 타이머
    private startTime: number | null = null;

    // 다음 떨어질 타겟
    private nextCh: NextCh;

    private scoreLine: ScoreLine;

    private soundCache: Record<string, HTMLAudioElement> = {};

    private isWarningActive = false;

    private render?: Matter.Render;

    constructor() {
        super();

        (window as any).currentGameView = this;
        this.bActive = false;
        this.arr_compos = {};
        this.SOUND_TABLE.forEach((name) => {
            const audio = new Audio(`/assets/sounds/${name}.mp3`);
            audio.preload = 'auto';
            this.soundCache[name] = audio;
        });
        this.buildBeadOrder();
        this.buildBackgroundAndLayer();
        this.buildMatterEngine();
        this.buildWall();
        this.buildBaseLine();
        this.addEventListener('tick', this.onTick);
        this.buildGameOverLine();

        this.scoreDisplay = new Score();
        this.addChild(this.scoreDisplay);

        this.bClick = true;

        this.nextCh = new NextCh();
        this.addChild(this.nextCh);

        this.scoreLine = new ScoreLine();
        this.addChild(this.scoreLine);

        EVT_HUB_SAFE.on(G_EVT.DATA.DATA_SEND, this.handleLoginSuccess);

        EVT_HUB_SAFE.on(G_EVT.PLAY.MERGE_REQUEST, this.handleMergeRequest);

        EVT_HUB_SAFE.on(G_EVT.PLAY.TIME_OUT, (e) => {
            console.log('이벤트 발생임', e);
            this.handleGameOver(e.data);
        });

        Matter.Events.on(
            this.engine,
            'collisionStart',
            this.handleCollisionStart
        );
    }

    // private sessionStartedListener = (e: any) => {
    //     this.handleSessionStarted(e);
    // };

    // private handleSessionStarted(event: any): void {
    //     const { gameSessionId, userId, userName } = event.data;
    //     if (gameSessionId) {
    //         this.currentGameSessionId = gameSessionId;
    //     }

    //     if (userId) {
    //         this.currentUserId = userId;
    //     }

    //     if (userName) {
    //         this.currentUserName = userName;
    //     }
    // }

    private handleLoginSuccess = (event: any): void => {
        // ✅ event.data 자체가 userId 문자열이어야 함
        const userId = event.data;
        this.currentId = userId.userId;
    };

    public startGame(): void {
        this.totalScore = 0;
        this.bActive = true;

        if (this.drop_target && this.bead_order.length > 1) {
            // ✅ Safe Area 중앙
            const centerX = UIScale.safeToCanvasX(SAFE_WIDTH / 2);
            this.drop_target.x = centerX;
            this.base_line.x = centerX;
            this.drop_target.gotoAndStop(this.bead_order[0]);
            this.nextCh.showNext(this.bead_order[1]);
        }
    }

    public stopGame(): void {
        this.bActive = false;
    }

    private buildBeadOrder(): void {
        this.bead_order = [];
        for (let i = 0; i < 10; i++) {
            const rnd = (Math.random() * 5) >> 0;
            this.bead_order.push(rnd);
        }
    }

    private buildBackgroundAndLayer(): void {
        const bg = this.resource.getImage('bg');
        this.addChild(bg);

        this.beadCt = new ContainerX();
        this.addChild(this.beadCt);
    }

    // Matter 엔진 정의
    private buildMatterEngine(): void {
        // 물리 엔진 인스턴스 생성
        this.engine = Matter.Engine.create();
        // 중력값
        this.engine.world.gravity.y = this.gravity;

        // 렌더러 생성 및 설정
        document.body.style.backgroundColor = '#000';
        this.render = Matter.Render.create({
            canvas: document.getElementById('create_cvs') as HTMLCanvasElement,
            engine: this.engine,
            options: {
                width: 720,
                height: 1280,
                wireframes: true,
            },
        });
        // Matter.Render.run(this.render);
    }

    /**
     * bead 를 담는 벽을 생성한다.
     * 좌벽과 우벽의 좌표로  기준선이 움직일수 있는 최소 최대 범위값을 설정.
     */
    private buildWall(): void {
        const basketWidth = 540;
        const basketHeight = 700;
        const wallThickness = 40;

        // ✅ 중앙 하단 기준 (세로 위치 수정)
        const centerX = UIScale.safeToCanvasX(SAFE_WIDTH / 2);

        // ✅ Safe Area 하단에서 130px 위 (원본 기준)
        const bottomY = UIScale.safeToCanvasY(SAFE_HEIGHT - 130);

        this.move_min_x = centerX - basketWidth / 2 + wallThickness / 2;
        this.move_max_x = centerX + basketWidth / 2 - wallThickness / 2;

        const ground = Matter.Bodies.rectangle(
            centerX,
            bottomY,
            basketWidth,
            wallThickness,
            {
                isStatic: true,
                label: 'ground',
                render: { fillStyle: '#8B4513' },
            }
        );

        const leftWall = Matter.Bodies.rectangle(
            centerX - basketWidth / 2,
            bottomY - basketHeight / 2,
            wallThickness,
            basketHeight,
            {
                isStatic: true,
                label: 'leftWall',
                render: { fillStyle: '#8B4513' },
            }
        );

        const rightWall = Matter.Bodies.rectangle(
            centerX + basketWidth / 2,
            bottomY - basketHeight / 2,
            wallThickness,
            basketHeight,
            {
                isStatic: true,
                label: 'rightWall',
                render: { fillStyle: '#8B4513' },
            }
        );

        Matter.World.add(this.engine.world, [ground, leftWall, rightWall]);
    }

    private buildBaseLine(): void {
        this.base_line = new createjs.MovieClip();
        const shape = new createjs.Shape();
        shape.graphics.beginStroke('rgba(255,0,0,1)');
        shape.graphics.moveTo(0, 400).lineTo(0, 1070);
        shape.graphics.endStroke();

        this.base_line.y = 60;
        this.base_line.addChild(shape);
        this.addChild(this.base_line);

        this.drop_target = this.resource.getLibrary('circle_2', 'bundle');
        this.drop_target.y = 460;
        this.addChild(this.drop_target);
    }

    private buildGameOverLine(): void {
        const centerX = UIScale.safeToCanvasX(SAFE_WIDTH / 2);

        this.gameOverLineVisual = new createjs.MovieClip();
        this.gameOverLineShape = new createjs.Shape();
        this.gameOverLineShape.visible = false;
        this.gameOverLineShape.graphics
            .setStrokeStyle(3)
            .beginStroke('rgba(255, 0, 0, 0.7)')
            .setStrokeDash([10])
            .moveTo(centerX - 332, 0)
            .lineTo(centerX + 332, 0);

        // ✅ Safe Area Y 좌표 변환
        this.gameOverLineVisual.y = UIScale.safeToCanvasY(this.gameOverLine);
        this.gameOverLineVisual.addChild(this.gameOverLineShape);
        this.addChild(this.gameOverLineVisual);

        this.warningVisual = new createjs.Shape();
        this.warningVisual.graphics
            .setStrokeStyle(2)
            .beginStroke('rgba(255, 255, 0, 0.6)')
            .setStrokeDash([5])
            .moveTo(centerX - 240, 0)
            .lineTo(centerX + 240, 0);
        this.warningVisual.y = UIScale.safeToCanvasY(
            this.gameOverLine + this.WARNING_LINE_OFFSET
        );
        this.addChild(this.warningVisual);
        this.gameOverLineVisual.alpha = 0;
    }

    // 다음 크기 원 생성
    private addNextPhase($type: number, $px: number, $py: number): void {
        if ($type < 10) {
            const circle = Matter.Bodies.circle($px, $py, size[$type + 1], {
                label: `Bead_${this.cnt}`,
            }) as unknown as MyBody;

            circle.typeX = $type + 1;

            // 튕기는 속도 설정 (랜덤한 방향과 크기 y값은 항상 위로)
            const velocityX = (Math.random() - 0.5) * 2; // -5 ~ 5
            const velocityY = -Math.random() * 2;

            Matter.Body.setVelocity(circle, {
                x: velocityX,
                y: velocityY,
            });

            this.cnt++;
            Matter.World.add(this.engine.world, [circle]);

            const mc = this.resource.getLibrary(
                'circle_2',
                `bead_${circle.typeX}`
            );
            mc.x = circle.position.x;
            mc.y = circle.position.y;

            this.beadCt.addChild(mc);

            this.setFace(mc, 4, 2000);

            this.arr_compos[circle.label] = {};
            this.arr_compos[circle.label].body = circle;
            this.arr_compos[circle.label].mc = mc;
            this.checkGameOverLine(); // 새 구슬 생성 직후 즉시 체크
        }
    }

    /**
     * 얼굴 표정
     * @param $mc 대상
     * @param $frame 이동 프레임 번호
     * @param $time 0프레임으로 돌아오기 전까지 유지하는 시간 / -1이면 프레임 유지
     */
    private setFace(
        $mc: createjs.MovieClip,
        $frame: number,
        $time: number
    ): void {
        $mc.gotoAndStop($frame);
        if ($time === -1) return;
        this.time.setTimeoutX(() => {
            $mc.gotoAndStop(0);
        }, $time);
    }

    private addBead($x: number = 640): void {
        // 현재 구슬
        const type = this.bead_order[0];
        this.bead_order.shift();

        // 새로운 랜덤 과일 추가
        const rnd = (Math.random() * 5) >> 0;
        this.bead_order.push(rnd);

        // Matter 객체 생성
        const bead = Matter.Bodies.circle($x, 460, size[type], {
            label: `Bead_${this.cnt}`,
        }) as unknown as MyBody;

        Matter.Body.setMass(bead, type + 1);
        bead.typeX = type;
        this.cnt++;
        Matter.World.add(this.engine.world, [bead]);

        // 💡 중요: 생성 직후 '낙하 중' 상태로 등록
        this.droppingBeads.add(bead.label);

        // CreateJS 오브젝트 생성
        const mc = this.resource.getLibrary('circle_2', `bead_${type}`);
        mc.x = bead.position.x;
        mc.y = bead.position.y;

        //
        createjs.Tween.get(mc, { loop: -1, bounce: true }).to(
            { rotation: 720, rotationDir: 1 },
            1000
        );

        this.beadCt.addChild(mc);

        this.arr_compos[bead.label] = { body: bead, mc };

        // 💡 drop_target은 현재 조종할 과일
        this.drop_target.alpha = 0;
        this.drop_target.scaleX = 0.1;
        this.drop_target.scaleY = 0.1;

        this.drop_target.gotoAndStop(this.bead_order[0]);
        const child = this.drop_target.getChildAt(0) as createjs.MovieClip;
        child.gotoAndStop(0); // 다음 과일 우는 모습이 나오는 현상을 방지하기 위해 추가.
        // 트윈으로 다음 과일을 스케일 효과 적용하면서 나오게 한다.
        createjs.Tween.get(this.drop_target)
            .wait(500)
            .to({ scaleX: 1, scaleY: 1, alpha: 1 }, 500);

        // 💡 nextCh는 "다음 과일" (즉 bead_order[1])
        this.nextCh.showNext(this.bead_order[1]);
    }
    /**
     * 게임 Ticker
     * @param $e
     */
    private onTick = ($e: createjs.TickerEvent): void => {
        // createjs의 tick 이벤트에서 Matter 엔진 업데이트 및 MovieClip 위치 동기화

        if (this.bActive) {
            Matter.Engine.update(this.engine);

            for (const label in this.arr_compos) {
                const compos = this.arr_compos[label];
                const bead = compos.body as MyBody; // Matter.Body를 MyBody로 형변환

                // 1. 위치 동기화 (MovieClip 업데이트)
                compos.mc.x = compos.body.position.x;
                compos.mc.y = compos.body.position.y;
                compos.mc.rotation = compos.body.angle * (180 / Math.PI); // 회전값도 적용
            }

            // --- 🚨 [중요 수정] 충돌 감지 로직 개선 ---
            const pairs = this.engine.pairs.list;

            // 이번 프레임(tick)에서 이미 합쳐져서 제거된 구슬의 ID를 저장할 Set
            // 이걸 안 하면 A-B가 합쳐지고, B-C가 또 합쳐지는 "중복 합체" 버그로 점수가 뻥튀기 됨
            const removedBodies = new Set<string>();

            for (let i = 0; i < pairs.length; i++) {
                const pair = pairs[i];
                const { bodyA, bodyB, collision } = pair;

                // 이미 이번 틱에서 처리(삭제)된 구슬이면 건너뜀 (세 개 동시 충돌 방지)
                if (
                    removedBodies.has(bodyA.label) ||
                    removedBodies.has(bodyB.label)
                ) {
                    continue;
                }

                if (bodyA.circleRadius && bodyB.circleRadius) {
                    const typeA = (bodyA as unknown as MyBody).typeX;
                    const typeB = (bodyB as unknown as MyBody).typeX;

                    if (typeA === typeB) {
                        // --- 합체 로직 시작 ---

                        // 1. 제거 목록에 등록 (중복 처리 방지)
                        removedBodies.add(bodyA.label);
                        removedBodies.add(bodyB.label);
                        SoundMgr.handle.playSfx(this.SOUND_TABLE[typeA]);

                        // 2. 물리 세계 및 화면에서 제거
                        Matter.World.remove(this.engine.world, bodyA);
                        Matter.World.remove(this.engine.world, bodyB);

                        if (this.arr_compos[bodyA.label]?.mc) {
                            this.beadCt.removeChild(
                                this.arr_compos[bodyA.label].mc
                            );
                        }
                        if (this.arr_compos[bodyB.label]?.mc) {
                            this.beadCt.removeChild(
                                this.arr_compos[bodyB.label].mc
                            );
                        }

                        delete this.arr_compos[bodyA.label];
                        delete this.arr_compos[bodyB.label];

                        // 3. 점수 계산
                        this.totalScore += this.SCORE_TABLE[typeA] || 0;
                        EVT_HUB_SAFE.emit(G_EVT.DATA.SCORE_UPDATED, {
                            totalScore: this.totalScore,
                        });
                        this.scoreLine.activateFruit(typeA);

                        // 4. 다음 단계 구슬 생성 (중앙 좌표 계산)
                        let px: number, py: number;

                        // supports가 불안정할 때를 대비한 좌표 계산 로직
                        if (
                            collision.supports &&
                            collision.supports.length >= 1 &&
                            collision.supports[0]
                        ) {
                            // 충돌 지점이 있으면 그곳을 사용
                            if (
                                collision.supports.length >= 2 &&
                                collision.supports[1]
                            ) {
                                px =
                                    (collision.supports[0].x +
                                        collision.supports[1].x) /
                                    2;
                                py =
                                    (collision.supports[0].y +
                                        collision.supports[1].y) /
                                    2;
                            } else {
                                px = collision.supports[0].x;
                                py = collision.supports[0].y;
                            }
                        } else {
                            // 충돌 지점을 못 찾으면 두 물체의 중심점 사용
                            px = (bodyA.position.x + bodyB.position.x) / 2;
                            py = (bodyA.position.y + bodyB.position.y) / 2;
                        }

                        // 이펙트 및 다음 구슬 생성
                        if (0 <= typeA && typeA < 3) {
                            this.playCrashEffect(typeA, px, py, 1);
                        } else if (3 < typeA && typeA < 7) {
                            this.playCrashEffect(typeA, px, py, 2);
                        } else {
                            this.playCrashEffect(typeA, px, py, 3);
                        }

                        if (typeA === 5) {
                            EVT_HUB_SAFE.emit(G_EVT.PLAY.MERGE_RESET);
                        }
                        this.addNextPhase(typeA, px, py);
                        this.hasMerged = true;
                    }
                }
            }
            this.checkGameOverLine();
        }
    };
    private handleMergeRequest = () => {
        this.randomDoubleMerge();
    };
    //[Receive Controller] Controller 클래스에서 인터렉션에 따른 좌표 정보 수신
    public interaction_MOVE($x: number, $y: number): void {
        const type = this.bead_order[0];
        const space = size[type] / 2;
        const shrink = 10; // 줄일 값(px)

        const minX = this.move_min_x + space + shrink;
        const maxX = this.move_max_x - space - shrink;

        if ($x >= minX && $x <= maxX) {
            this.base_line.x = $x;
        } else if ($x < minX) {
            this.base_line.x = minX;
        } else {
            this.base_line.x = maxX;
        }

        this.drop_target.x = this.base_line.x;
    }

    private playCrashEffect(
        $type: number,
        $px: number,
        $py: number,
        $index: number
    ): void {
        const effect = this.resource.getLibrary(
            'circle_2',
            `effect_com${$index}`
        );

        effect.x = $px;
        effect.y = $py;
        effect.gotoAndPlay(1);
        effect.addEventListener('tick', () => {
            if (effect.currentFrame === effect.totalFrames - 1) {
                effect.stop();
                this.removeChild(effect);
            }
        });
        this.addChild(effect);
    }

    public interaction_DOWN($x: number, $y: number): void {}

    public interaction_UP($x: number, $y: number): void {
        if (this.bClick) {
            this.addBead(this.base_line.x);
            this.drop_target.gotoAndStop(this.bead_order[0]);
            SoundMgr.handle.playSound('beads');
            this.playCoolTime();
        }

        this.bClick = false;
    }

    private playCoolTime(): void {
        this.time.setTimeoutX(() => {
            this.bClick = true;
        }, 1000);
    }
    /**
     * 💡 게임 종료 처리
     */
    public async handleGameOver(mode: string) {
        if (!this.bActive) return;

        this.bActive = false;
        this.bClick = false;
        const finalScore = this.scoreDisplay.getFinalScore();
        EVT_HUB_SAFE.emit(G_EVT.PLAY.GAME_OVER, {
            finalScore: finalScore,
            mode,
        });

        // 모든 과일 우는 표정으로...
        for (const label in this.arr_compos) {
            const mc = this.arr_compos[label].mc;
            if (mc) {
                this.setFace(mc, 9, -1);
            }
        }

        // setTimeout(() => {
        //     console.log('asdio');
        // }, 2000);
    }
    /**
     * 💡 Matter.js 충돌 시작 이벤트 핸들러
     * 벽과의 충돌은 무시하고, 다른 구슬/바닥과의 충돌 시에만 '낙하 중' 목록에서 제거합니다.
     */
    private handleCollisionStart = (event: any): void => {
        event.pairs.forEach((pair: any) => {
            const { bodyA, bodyB } = pair;

            // 충돌한 물체가 벽인지 확인하는 함수
            const isWall = (body: Matter.Body) => {
                return body.label === 'leftWall' || body.label === 'rightWall';
            };

            let bodyToActivate: Matter.Body | null = null;

            // 1. bodyA가 낙하 중인 구슬이고, bodyB가 벽이 아닌 경우
            if (this.droppingBeads.has(bodyA.label) && !isWall(bodyB)) {
                bodyToActivate = bodyA;
            }

            // 2. bodyB가 낙하 중인 구슬이고, bodyA가 벽이 아닌 경우
            else if (this.droppingBeads.has(bodyB.label) && !isWall(bodyA)) {
                bodyToActivate = bodyB;
            }

            // 3. 활성화 대상이 결정되었으면 droppingBeads에서 제거
            if (bodyToActivate) {
                this.droppingBeads.delete(bodyToActivate.label);

                // 바닥 충돌시 표정 변경
                const label = bodyToActivate.label;
                const mc = this.arr_compos[label].mc;
                this.setFace(mc, 4, 1000);
            }

            // 4. (예외 처리) 바닥(ground)과의 충돌은 무조건 검사 대상에 포함
            if (
                bodyA.label === 'ground' &&
                this.droppingBeads.has(bodyB.label)
            ) {
                this.droppingBeads.delete(bodyB.label);
            } else if (
                bodyB.label === 'ground' &&
                this.droppingBeads.has(bodyA.label)
            ) {
                this.droppingBeads.delete(bodyA.label);
            }
        });
    };

    /**
     * 💡 핵심 수정된 게임오버 체크 로직
     */
    private checkGameOverLine(): void {
        let beadOverLine: MyBody | null = null;
        let beadOverLabel: string | null = null;
        let detectedWarning = false;

        const warningLineY = this.gameOverLine + this.WARNING_LINE_OFFSET;

        for (const label in this.arr_compos) {
            if (this.droppingBeads.has(label)) continue;

            const compos = this.arr_compos[label];
            const bead = compos.body as MyBody;

            const beadRadius = bead.circleRadius || size[bead.typeX];
            const beadTop = bead.position.y - beadRadius;

            // ⚠️ 경고 구간
            if (beadTop >= this.gameOverLine && beadTop <= warningLineY) {
                detectedWarning = true;
            }

            // ❌ 게임오버 라인 침범
            if (beadTop <= this.gameOverLine) {
                beadOverLine = bead;
                beadOverLabel = label;
                break;
            }
        }

        /* =========================
           ⚠️ WARNING 상태 처리
        ========================= */

        if ((detectedWarning || beadOverLine) && !this.isWarningActive) {
            this.isWarningActive = true;
        }

        if (!detectedWarning && !beadOverLine && this.isWarningActive) {
            this.isWarningActive = false;
        }

        /* =========================
           ❌ GAME OVER 카운트 처리
        ========================= */

        if (beadOverLine) {
            if (this.hasMerged) {
                console.log(`[GameOver] 합체 발생으로 인해 카운트 리셋`);
                this.warningStartTime = 0;
                this.hasMerged = false;
            }

            if (this.warningStartTime === 0) {
                this.warningStartTime = Date.now();
                console.warn(
                    `[GameOver] ${beadOverLabel} 라인 넘음, 카운트 시작`
                );
                EVT_HUB_SAFE.emit(G_EVT.PLAY.WARNING_ON);
            } else {
                const elapsedTime = Date.now() - this.warningStartTime;
                if (elapsedTime >= this.GAME_OVER_DELAY) {
                    this.handleGameOver('GAME_OVER');
                    return;
                }
            }
        } else {
            if (this.warningStartTime !== 0) {
                console.log(`[GameOver] 경고 해제`);
                EVT_HUB_SAFE.emit(G_EVT.PLAY.WARNING_OFF);
                this.warningStartTime = 0;
            }
            this.hasMerged = false;
        }

        /* =========================
           🎨 시각 효과 처리
        ========================= */

        if (this.gameOverLineVisual) {
            if (this.isWarningActive) {
                if (!this.isWarningSoundPlayed) {
                    SoundMgr.handle.playSound('warning');
                    this.isWarningSoundPlayed = true;
                }

                this.gameOverLineShape.visible = true;

                if (!this.startTime) this.startTime = Date.now();
                const elapsed = Date.now() - this.startTime;
                this.gameOverLineVisual.alpha =
                    Math.abs(Math.sin(elapsed / 200)) * 0.7;
            } else {
                this.startTime = null;
                this.isWarningSoundPlayed = false;
                this.gameOverLineVisual.alpha = 0;
            }
        }
    }

    public randomDoubleMerge(): void {
        console.warn('[DEBUG] Attempting RANDOM double merge');

        // 1️⃣ 타입별로 구슬 묶기
        const typeMap = new Map<number, MyBody[]>();

        for (const label in this.arr_compos) {
            const body = this.arr_compos[label].body as MyBody;
            if (!typeMap.has(body.typeX)) {
                typeMap.set(body.typeX, []);
            }
            typeMap.get(body.typeX)!.push(body);
        }

        // 2️⃣ 2개 이상 있는 타입만 추리기
        const availableTypes = Array.from(typeMap.entries()).filter(
            ([, bodies]) => bodies.length >= 2
        );

        if (availableTypes.length === 0) {
            console.warn('[DEBUG] No mergeable pairs found');
            alert(
                '필드에 두 개 이상의 구슬이 있어야 합니다.\n최대한 많이 쌓고, 행운을 노려보세요!'
            );
            EVT_HUB_SAFE.emit(G_EVT.PLAY.MERGE_FAIL);
            return;
        }
        this.canMerged = true;
        // 3️⃣ 랜덤 타입 선택
        const [targetType, bodies] =
            availableTypes[Math.floor(Math.random() * availableTypes.length)];

        // 4️⃣ 랜덤 2개 선택
        const shuffled = [...bodies].sort(() => Math.random() - 0.5);
        const [bodyA, bodyB] = shuffled;

        // 5️⃣ 합체 좌표 (onTick과 동일)
        const avgX = (bodyA.position.x + bodyB.position.x) / 2;
        const avgY = (bodyA.position.y + bodyB.position.y) / 2;

        // 6️⃣ 실제 합체 처리
        const removedBodies = new Set<string>();
        this.processMergePair(bodyA, bodyB, removedBodies);
        EVT_HUB_SAFE.emit(G_EVT.PLAY.MERGE_SUCCESS);

        // 🔊 사운드
        SoundMgr.handle.playSfx(this.SOUND_TABLE[targetType]);

        // ⭐ 점수 라인 연출
        this.scoreLine.activateFruit(targetType);

        // 💥 이펙트 (onTick 기준 그대로)
        if (0 <= targetType && targetType < 3) {
            this.playCrashEffect(targetType, avgX, avgY, 1);
        } else if (3 < targetType && targetType < 7) {
            this.playCrashEffect(targetType, avgX, avgY, 2);
        } else {
            this.playCrashEffect(targetType, avgX, avgY, 3);
        }

        // 7️⃣ 다음 단계 구슬 생성
        this.addNextPhase(targetType, avgX, avgY);

        // 8️⃣ 점수 갱신 이벤트
        EVT_HUB_SAFE.emit(G_EVT.DATA.SCORE_UPDATED, {
            totalScore: this.totalScore,
        });

        // 9️⃣ 합체 플래그 (게임오버 라인 로직용)
        this.hasMerged = true;
    }

    /**
     * onTick 로직을 분리하여 재사용 가능한 단일 합체 처리 함수
     * (실제 onTick의 합체 로직을 이 함수로 옮겨야 합니다. 현재는 코드 구조를 모르므로 임시 처리)
     */
    /**
     * @param bodyA 합체할 첫 번째 바디
     * @param bodyB 합체할 두 번째 바디
     * @param removedBodies 현재 프레임에서 제거된 바디 레이블 목록 (중복 처리 방지용)
     */
    private processMergePair(
        bodyA: Matter.Body,
        bodyB: Matter.Body,
        removedBodies: Set<string>
    ): void {
        // 1. 💡 [중복 처리 방지 로직] 이미 제거된 구슬인지 확인
        if (removedBodies.has(bodyA.label) || removedBodies.has(bodyB.label)) {
            // 중복 합체 시도: 이 구슬 쌍은 건너뜁니다. (버그 방지 성공!)
            return;
        }

        const typeA = (bodyA as unknown as MyBody).typeX;
        const typeB = (bodyB as unknown as MyBody).typeX;

        // 타입이 다르면 합체 안함 (디버그 함수에서는 이미 같은 타입으로 보낼 것이므로 생략 가능하나, 안전을 위해 남김)
        if (typeA !== typeB) return;

        // 2. 제거 목록에 등록
        removedBodies.add(bodyA.label);
        removedBodies.add(bodyB.label);

        // 3. (기존 onTick 로직): 물리 세계, 화면에서 제거
        Matter.World.remove(this.engine.world, bodyA);
        Matter.World.remove(this.engine.world, bodyB);

        // (화면 제거 및 arr_compos 삭제... onTick 내부 코드 복사)
        if (this.arr_compos[bodyA.label]?.mc) {
            this.beadCt.removeChild(this.arr_compos[bodyA.label].mc);
        }
        if (this.arr_compos[bodyB.label]?.mc) {
            this.beadCt.removeChild(this.arr_compos[bodyB.label].mc);
        }
        delete this.arr_compos[bodyA.label];
        delete this.arr_compos[bodyB.label];

        // 4. (기존 onTick 로직): 점수 계산
        this.totalScore += this.SCORE_TABLE[typeA] || 0;
        // EVT_HUB_SAFE.emit은 debugTripleMerge 끝에서 한 번만 처리합니다.

        // 5. (기존 onTick 로직): 다음 단계 구슬 생성 (임시 좌표 사용)
        // 디버그 함수에서 좌표를 계산해 넘겨주는 것이 더 깔끔하므로, 이 부분은 debugTripleMerge로 옮깁니다.
        // this.addNextPhase(typeA, px, py); ❌ 여기서 생성하지 않습니다.
    }

    // public debugSpawnMaxPhase(): void {
    //     const targetType = 9; // 최종적으로 생성할 구슬의 Type

    //     // Type 11은 addNextPhase를 통해 생성되는 Type이므로,
    //     // Type 10이 합체되어 Type 11이 되었다고 가정하고 생성 로직을 재활용합니다.
    //     const creationType = 10; // addNextPhase에 전달할 인수는 10 (10 + 1 = 11)

    //     // 1. 구슬을 생성할 필드의 중앙 좌표 계산 (예시 값)
    //     // 실제 게임 환경에 맞춰 적절히 수정이 필요합니다.
    //     const fieldCenterX = 600; // 예: 필드 가로 중심
    //     const fieldCenterY = 500; // 예: 필드 상단 근처 (떨어지도록)

    //     console.warn(
    //         `[DEBUG] 강제 Type ${targetType} 구슬 생성 시도: (${fieldCenterX}, ${fieldCenterY})`
    //     );

    //     // 2. Type 11 생성 로직 (addNextPhase의 내용 재구성)
    //     // Type 11은 최종 단계이므로, Type 10의 합체 결과로 생성되는 과정을 모방합니다.

    //     // (addNextPhase의 if 문과 달리, 여기서는 강제로 생성합니다.)
    //     const circle = Matter.Bodies.circle(
    //         fieldCenterX,
    //         fieldCenterY,
    //         size[targetType],
    //         {
    //             label: `Bead_${this.cnt}`,
    //             // Type 11에 맞는 속성을 Matter.js 객체에 설정
    //         }
    //     ) as unknown as MyBody;

    //     // 최종 Type을 11로 설정
    //     circle.typeX = targetType;

    //     // 튕기는 속도 설정 (약간의 움직임 부여)
    //     const velocityX = (Math.random() - 0.5) * 2;
    //     const velocityY = -Math.random() * 2; // 위로 튕기기

    //     Matter.Body.setVelocity(circle, {
    //         x: velocityX,
    //         y: velocityY,
    //     });

    //     this.cnt++;
    //     Matter.World.add(this.engine.world, [circle]);

    //     // 3. 화면 MovieClip 생성 및 배치
    //     const mc = this.resource.getLibrary(
    //         'circle_2',
    //         `bead_${circle.typeX}` // bead_11 리소스를 사용
    //     );
    //     mc.x = circle.position.x;
    //     mc.y = circle.position.y;

    //     this.beadCt.addChild(mc);
    //     this.setFace(mc, 4, 2000);

    //     // 4. 동기화 목록에 추가
    //     this.arr_compos[circle.label] = {};
    //     this.arr_compos[circle.label].body = circle;
    //     this.arr_compos[circle.label].mc = mc;

    //     // 5. 게임 오버 라인 체크 (선택 사항)
    //     this.checkGameOverLine();
    // }

    public get getCanMerged() {
        return this.canMerged;
    }

    public get getbActive() {
        return this.bActive;
    }

    public dispose(): void {
        this.bActive = false;

        // 1. CreateJS Tick 제거 (참조가 같으므로 제거 성공)
        this.removeEventListener('tick', this.onTick);

        // 2. EVT_HUB_SAFE 리스너 제거
        // 'once'로 등록했더라도 이벤트 발생 전에 게임이 꺼지면 리스너가 남으므로 off 필수
        EVT_HUB_SAFE.off(G_EVT.DATA.DATA_SEND, this.handleLoginSuccess);
        // EVT_HUB_SAFE.off(G_EVT.PLAY.SESSION_STARTED);
        EVT_HUB_SAFE.off(G_EVT.PLAY.MERGE_REQUEST, this.handleMergeRequest);

        // 3. Matter.js 리스너 및 엔진 정리
        if (this.engine) {
            Matter.Events.off(
                this.engine,
                'collisionStart',
                this.handleCollisionStart
            );
            Matter.World.clear(this.engine.world, false);
            Matter.Engine.clear(this.engine);
        }

        // 4. 전역 변수 해제
        if ((window as any).currentGameView === this) {
            (window as any).currentGameView = null;
        }

        // 5. 자식 객체 모두 제거
        this.removeAllChildren();
    }
}

export default View;
