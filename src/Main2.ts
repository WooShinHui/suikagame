import Matter from 'matter-js';

interface MyBody extends Matter.Body {
    typeX: number;
}

// Main 클래스를 정의
class Main {
    private engine: Matter.Engine;
    private world: Matter.World;

    private cnt: number = 0;
    constructor() {
        console.log('Main'); // 콘솔에 "Main" 출력 (디버깅용)
        this.onInit(); // 초기화 함수 호출
    }

    onInit() {
        // Matter.js의 주요 모듈을 별칭으로 정의
        const Engine = Matter.Engine, // 물리 엔진
            Render = Matter.Render, // 화면에 그리는 렌더러
            Runner = Matter.Runner, // 엔진을 실행시켜주는 루프
            Bodies = Matter.Bodies, // 기본 도형(박스, 원 등)을 만드는 유틸
            Composite = Matter.Composite, // 여러 물체를 하나로 묶는 구조
            Events = Matter.Events; // 이벤트

        // 물리 엔진 인스턴스 생성
        this.engine = Matter.Engine.create();

        // 렌더러 생성 및 설정
        const render = Render.create({
            element: document.body, // 캔버스를 DOM의 body에 추가
            engine: this.engine, // 사용할 엔진 지정
            options: {
                width: 1280, // 캔버스 너비
                height: 800, // 캔버스 높이
                wireframes: true, // 와이어프레임 모드 활성화 (디버깅용)
            },
        });

        // 왼쪽 벽 (x=0 부근, y=400, 폭=60, 높이=800)
        const leftWall = Bodies.rectangle(300, 600, 60, 400, {
            isStatic: true,
            label: 'leftWall',
        });

        // 오른쪽 벽 (x=1280, y=400, 폭=60, 높이=800)
        const rightWall = Bodies.rectangle(810, 600, 60, 400, {
            isStatic: true,
            label: 'rightWall',
        });

        // 바닥 생성
        const ground = Bodies.rectangle(400, 810, 810, 60, {
            isStatic: true,
            label: 'ground',
        }); // 바닥은 정적인 물체

        // 생성한 물체들을 물리 세계(엔진)에 추가
        Matter.World.add(this.engine.world, [ground, leftWall, rightWall]);

        // 렌더링 시작 (화면에 그리기 시작)
        Render.run(render); // 그래픽 라이브러리와 연동시에는 주석 해야 함.

        // 엔진을 실행시킬 루프(Runner) 생성
        const runner = Runner.create();

        // 충돌 감지
        Events.on(this.engine, 'collisionStart', (event) => {
            const pairs = event.pairs;

            pairs.forEach((pair) => {
                const { bodyA, bodyB, collision } = pair;
                // console.log('충돌 발생:', bodyA.label, '과', bodyB.label);

                // 둘 다 원(circle)인지 확인
                if (bodyA.circleRadius && bodyB.circleRadius) {
                    const typeA = (bodyA as unknown as MyBody).typeX;
                    const typeB = (bodyB as unknown as MyBody).typeX;

                    if (typeA === typeB) {
                        console.log('충돌');
                        // 지름이 같으면 둘 다 삭제
                        Matter.World.remove(this.engine.world, bodyA);
                        Matter.World.remove(this.engine.world, bodyB);

                        // 중앙 지점 계산 (두 지점의 평균)
                        let px: number;
                        let py: number;
                        if (collision.supports.length >= 2) {
                            const point1 = collision.supports[0];
                            const point2 = collision.supports[1];
                            px = (point1.x + point2.x) / 2;
                            py = (point1.y + point2.y) / 2;
                            console.log('중앙 충돌 좌표:', px, py);
                        } else {
                            const point = collision.supports[0];
                            px = point.x;
                            py = point.y;
                            console.log('충돌 좌표:', px, py);
                        }

                        if (typeA < 5) {
                            const size = [10, 20, 30, 60, 70];
                            const box = Matter.Bodies.circle(
                                px,
                                py,
                                size[typeA + 1],
                                {
                                    label: `Box${this.cnt}`,
                                }
                            ) as unknown as MyBody;

                            box.typeX = typeA + 1;

                            // 튕기는 속도 설정 (랜덤한 방향과 크기)
                            const velocityX = (Math.random() - 0.5) * 10; // -5 ~ 5
                            const velocityY = (Math.random() - 0.5) * 10; // -5 ~ 5
                            Matter.Body.setVelocity(box, {
                                x: velocityX,
                                y: velocityY,
                            });

                            this.cnt++;
                            Matter.World.add(this.engine.world, [box]);
                        }
                    }
                }
            });
        });

        // 엔진 실행 시작 (물리 시뮬레이션 시작)
        Runner.run(runner, this.engine);

        setInterval(() => {
            this.addBox();
        }, 1000);
    }

    private addBox(): void {
        const type = (Math.random() * 5) >> 0;

        const size = [10, 20, 40, 60, 70];

        console.log(type);

        const box = Matter.Bodies.circle(400, 200, size[type], {
            label: `Box${this.cnt}`,
        }) as unknown as MyBody;

        box.typeX = type;

        this.cnt++;

        // World.add(this.engine.world, [boxA, boxB, ground, leftWall, rightWall]);

        Matter.World.add(this.engine.world, [box]);
    }
}

// 브라우저에서 페이지가 모두 로드되면 Main 클래스 인스턴스를 생성
window.onload = async () => {
    new Main();
};
