# modujeju · 같이제주

아이·반려견·어르신과 함께하는 일행의 조건을 비교해 제주 장소를 찾는 모바일 우선 여행 웹앱입니다. 복수 동행, 4개 권역, 식당·카페·숙소·관광·체험·산책, 유형별 예산으로 탐색하고 장소를 저장해 날짜별 일정을 구성합니다.

현재 기본 실행은 **비짓제주 공개 페이지에서 직접 확인한 실제 장소의 정적 카탈로그**입니다. 식당·카페·숙소의 이름, 주소, 원문 태그와 관측 내용을 지역별로 탐색합니다. API가 실시간으로 갱신하는 서비스가 아니며, 확인하지 못한 요금·동행 조건·좌표·소요시간을 추정해 채우지 않습니다. 장소 카드의 카테고리 아이콘은 실제 업체 사진이 아닙니다.

2026-11-08 수집 자료는 **총 60곳: 식당 20곳, 카페 20곳, 숙소 20곳**입니다. 60개 고유 비짓제주 상세 URL과 실제 주소를 기록했습니다. 동·서·남·북 권역은 주소를 검토한 내부 탐색 분류이며, 지역별 같은 수를 맞추기 위해 실제 위치를 바꾸지 않습니다.

## 로컬 실행

Node.js 22.x와 npm을 사용합니다. `package-lock.json`을 기준으로 설치합니다.

```sh
npm ci
npm run dev
```

브라우저에서 `http://127.0.0.1:3000/ko`를 엽니다. 시작 페이지 `/`는 한국어 홈으로 이동합니다. `/en`, `/zh`, `/ja`도 지원합니다. 기본 공식 카탈로그는 Firebase 키 없이 실행할 수 있습니다. 원문에 번역이 없는 장소명·주소는 한국어 표기를 유지합니다.

환경 파일이 없으면 `.env.example`을 **새** `.env.local`로 복사합니다. 이미 있는 `.env.local`에는 서비스 계정이 들어 있을 수 있으므로 덮어쓰지 않습니다. 모든 서비스 활성화 플래그는 기본 `false`를 유지합니다.

`DEMO_MODE=false`와 `CLOUD_SERVICES_ENABLED=false`가 기본입니다. 클라우드를 껐다는 이유로 가상 장소를 표시하지 않습니다. 가상 장소 20개는 판정 예제를 위한 별도 자료이며 `DEMO_MODE=true`를 명시한 경우에만 표시합니다.

| 명령어 | 동작 |
|---|---|
| `npm run dev` | 127.0.0.1 개발 서버 |
| `npm run build` | 프로덕션용 로컬 빌드 |
| `npm run start` | 빌드 결과를 127.0.0.1에서 실행 |
| `npm run typecheck` | TypeScript 검사 |
| `npm run lint` | ESLint 검사 |
| `npm run test` | Vitest 단위 테스트 전체 실행 |
| `npm run test:watch` | Vitest 감시 모드 |

```sh
npm run typecheck
npm run lint
npm run test
npm run build
npm run start
```

`start` 전에 `build`가 필요합니다. 현재 `test:e2e`, `deploy`, 데이터 수집용 npm 스크립트는 없습니다. 단위 테스트의 외부 통신은 mock으로 대체하며 실제 Firebase나 비짓제주 계정으로 시험하지 않습니다. 클라우드 게이트가 켜진 환경에서는 빌드나 페이지 렌더링 중 데이터 읽기가 발생할 수 있으므로 승인되지 않은 서비스 게이트를 켠 상태로 실행하지 않습니다.

## 구현된 흐름

| 경로 | 기능 |
|---|---|
| `/[locale]` | 제주 히어로, 동행 복수 선택, 지역·유형별 진입 |
| `/[locale]/plan` | 나이·체중·유모차·실내 동반·무단차·보행·예산 설정 |
| `/[locale]/results` | 검색·필터·정렬, 카드/개요 지도 전환 |
| `/[locale]/places/[slug]` | 가격·동행 판정·항목별 근거, 저장·공유, 대안 장소 |
| `/[locale]/saved` | 이 브라우저에 저장한 장소 |
| `/[locale]/itinerary` | 1–5일 일정 배치·순서 변경·JSON 내보내기 |
| `/[locale]/about`, `/[locale]/privacy` | 서비스 소개와 현재 데이터 처리 안내 |
| `/[locale]/login` | 게이트가 켜졌을 때의 Google 로그인 흐름 |
| `/[locale]/admin` | 권한이 있는 운영자용 장소·신고 관리 화면 |

