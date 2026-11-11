# modujeju · 같이제주

아이·반려견·어르신과 함께하는 일행의 조건을 비교해 제주 장소를 찾는 모바일 우선 여행 웹앱입니다. 복수 동행, 4개 권역, 식당·카페·숙소·관광·체험·산책, 유형별 예산으로 탐색하고 장소를 저장해 날짜별 일정을 구성합니다.

기본 화면은 **비짓제주 API 기본 정보와 공개 원문에서 검토한 동반 이용 정보를 연결한 정적 카탈로그**입니다. 2026-11-11에 한국어 API 전체 59페이지에서 고유 콘텐츠 ID 5,889개를 수집했습니다. 이 중 앱의 검토 장소 157곳 모두 콘텐츠 ID와 이름이 일치했으며, 좌표 153곳과 전화번호 152곳을 연결했습니다. 장소 사진은 비짓제주 CDN에서 직접 표시하며, URL이 없거나 로딩에 실패하면 카테고리 아이콘을 표시합니다.

앱에서 탐색할 수 있는 장소는 식당 66곳, 카페 24곳, 숙소 48곳, 관광지 12곳, 체험 2곳, 산책 5곳입니다. 2026-11-08에 구글 검색과 비짓제주·운영기관·한국관광공사 원문을 대조해 동반 이용 관측 102개, 시설 근거 87개(86개 검토 완료·1개 보류), 입장 근거 9개를 보강했습니다. 직접 열람하지 못한 네이버 원문은 근거에서 제외했습니다. 동반 조건에는 각 원문의 기존 검토일을 유지하며, 출처가 충돌하는 체중 제한이나 확인되지 않은 이용 범위는 미확인으로 표시합니다. 동·서·남·북 권역은 실제 주소를 검토한 내부 탐색 분류입니다.

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
- 요금·좌표·소요시간 미확인은 `null`입니다. 광고에 표시된 최저가를 특정 방문일의 숙박 요금으로 사용하지 않습니다. 공개 페이지에서 직접 관찰한 사진 URL은 별도 `research_notes/catalog/photos.json`에서 정확한 콘텐츠 ID로 매칭합니다. `photoSource`에는 원문·사진 URL, 설명, 관찰일을 보존하며, 재배포 허가나 라이선스를 자동 확정하지 않습니다. Firebase 저장이나 Vercel 이미지 최적화를 거치지 않고 브라우저가 원본 CDN을 직접 요청합니다.

비짓제주 어댑터는 기본 정보와 동행 조건을 분리합니다. 가져온 원본에 동행 조건이나 가격이 없으면 `unknown`/`null`을 유지하며, 사진은 권리 검토 전 후보 URL로만 보관합니다. 가져오기는 항상 `draft`를 만들고 자동 게시하거나 기존 검수 정보를 덮어쓰지 않습니다.

`src/data/catalog.ts`는 검토된 장소 목록에 비짓제주 API의 좌표·전화번호와 콘텐츠 ID별 동반 이용 근거를 연결합니다. API 기본 정보의 수집일과 동반 정책의 원문 검토일을 별도로 관리합니다. 상세 화면에서 동반 조건별 출처와 확인일을 볼 수 있습니다. [카탈로그에 연결한 API 자료](research_notes/catalog/visitjeju-api-details.json) · [데이터 수집·갱신 절차](docs/13_data_collection.md)

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
| `VISITJEJU_API_URL` | 공식 가이드로 확인한 `https://api.visitjeju.net/vsjApi/contents/searchList`, 설정 완료 |
| `VISITJEJU_API_KEY_PARAM` | 인증 키를 보내는 쿼리 이름 `apiKey` (대문자 K) |
| `VISITJEJU_SYNC_ENABLED` | 지속 수집 게이트, `false` |
| `VISITJEJU_SYNC_COST_APPROVED` | 지속 수집의 API·서버·DB·저장 비용 범위 승인, `false` |
| `VISITJEJU_STORAGE_APPROVED` | 정규화·저장·재공개 조건 확인, `false` |
| `VISITJEJU_SYNC_APPROVAL_EXPIRES_AT` | 승인 종료 UTC ISO 시각; 비어 있거나 만료되면 차단 |
| `VISITJEJU_SYNC_MAX_PAGES`, `VISITJEJU_SYNC_MAX_ITEMS` | 실행당 최대 2페이지·100건, 더 작은 값만 허용 |
| `CRON_SECRET` | 서버 전용 예약 호출 인증키; 로컬에 생성, 예시는 빈 값 |

데모 모드가 꺼진 상태에서 클라우드 모드를 켜면 공개 장소는 Firestore의 `sourcePlaces` 기본 정보와 `places`의 운영자 검수 자료를 합쳐 읽습니다. 기본 수집 자료는 동행 조건 `unknown`, 요금 `null`, placeholder 아이콘으로 표시하며 검수가 끝났다고 주장하지 않습니다. 같은 출처의 `published` 문서가 우선하고 숨김·휴폐업 상태는 기본 수집 자료도 가립니다. 로컬 관측 카탈로그와 자동 합산하지 않으므로 데이터 이전 없이 게이트만 켜면 로컬 목록이 보이지 않을 수 있습니다. DB 오류 시 로컬 자료나 가상 자료로 조용히 대체하지 않고 오류를 반환합니다. 운영 관리자 권한은 검증된 Firebase 세션의 `admin: true` custom claim으로 판단하며 화면이나 입력 JSON에서 역할을 지정할 수 없습니다.

