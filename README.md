<h1 align="center">
  <img src="resources/build/icon.png" alt="Shark" width="64" valign="middle" /> Shark
</h1>

<p align="center">
  AI 코딩 도우미(Claude Code 등)와 채팅하면서 코드를 만드는 맥 앱이에요.<br/>
  오픈소스 앱 <a href="https://github.com/stablyai/orca">Orca</a>(MIT 라이선스)를 내 입맛대로 고쳐서 만들었어요.
</p>

## 설치하기 (맥)

> **필요한 것**: M1·M2·M3·M4 같은 **M 칩 맥**. 인텔 맥에서는 안 돌아가요.
> AI와 채팅하려면 [Claude Code](https://docs.claude.com/en/docs/claude-code/overview) 같은 AI 코딩 도구도 먼저 깔려 있어야 해요.

1. 이 저장소의 [**Releases**](https://github.com/mjfingers2/shark/releases/latest) 페이지에서 `Shark-mac-arm64.zip` 을 내려받아요.
2. 내려받은 zip 을 더블클릭해서 압축을 풀어요. `Shark` 앱이 나와요.
3. `Shark` 를 Finder 의 **응용 프로그램** 폴더로 끌어다 놓아요.
4. **터미널**을 열고 아래 한 줄을 붙여 넣은 뒤 Enter 를 눌러요.

   ```sh
   xattr -dr com.apple.quarantine /Applications/Shark.app
   ```

   Shark 는 애플 인증을 받지 않은 앱이라, 이 줄을 안 넣으면 "손상되었기 때문에 열 수 없습니다" 라는 창이 떠요.
   이 명령은 "인터넷에서 받은 앱" 표시만 지워 주는 거예요.

5. 응용 프로그램 폴더에서 **Shark** 를 더블클릭해서 켜요.

### 처음 켜면

"어느 폴더에서 작업할까요?" 창이 떠요. 최근 폴더를 고르거나 **다른 폴더 열기**로 작업할 폴더를 고르면 돼요.
그다음 채팅창에 하고 싶은 일을 적으면 AI가 그 폴더에서 일을 시작해요.

### 새 버전으로 바꾸기

Shark 는 스스로 업데이트하지 않아요. 새 버전이 나오면 Releases 에서 다시 받아 위 순서대로 덮어쓰면 돼요.

## 아이패드·아이폰에서 쓰기

맥의 Shark 를 아이패드나 아이폰에서도 볼 수 있어요. 방법은 두 가지이고, 편한 쪽을 고르면 돼요.
어느 쪽이든 **맥이 켜져 있고 Shark 가 실행 중**이어야 하고, 맥과 기기가 **같은 와이파이**에 있어야 해요.

| | ① 웹 앱 (홈 화면에 추가) | ② Shark 모바일 앱 |
|---|---|---|
| 준비물 | Safari 만 있으면 돼요 | 맥에 Xcode, 애플 계정, 케이블 |
| 기한 | 없어요 | 무료 계정은 **7일마다 다시 깔기** (유료 개발자 계정은 1년) |
| 화면 | 맥의 Shark 화면 거의 그대로 | 폰에 맞춘 전용 화면 |

### ① 웹 앱으로 쓰기

1. 맥의 Shark 에서 **설정 → 원격 Shark 서버 → 이 Shark 서버 공유**로 가요.
2. **다른 기기**를 고르고, 주소에 맥의 와이파이 주소(보통 `192.168.` 로 시작)를 고른 뒤 **링크 만들기**를 눌러요.
3. 나온 **브라우저 링크**를 아이패드로 보내요. 같은 애플 계정이면 맥에서 복사해 아이패드에서 바로 붙여 넣을 수 있어요.
4. 아이패드 **Safari** 에서 링크를 열면 Shark 가 떠요.
5. Safari 의 **공유 단추 → 홈 화면에 추가**를 누르면 남색 Shark 아이콘이 생겨요.
6. 홈 화면의 Shark 를 처음 켜면 연결 링크를 묻는 칸이 나올 수 있어요. 3번의 링크를 한 번 더 붙여 넣으면 돼요.

맥을 껐다 켜서 와이파이 주소가 바뀌면 1~3번으로 새 링크를 만들어요.

### ② 모바일 앱으로 깔기 (개발자용)

[Xcode](https://apps.apple.com/app/xcode/id497799835) 에 애플 계정을 넣고(Xcode → Settings → Accounts), 기기에서 **설정 → 개인정보 보호 및 보안 → 개발자 모드**를 켠 뒤 케이블로 맥에 연결해요.

```sh
cd mobile
pnpm install
npx expo prebuild --platform ios
open ios/Shark.xcworkspace
```

Xcode 에서 할 것:

1. **Shark** 타깃 → **Signing & Capabilities** 에서 Team 에 내 계정을 고르고, Bundle Identifier 를 나만의 이름(예: `com.내이름.shark`)으로 바꿔요.
2. 무료 계정이면 같은 화면의 **Push Notifications** 를 지워요. 무료 계정은 이 기능을 쓸 수 없어요. 푸시 알림은 원래 Orca 서버를 거치므로 Shark 에서는 어차피 오지 않아요.
3. 위쪽에서 내 기기를 고르고 ▶ 를 눌러요.
4. 기기의 **설정 → 일반 → VPN 및 기기 관리**에서 내 계정을 **신뢰**하고 앱을 켜요.

앱이 켜지면 **Pair desktop** 을 누르고, 맥의 Shark **설정 → 모바일**에 뜬 QR 코드를 비추면 연결돼요.
무료 계정으로 깐 앱은 7일 뒤에 안 켜져요. 그러면 기기를 다시 연결하고 ▶ 를 한 번 더 누르면 돼요.

## Orca 에서 바뀐 것

- 이름·아이콘·남색 테마를 Shark 로
- 켜면 작업할 폴더를 먼저 물어봄
- 원클릭으로 새 프로젝트·새 세션 시작, 첫 메시지로 세션 제목 자동 짓기
- 웹 서버를 켜면 채팅 옆에 미리보기가 자동으로 열림 (설정에서 끌 수 있음)
- 미리보기에서 요소를 바로 지적하기, 콘솔 에러를 AI에게 보내기, 폰 화면 크기로 보기
- 한 번에 커밋+푸시, AI 작업이 끝나면 알림, 하루 지난 빈 세션 자동 정리
- 위 기능들을 창 맨 위 버튼으로 바로 쓰기
- 원본 Orca 로 자동 업데이트되지 않게 막음
- 모바일 앱도 Shark 이름·로고·남색 테마로, Orca 앱으로 "업데이트"되지 않게 막음
- 브라우저 화면을 아이패드·아이폰 홈 화면에 Shark 앱 아이콘으로 추가할 수 있게 함

## 직접 만들어 보기 (개발자용)

[Node.js](https://nodejs.org), [pnpm](https://pnpm.io), Xcode Command Line Tools(`xcode-select --install`) 가 필요해요.

```sh
git clone https://github.com/mjfingers2/shark.git
cd shark
pnpm install
pnpm -C mobile install --frozen-lockfile
pnpm dev          # 개발용으로 켜기
```

맥 앱으로 굽기(M 칩용만):

```sh
pnpm run build:desktop
pnpm run build:computer-macos
node config/scripts/native-build/macos/build-keyboard-layout-macos.mjs --single-arch
node config/scripts/native-build/macos/build-process-footprint-macos.mjs --single-arch
node config/scripts/native-build/macos/build-notification-status-macos.mjs --single-arch
pnpm run ensure:electron-runtime
pnpm exec electron-builder --config config/electron-builder.config.cjs --mac --arm64 --dir
codesign --force --deep --sign - dist/mac-arm64/Shark.app
```

`dist/mac-arm64/Shark.app` 이 만들어져요.

## 라이선스

[MIT](LICENSE). 원본 Orca 는 Lovecast Inc. 가 만들었고, 원래 설명은 [docs/readme/README.orca.md](docs/readme/README.orca.md) 에 남겨 두었어요.
