# 07. 데이터 모델과 판정 로직

## 컬렉션

| 경로 | 내용 | 읽기 | 쓰기 |
|---|---|---|---|
| `places/{placeId}` | 장소 원장 | 서버 | 관리자 서버 |
| `users/{uid}` | 사용자 기본 정보 | 본인 | 본인 |
| `users/{uid}/saved/{placeId}` | 저장 장소 | 본인 | 본인 |
| `reports/{reportId}` | 오류 신고 | 관리자 | 서버 |
| `auditLogs/{logId}` | 변경 이력 | 관리자 | 서버 |

## 타입

```ts
export type Locale = 'ko' | 'en' | 'zh' | 'ja';
export type Companion = 'kids' | 'pet' | 'senior';
export type Region = 'east' | 'west' | 'south' | 'north';
export type PlaceType = 'restaurant' | 'cafe' | 'lodging';
export type PlaceStatus = 'draft' | 'published' | 'hidden' | 'suspended' | 'closed';
export type Verdict = 'fit' | 'conditional' | 'unknown' | 'notFit';
export type FactGroup = 'policy' | 'operation' | 'physical';
export type FactSource = 'phone' | 'onsite' | 'official';

export interface Fact<T> {
  value: T | 'unknown';
  note?: Partial<Record<Locale, string>>;
  source?: FactSource;
  verifiedAt?: string; // YYYY-MM-DD
  verifiedBy?: string; // 관리자 uid. 공개 응답에서 제거
}

export interface Place {
  id: string;
  slug: string;
  status: PlaceStatus;
  type: PlaceType;
  region: Region;
  name: Record<Locale, string>;
  summary: Partial<Record<Locale, string>>;
  district: string;
  address: Record<Locale, string>;
  location: { lat: number; lng: number };
  phone?: string;
  priceBand?: 'low' | 'mid' | 'high';
  hours?: WeeklyHours;
  closedRule?: Partial<Record<Locale, string>>;
  photos: PlacePhoto[];
  facts: PlaceFacts;
  translationStatus: Record<Exclude<Locale, 'ko'>, 'missing' | 'draft' | 'reviewed'>;
  createdAt: string;
  updatedAt: string;
}
```

좌표와 주소는 운영진이 확인해 입력한 자체 데이터다. 지도 API 검색 결과를 그대로 저장하지 않는다.

## 조건 항목

주기 단위는 일이다. `필수`는 게시 전 `unknown`이면 안 되는 항목이다.

### 공통

| 키 | 값 | 묶음 | 주기 | 필수 |
|---|---|---|---|---|
| `common.operating` | `open`, `suspended`, `closed` | operation | 60 | 예 |
| `common.parking` | `onsite`, `nearby`, `none` | physical | 365 | 예 |
| `common.takeout` | `yes`, `no` | operation | 60 | 식당·카페 |
| `common.reservation` | `required`, `recommended`, `no` | operation | 60 | 아니오 |

### 아이

| 키 | 값 | 묶음 | 주기 | 필수 |
|---|---|---|---|---|
| `kids.entry` | `yes`, `conditional`, `no` | policy | 90 | 예 |
| `kids.minAge` | 숫자 | policy | 90 | 아니오 |
| `kids.highChair` | `yes`, `no` + 수량 | physical | 365 | 식당·카페 |
| `kids.mildMenu` | `yes`, `no` | operation | 60 | 식당·카페 |
| `kids.outsideFood` | `yes`, `conditional`, `no` | policy | 90 | 아니오 |
| `kids.strollerAccess` | `yes`, `conditional`, `no` | physical | 365 | 아니오 |
| `kids.nursing` | `yes`, `no` | physical | 365 | 아니오 |
| `kids.diaperTable` | `yes`, `no` | physical | 365 | 아니오 |
| `kids.familyRoom` | `yes`, `no` | physical | 365 | 숙소 |
| `kids.babyGear` | `yes`, `no` | operation | 90 | 숙소 |

### 반려견

| 키 | 값 | 묶음 | 주기 | 필수 |
|---|---|---|---|---|
| `pet.entry` | `indoor`, `outdoor`, `no` | policy | 90 | 예 |
| `pet.maxSize` | `small`, `medium`, `large`, `any` | policy | 90 | 반려견 허용 시 |
| `pet.maxWeightKg` | 숫자 | policy | 90 | 아니오 |
| `pet.carrierRequired` | `yes`, `no` | policy | 90 | 아니오 |
| `pet.vaccinationProof` | `yes`, `no` | policy | 90 | 아니오 |
| `pet.zoneSeparated` | `yes`, `no` | physical | 365 | 반려견 허용 시 |
| `pet.foodSafetyListed` | `yes`, `no` | policy | 90 | 식당·카페 |
| `pet.extraFee` | `yes`, `no` + 금액 | operation | 90 | 숙소 |
| `pet.roomAllowed` | `yes`, `no` | policy | 90 | 숙소 |

### 어르신