클라우드 공개 장소는 서버 Data Cache를 60초 주기로 공유합니다. 관리자가 게시·숨김·휴폐업 상태를 바꾸면 캐시 태그를 만료시키고, JSON 응답에는 별도의 브라우저/CDN 캐시를 추가하지 않습니다. 로컬 정적 카탈로그는 JSON을 다시 검수·통합하고 빌드해야 갱신됩니다. 저장한 장소가 현재 공개 목록에서 사라지면 저장·일정 기록은 유지하고 화면에서 누락 개수를 안내합니다.

비짓제주 클라이언트는 HTTPS의 `api.visitjeju.net/vsjApi/contents/searchList`만 허용하고 redirect를 거부합니다. 공식 가이드의 요청 예제와 동일하게 인증 키를 `apiKey`로 보냅니다. 키는 서버 전용이며 저장소에 포함하지 않습니다. 실행 게이트의 기본값은 `false`입니다. 측정 ID 설정이 존재해도 Analytics는 초기화하지 않습니다.

**공공데이터포털의 [공식 API 항목](https://www.data.go.kr/data/15076361/openapi.do)에서 무료·이용허락범위 제한 없음을 2026-11-08에 확인했습니다.** 정량 호출 한도는 제공기관 정책에 따르며 계정별 한도·초과 처리 조건은 별도 확인이 필요합니다. 지속 수집은 활성화하지 않았습니다. `/api/cron/visitjeju`는 비밀 헤더와 모든 승인·설정·만료 조건을 통과해야 실행하며, 하루 최대 한 번의 run ID와 2페이지·100건 제한을 사용합니다. `vercel.cron.example.json`은 예시만 있고 활성 `vercel.json`에는 예약이 없습니다. 실행·비용·중단·데이터 보존 조건은 [지속 수집 운영](docs/14_recurring_ingestion.md)에 기록했습니다.

일회성 수집을 위한 `node scripts/collect-visitjeju.mjs --check`는 **네트워크 없이** 키 존재와 승인 상태만 출력합니다. `--collect`는 API·이용·저장 승인, `VISITJEJU_LOCAL_APPROVAL_EXPIRES_AT`의 미래 UTC 만료시각, `VISITJEJU_LOCAL_MAX_PAGES`의 명시적 요청 한도(1–100)를 요구합니다. `VISITJEJU_LOCAL_START_PAGE`는 기본 1이며 후속 범위를 지정할 수 있습니다. 이 경로는 Firebase·클라우드 게이트를 켜지 않고 승인된 범위만 순차 수집하며 자동 재시도하지 않습니다. 결과는 Git에서 제외된 `research_notes/ingestion/visitjeju-ko-pages-{시작}-{요청종료}.json`에 검토 대기로 저장하고, 기존 파일을 덮어쓰거나 공개 카탈로그에 자동 반영하지 않습니다. 설정 플래그 자체는 사용자의 비용 승인을 대신하지 않습니다. `node --test scripts/collect-visitjeju.test.mjs`는 실제 API를 호출하지 않는 모의 테스트입니다.

2026-11-08 수집 시도에서는 HTTP 200과 함께 웹 방화벽의 HTML 응답을 받아 JSON 수집이 0건이었습니다. 11월 11일에는 동일 조건에서 소문자 `apikey`와 키 생략 요청이 모두 차단됐고, 09:34(한국시간) `apiKey`로 요청한 첫 페이지에서 JSON 100건을 받았습니다. 이어 승인된 일회성 로컬 수집으로 마지막 59페이지까지 확인했습니다. 자동 수집과 클라우드 게이트는 비활성 상태입니다. [11월 8일 수집 기록](research_notes/sources/visitjeju-api-status-2026-11-08.json) · [수집 절차](docs/13_data_collection.md)

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
src/lib/sync/           승인 게이트·페이지 수집·커서/lease·저장·공개 병합
src/messages/           한국어·영어·중국어·일본어 문구
public/assets/          생성 이미지와 SVG 아이콘
docs/                   기획·디자인·데이터·운영 문서
```

[사전 브리핑](docs/11_prebrief.md), [디자인 시스템](docs/06_design_system.md), [데이터 모델 기획](docs/07_data_model.md), [데이터 수집·갱신 절차](docs/13_data_collection.md), [구현·검증 기록](docs/12_delivery_check.md), [자산 미리보기](design/asset-preview.html), [자산 명세](design/asset-manifest.json)를 참고하세요. 기획 문서의 예정 기능과 현재 구현을 구분하며, 실행·API·타입의 현재 계약은 이 README와 실제 소스에 따릅니다.

