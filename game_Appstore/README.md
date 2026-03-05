# 웹 프로젝트를 Capacitor를 사용하여 안드로이드 APK로 빌드하기

이 문서는 기존 웹 프로젝트를 [Capacitor](https://capacitorjs.com/)를 사용하여 안드로이드 애플리케이션(.apk)으로 빌드하는 전체 과정을 안내합니다.

---

## 1. 사전 준비

빌드를 시작하기 전에 개발 환경에 다음 소프트웨어가 설치 및 설정되어 있어야 합니다.

### 1-1. Node.js
- 프로젝트에서 요구하는 버전에 맞춰 설치합니다. (이 프로젝트의 경우 v22)

### 1-2. Java Development Kit (JDK)
- 안드로이드 빌드를 위한 필수 요소입니다. OpenJDK 17 버전을 권장합니다.
- **[OpenJDK 17 다운로드 (Adoptium)](https://adoptium.net/temurin/releases/?version=17&os=windows&arch=x64)**
- **중요:** 설치 시 `Add to PATH`와 `Set JAVA_HOME variable` 옵션을 반드시 체크하여 환경 변수를 자동으로 설정해야 합니다.

### 1-3. Android Studio
- 안드로이드 SDK 및 빌드 도구를 설치하는 가장 쉬운 방법입니다.
- **[Android Studio 공식 다운로드](https://developer.android.com/studio)**
- **중요:** 설치 후, Android Studio를 **최초 1회 실행**하여 SDK 등 필수 구성 요소 다운로드 및 초기 설정을 완료해야 합니다.

---

## 2. Capacitor 프로젝트 설정

기존 웹 프로젝트 폴더(`C:\Users\WooSinhui\Desktop\Test\2_read_up`) 내에서 다음 단계를 진행합니다.

### 2-1. Capacitor 라이브러리 설치
아래 명령어를 실행하여 Capacitor CLI와 핵심 라이브러리를 프로젝트의 개발 의존성(`devDependencies`)으로 추가합니다.
```bash
npm install @capacitor/cli @capacitor/core @capacitor/android --save-dev
```

### 2-2. Capacitor 프로젝트 초기화
앱 이름(`ReadUp`)과 고유 패키지 ID(`com.company.readup`)를 지정하여 Capacitor 프로젝트를 초기화합니다. 이 명령은 `capacitor.config.ts` 설정 파일을 생성합니다.
```bash
npx cap init ReadUp com.company.readup
```

### 2-3. Capacitor 설정 파일 수정
생성된 `capacitor.config.ts` 파일을 열고, 웹 프로젝트의 빌드 결과물이 저장될 폴더를 `webDir` 속성에 지정합니다. 우리 프로젝트는 `dist` 폴더를 사용합니다.

```typescript
// capacitor.config.ts

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.company.readup',
  appName: 'ReadUp',
  webDir: 'dist', // 이 부분을 'dist'로 설정합니다.
  server: {
    androidScheme: 'httpsf'
  }
};

export default config;
```

---

## 3. 웹 프로젝트 빌드 및 안드로이드 플랫폼 추가

### 3-1. 웹 프로젝트 빌드
먼저 웹 프로젝트를 빌드하여 `dist` 폴더를 생성합니다.
```bash
npm run build
```

### 3-2. 시작 파일 이름 변경 (중요)
Capacitor는 기본적으로 `index.html` 파일을 웹 앱의 시작점으로 인식합니다. 우리 프로젝트는 `read_up.html`로 빌드되므로, 파일 이름을 변경해야 합니다.
```bash
ren C:\Users\WooSinhui\Desktop\Test\2_read_up\dist\read_up.html index.html
```

### 3-3. 안드로이드 플랫폼 추가
이제 네이티브 안드로이드 프로젝트를 생성합니다. 이 명령은 `android`라는 폴더를 만들고 그 안에 완전한 Android Studio 프로젝트를 설정합니다.
```bash
npx cap add android
```

### 3-4. 웹 에셋 동기화
웹 프로젝트의 파일(HTML, JS, CSS, 이미지, 사운드 등)을 네이티브 안드로이드 프로젝트로 복사합니다. APK 파일 크기가 비정상적으로 작거나 앱에서 이미지 등이 보이지 않을 경우, 이 명령을 실행하면 문제가 해결됩니다.
```bash
npx cap sync
```

---

## 4. Android Studio에서 APK 빌드

### 4-1. Android Studio에서 프로젝트 열기
아래 명령어를 실행하면 Capacitor가 생성한 `android` 폴더를 Android Studio에서 자동으로 열어줍니다.
```bash
npx cap open android
```

### 4-2. APK 파일 생성
Android Studio가 열리고 Gradle 동기화가 완료되면, 상단 메뉴를 통해 APK를 생성합니다.

- **메뉴 경로:** **Build > Build Bundle(s) / APK(s) > Build APK(s)**

빌드가 성공적으로 완료되면 화면 우측 하단에 알림이 표시됩니다. 알림창의 **`locate`** 링크를 클릭하면 APK 파일이 저장된 폴더가 열립니다.

- **생성된 APK 파일 경로:**
  `C:\Users\WooSinhui\Desktop\Test\2_read_up\android\app\build\outputs\apk\debug\app-debug.apk`

이 `app-debug.apk` 파일을 안드로이드 기기에 설치하여 테스트할 수 있습니다.