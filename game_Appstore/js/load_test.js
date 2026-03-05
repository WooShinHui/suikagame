import http from 'k6/http';
import { sleep, check } from 'k6';
import cryptoJs from 'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js';

export let options = {
    stages: [
        { duration: '1m', target: 125 },
        { duration: '5m', target: 125 },
        { duration: '2m', target: 0 },
    ],
};

function generateHash(score, sessionId, secret) {
    const message = `${score}:${sessionId}:${secret}`;
    return cryptoJs.SHA256(message).toString();
}

export default function () {
    const BASE_URL = 'https://suikagame.ddns.net/api';
    const params = {
        headers: { 'Content-Type': 'application/json' },
        timeout: '10s', // 🚨 케어 1: 응답이 없으면 10초 후 강제 종료 (좀비 연결 방지)
    };

    const userId = `test_${__VU}`;
    const userName = `player_${__VU}`;

    // ----------------------------------------------------------------
    // 1. 세션 시작 (로그인)
    // ----------------------------------------------------------------
    let loginRes = http.post(
        `${BASE_URL}/start-session`,
        JSON.stringify({ userId, userName }),
        params
    );

    // 🚨 케어 2: 응답 검증 추가 (성공 시에만 다음 단계 진행)
    const loginOk = check(loginRes, {
        'login success': (r) => r.status === 200,
    });

    if (!loginOk) {
        console.error(`[VU ${__VU}] Login Failed: ${loginRes.status}`);
        sleep(5); // 실패 시 서버를 위해 잠시 쉬었다가 재시도
        return;
    }

    let sessionData;
    try {
        sessionData = JSON.parse(loginRes.body);
    } catch (e) {
        return; // 바디가 깨졌을 경우 중단
    }

    const { gameSessionId, sessionSecret } = sessionData;
    sleep(1);

    // ----------------------------------------------------------------
    // 🚨 케어 3: 한 번의 로그인으로 여러 번 게임 수행 (DB 부하 급감)
    // ----------------------------------------------------------------
    for (let i = 0; i < 5; i++) {
        // 2. 랭킹 조회
        const rankingPayload = cryptoJs.AES.encrypt(
            JSON.stringify({ u: userId }),
            sessionSecret
        ).toString();

        let rankRes = http.post(
            `${BASE_URL}/ranking`,
            JSON.stringify({ i: gameSessionId, data: rankingPayload }),
            params
        );

        check(rankRes, { 'ranking success': (r) => r.status === 200 });

        // 실제 게임 플레이 시간 (평균 10초~15초로 현실화)
        sleep(Math.random() * 5 + 10);

        // 3. 점수 제출
        const finalScore = Math.floor(Math.random() * 1501);
        const hash = generateHash(finalScore, gameSessionId, sessionSecret);

        const finalPayload = {
            s: finalScore,
            u: userId,
            h: hash,
            n: userName,
            t: Date.now(),
        };

        const encryptedFinal = cryptoJs.AES.encrypt(
            JSON.stringify(finalPayload),
            sessionSecret
        ).toString();

        let scoreRes = http.post(
            `${BASE_URL}/final-score`,
            JSON.stringify({ i: gameSessionId, data: encryptedFinal }),
            params
        );

        // 🚨 케어 4: 점수 제출 결과 모니터링
        const scoreOk = check(scoreRes, {
            'score update success': (r) => r.status === 200,
        });
        if (!scoreOk) {
            console.warn(`[VU ${__VU}] Score Submit Error: ${scoreRes.status}`);
        }

        sleep(2); // 게임 종료 후 정비 시간
    }

    // 루프가 끝나면 완전히 종료하기 전 랜덤하게 쉬어줌 (유저 이탈 구현)
    sleep(Math.random() * 5 + 2);
}