현재 지도는 로컬 SVG 개요입니다. 지도 SDK나 길찾기 API를 호출하지 않습니다. 좌표를 확인하지 못한 장소에 임의의 지도 핀을 놓지 않으며, 데모 장소에는 외부 길찾기를 제공하지 않습니다. 일정은 사용자가 고른 순서를 보관합니다. 실제 이동시간·실시간 영업·날씨·교통을 계산하지 않습니다.

저장·동행 조건·일정은 버전이 있는 `localStorage` 레코드 `modujeju.travel.v1`에 보관하며 최대 200곳을 저장합니다. 테마는 `modujeju.theme`, 언어는 URL에 반영됩니다. 브라우저 저장이 막힌 경우 현재 세션에서 계속 사용할 수 있으며 실패 안내를 표시합니다. 다른 기기 사이의 자동 동기화는 연결되어 있지 않습니다. Firebase 저장 함수는 준비되어 있으나 로컬 저장 버튼에서 자동으로 호출하지 않습니다.

## 판정과 데이터 원칙

`src/lib/types.ts`가 현재 구현의 타입 계약입니다. 기존 기획 문서에 나오는 일부 이름·계획과 다를 수 있습니다.

- 일행 판정은 `fit → conditional → unknown → notFit` 순서에서 가장 제한적인 결과를 따릅니다. 선호 점수나 가격으로 불가 조건을 상쇄하지 않습니다.
- `unknown`은 불가·무료·제한 없음과 다릅니다. 기본 결과에는 미확인을 포함하고 부적합은 제외합니다. 사용자가 표시 여부를 바꿀 수 있습니다.
- 체중 상한의 ‘미만’과 ‘이하’를 구분합니다. 상한 포함 여부가 미확인이면 이를 임의로 정하지 않습니다.
- 유모차, 실내 반려견 동반, 무단차, 30분 이내 보행을 실제 판정에 반영합니다. 어르신 선택 자체를 이동 제한으로 해석하지 않습니다.
- 예산은 유형별 기본 금액·단위 기준입니다. 카페 1잔, 숙소 객실 1박, 다른 유형 1인 요금을 구분하고 반려견 추가요금은 별도로 표시합니다. 예산을 지정하면 금액 미확인 장소는 예산 충족을 입증할 수 없어 제외됩니다.
- 운영 중단·폐업은 공개 탐색에서 제외합니다. 운영 60일, 정책 90일, 시설 365일의 확인 주기를 사용하고, 해당 주기를 90일 넘긴 필수 근거는 미확인으로 판정합니다.
- 데모 사실에는 확인일이 없습니다. 실제 장소는 항목별 출처·확인일과 원본 수정일·수집일을 구분합니다. `basicSourceCheckedAt`는 기본 페이지를 열람한 날짜이며, 동행 정책의 `verifiedAt`를 대신하지 않습니다.
- `sourceTags`는 원문 분류·검색용이고 `sourceObservations`는 출처 링크를 가진 관측 문장입니다. 가족·반려동물·무장애 같은 태그 하나로 입장 가능, 실내 동반, 무단차를 확정하지 않습니다. 명시된 정책도 적용 범위와 확인일을 함께 검토합니다.
- 요금·좌표·소요시간 미확인은 `null`입니다. 광고에 표시된 최저가를 특정 방문일의 숙박 요금으로 사용하지 않습니다. 사진 권리를 확인하지 않은 장소에는 `imageKind: "placeholder"` 카테고리 아이콘을 사용합니다.

비짓제주 어댑터는 기본 정보와 동행 조건을 분리합니다. 가져온 원본에 동행 조건이나 가격이 없으면 `unknown`/`null`을 유지하며, 사진은 권리 검토 전 후보 URL로만 보관합니다. 가져오기는 항상 `draft`를 만들고 자동 게시하거나 기존 검수 정보를 덮어쓰지 않습니다.

현재 화면의 기본 자료는 이 API 어댑터를 호출한 결과가 아니라 `research_notes/catalog/*.json`의 공개 UI 관측 기록입니다. `src/data/catalog.ts`가 이를 모으고 `src/lib/official-catalog.ts`가 공개 타입으로 변환합니다. 재수집·분류·검수 기준은 [데이터 수집·갱신 절차](docs/13_data_collection.md)에 기록합니다.