| 키 | 값 | 묶음 | 주기 | 필수 |
|---|---|---|---|---|
| `senior.seating` | `table`, `mixed`, `floorOnly` | physical | 365 | 식당·카페 |
| `senior.stepFree` | `yes`, `fewSteps`, `stairsOnly` | physical | 365 | 예 |
| `senior.elevator` | `yes`, `no`, `notNeeded` | physical | 365 | 아니오 |
| `senior.wheelchair` | `yes`, `conditional`, `no` | physical | 365 | 아니오 |
| `senior.parkingNear` | `yes`, `no` | physical | 365 | 아니오 |
| `senior.toilet` | `sameFloorInside`, `outside`, `otherFloor` | physical | 365 | 아니오 |
| `senior.softMenu` | `yes`, `no` | operation | 60 | 아니오 |
| `senior.bed` | `bed`, `floor`, `both` | physical | 365 | 숙소 |

키오스크, 소음 등은 근거가 약해 베타 필수 항목에서 제외한다.

## 판정 로직

`src/lib/verdict/`에 순수 함수로 구현한다.

### 동행별 규칙

| 동행 | 입력 | 맞음 | 조건부 | 맞지 않음 | 미확인 |
|---|---|---|---|---|---|
| 아이 | `kids.entry` | `yes` | `conditional` | `no` | `unknown` |
| 반려견 | `pet.entry`, `pet.maxSize` | `indoor` | `outdoor` | `no`, 선택 크기 초과 | `unknown` |
| 어르신(식당·카페) | `senior.seating`, `senior.stepFree` | `table`·`mixed`와 `yes` | `fewSteps` | `floorOnly`, `stairsOnly` | 둘 중 하나 `unknown` |
| 어르신(숙소) | `senior.stepFree` | `yes` | `fewSteps` | `stairsOnly` | `unknown` |

어르신 식당·카페는 두 항목을 각각 판정한 뒤 아래 일행 합산과 같은 방식으로 합친다. 따라서 `floorOnly`이고 `senior.stepFree`가 `unknown`이면 결과는 `notFit`이다.

반려견 크기는 `small < medium < large < any` 순서로 비교한다. 선택 크기가 없으면 크기 제한이 있어도 `conditional`로 표시한다. 크기를 선택했는데 `pet.maxSize`가 `unknown`이면 `unknown`이다.

### 일행 합산

```ts
const severity: Record<Verdict, number> = {
  fit: 0,
  conditional: 1,
  unknown: 2,
  notFit: 3,
};

export function combineVerdicts(verdicts: Verdict[]): Verdict {
  return verdicts.reduce(
    (worst, current) => (severity[current] > severity[worst] ? current : worst),
    'fit',
  );
}
```

**예시:** 아이 `fit`, 반려견 `conditional`, 어르신 `notFit`이면 일행 판정은 `notFit`이다.

### 필터 규칙

- `includeNotFit=false`이면 `notFit`을 제외한다.
- `petFree=true`이면 `pet.entry=no`인 곳만 남긴다.
- `petFree`는 반려견을 선택했을 때 적용할 수 없다.
- `pet.entry=unknown`은 반려동물 없는 곳으로 보지 않는다.
- `openNow=true`이면 `hours`가 없는 곳은 제외하지 않고 '영업시간 미확인'으로 표시한다.
- `takeout=true`는 숙소에 적용하지 않는다.

### 정렬

1. 판정: 맞음, 조건부, 미확인, 맞지 않음
2. 최근 확인일
3. 현재 언어의 이름

광고 데이터는 입력으로 받지 않는다.

### 사실 태그 선택

카드 태그 3개는 동행별 항목에서 `yes`인 것을 먼저 고른다. 조건부 판정 카드는 첫 태그를 조건 내용으로 보여준다. 동행 태그가 부족하면 주차 정보로 채운다.

## 신선도 계산

```text
expiresAt = verifiedAt + cycleDays
freshness = fresh | dueSoon(14일 이내) | stale(기한 초과)
```

- `stale`은 공개를 유지하되 '확인 오래됨'을 표시한다.
- 필수 정책 항목이 기한을 90일 넘기면 해당 판정을 `unknown`으로 내린다.
- 폐업 확인 시 즉시 공개 목록에서 뺀다.

## 게시 조건

- 기본 정보, 좌표, 전화 또는 공식 연락 경로
- 필수 항목이 모두 입력됨
- 항목마다 `source`, `verifiedAt` 존재
- 한국어 이름과 요약 존재
- 대표 사진이 있거나 대체 이미지 사용을 명시
- 사진 사용 근거 기록

## 번역 전략

- enum 값은 메시지 파일에서 번역한다. 이 방식으로 조건 항목 대부분을 4개 언어로 바로 제공한다.
- 장소별 번역 대상은 이름, 주소, 요약, 메모, 정기 휴일 안내로 제한한다.
- 메모는 짧게 쓴다. 입장 조건을 메모에만 적지 않는다.
- 일본어와 중국어 고유명은 공식 표기가 없으면 임의로 만들지 않고 한국어 이름과 로마자 표기를 함께 보여준다.

## 저장 데이터

```ts
interface SavedPlace {
  placeId: string;
  savedAt: string;
  snapshotUpdatedAt: string;
}
```

`snapshotUpdatedAt`과 장소의 `updatedAt`이 다르면 저장 목록에 변경 표시를 한다.

## 오류 신고

```ts
interface PlaceReport {
  placeId: string;
  category: 'entry' | 'operation' | 'facility' | 'closed' | 'other';
  message: string; // 최대 500자
  locale: Locale;
  status: 'open' | 'inProgress' | 'applied' | 'rejected';
  createdAt: string;
}
```