## 서비스 활성화와 환경 변수

별도 과금이 발생하거나 과금 여부가 불확실한 API·데이터베이스·저장소·배포 작업은 공급자, 목적, 예상 비용, 무료 한도와 초과 조건을 설명하고 명시적인 승인을 받은 뒤 진행합니다. 키를 가지고 있거나 플래그를 변경할 수 있다는 사실은 비용 승인을 뜻하지 않습니다.

| 변수 | 역할 / 기본값 |
|---|---|
| `DEMO_MODE` | 가상 예제 자료 선택, `false`; `true`일 때만 가상 장소 표시 |
| `CLOUD_SERVICES_ENABLED` | 서버 Firebase 게이트, `false`; 꺼져 있어도 공식 관측 카탈로그 사용 |
| `NEXT_PUBLIC_CLOUD_SERVICES_ENABLED` | 브라우저 Firebase 초기화·로그인 게이트, `false` |
| `NEXT_PUBLIC_SITE_URL` | 운영 시 동일 출처 검사에 사용하는 사이트 URL |
| `NEXT_PUBLIC_FIREBASE_*` | 웹 Firebase 프로젝트 설정; 클라이언트에 노출되는 설정 |
| `FIREBASE_ADMIN_PROJECT_ID` | 서버 전용 프로젝트 ID |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | 서버 전용 서비스 계정 이메일 |
| `FIREBASE_ADMIN_PRIVATE_KEY` | 서버 전용 개인키; `\n`은 서버에서 줄바꿈으로 복원 |
| `VISITJEJU_API_ENABLED` | 비짓제주 호출 게이트, `false` |
| `VISITJEJU_USAGE_APPROVED` | 이용·비용 조건 확인 후의 별도 게이트, `false` |
| `VISITJEJU_API_KEY` | 서버 전용 API 키 |
| `VISITJEJU_API_URL` | 승인된 API endpoint |
| `VISITJEJU_API_KEY_PARAM` | 발급 계약에서 확인한 `apiKey` 또는 `apikey` |

데모 모드가 꺼진 상태에서 클라우드 모드를 켜면 공개 장소는 Firestore의 `published` 자료에서 읽습니다. 이때 로컬 관측 카탈로그와 자동으로 합치지 않습니다. 데이터 이전·게시 검수 없이 게이트만 켜면 로컬 목록이 보이지 않을 수 있습니다. DB 오류 시 로컬 자료나 가상 자료로 조용히 대체하지 않고 오류를 반환합니다. 운영 관리자 권한은 검증된 Firebase 세션의 `admin: true` custom claim으로 판단하며 화면이나 입력 JSON에서 역할을 지정할 수 없습니다.

클라우드 공개 장소는 서버 Data Cache를 60초 주기로 공유합니다. 관리자가 게시·숨김·휴폐업 상태를 바꾸면 캐시 태그를 만료시키고, JSON 응답에는 별도의 브라우저/CDN 캐시를 추가하지 않습니다. 로컬 정적 카탈로그는 JSON을 다시 검수·통합하고 빌드해야 갱신됩니다. 저장한 장소가 현재 공개 목록에서 사라지면 저장·일정 기록은 유지하고 화면에서 누락 개수를 안내합니다.

비짓제주 클라이언트는 HTTPS의 `api.visitjeju.net/vsjApi/contents/searchList`만 허용하고 redirect를 거부합니다. API 키·키 파라미터·계약은 공급자가 승인한 값을 확인해 설정해야 합니다. 현재 저장소의 코드는 실제 발급·수집·요금 확인을 대신하지 않습니다. 측정 ID 설정이 존재해도 Analytics는 초기화하지 않습니다.

### 비밀값 취급

- 실제 값은 `.env.local`에만 두고 `.env.example`에는 빈 값 또는 비밀이 아닌 기본값만 둡니다.
- `.env*`, 서비스 계정 JSON, PEM, 로컬 빌드 파일은 `.gitignore`로 제외합니다. 이미 추적 중인 파일은 ignore만으로 보호되지 않으므로 별도로 확인해야 합니다.
- Admin 비밀값에는 `NEXT_PUBLIC_` 접두사를 붙이지 않습니다. 서버 진입점에는 `server-only`를 사용합니다.
- 개인키·서비스 계정 JSON·API 키가 포함된 URL을 로그, 오류 응답, 스크린샷, PR에 넣지 않습니다.
- 브라우저용 Firebase 설정은 접근 통제가 아닙니다. `firestore.rules`, `storage.rules`, 서버 세션 검증으로 권한을 관리합니다. 이 저장소의 규칙 파일은 배포 완료를 의미하지 않습니다.

## API

| 엔드포인트 | 역할 | 조건 |
|---|---|---|
| `GET /api/places` | 공개 카탈로그 | 기본은 공식 관측 자료; 명시적 데모 모드 또는 클라우드 published 자료 선택 |
| `GET/POST/DELETE /api/session` | 세션 조회·생성·종료 | 생성은 Firebase ID 토큰 검증; 클라우드 게이트 |
| `POST /api/reports` | 장소 정보 수정 요청 | live 게시 장소, 동일 출처, 입력 길이·빈도 제한 |
| `GET/POST /api/admin/places` | 관리 목록·초안 생성 | 관리자 세션 |
| `PATCH /api/admin/places/[id]` | 수정·게시 상태 변경 | 관리자 세션, `expectedUpdatedAt` 충돌 확인 |
| `GET/PATCH /api/admin/reports` | 신고 조회·처리 | 관리자 세션 |
| `POST /api/admin/import` | 비짓제주 콘텐츠 1건을 초안으로 수집 | 관리자·클라우드·비짓제주 양쪽 게이트 |

신고 본문은 `{ placeId, category, message, locale }`이며 `message`는 5–500자입니다. 가져오기 본문은 `{ contentId, region, type }`입니다. 장소 쓰기는 `src/lib/server/place-schema.ts`의 strict allowlist 스키마를 사용하고 내부 감사 정보는 서버가 기록합니다. 비활성 서비스는 503을 반환하며, 클라이언트에서 임의로 유료 서비스로 우회하지 않습니다.

현재 요청 빈도 제한은 프로세스 메모리 기준입니다. 다중 서버 인스턴스에 걸친 전역 제한은 보장하지 않습니다. 운영 서비스 활성화 전에는 인증·보안 규칙과 함께 이 배포 조건을 확인해야 하며, 외부 제한 서비스를 자동으로 구매하거나 연결하지 않습니다.

Firestore의 장소·신고·감사로그는 클라이언트 직접 읽기/쓰기를 금지합니다. 사용자 저장 컬렉션은 본인 권한과 필드 검사를 적용합니다. Storage의 공개 업로드는 열지 않았습니다. 실제 리소스나 보안 규칙 배포는 별도의 승인된 운영 작업입니다.

## 구조와 문서

```text
src/app/                언어별 페이지와 서버 API
src/components/         화면·공통 UI
src/data/catalog.ts     기본 공식 관측 카탈로그 집계
src/data/places.ts      명시적 데모 모드용 가상 장소 20개
research_notes/catalog/ 실제 공개 페이지의 관측 JSON
src/hooks/              브라우저 여행 상태
src/lib/verdict/        순수 판정 함수와 테스트
src/lib/catalog.ts      지역·유형·가격 필터와 정렬
src/lib/official-catalog.ts  관측 자료 검증·공개 데이터 변환
src/lib/trip/           저장·일정 정규화와 JSON 내보내기
src/lib/firebase/       게이트가 있는 클라이언트·서버 연결
src/lib/server/         검증·권한·공개 데이터 변환
src/lib/visitjeju/      공식 API 어댑터와 초안 정규화
src/messages/           한국어·영어·중국어·일본어 문구
public/assets/          생성 이미지와 SVG 아이콘
docs/                   기획·디자인·데이터·운영 문서
```

[사전 브리핑](docs/11_prebrief.md), [디자인 시스템](docs/06_design_system.md), [데이터 모델 기획](docs/07_data_model.md), [데이터 수집·갱신 절차](docs/13_data_collection.md), [구현·검증 기록](docs/12_delivery_check.md), [자산 미리보기](design/asset-preview.html), [자산 명세](design/asset-manifest.json)를 참고하세요. 기획 문서의 예정 기능과 현재 구현을 구분하며, 실행·API·타입의 현재 계약은 이 README와 실제 소스에 따릅니다.

