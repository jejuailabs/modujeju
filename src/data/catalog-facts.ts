import cafes from '../../research_notes/catalog/cafes.json';
import restaurants from '../../research_notes/catalog/restaurants.json';
import stays from '../../research_notes/catalog/stays.json';
import type { LocalizedText, Place, PlaceFacts } from '@/lib/types';

interface SourceObservation {
  field: string;
  value: unknown;
  valueStructured?: unknown;
  sourceUrl?: string;
}

interface ReviewedSource {
  sourceId: string;
  sourceUrl: string;
  type: string;
  retrievedAt: string;
  basicSourceCheckedAt?: string;
  observations?: SourceObservation[];
}

type Matcher = (value: unknown) => boolean;
interface ReviewedRule {
  target: keyof PlaceFacts;
  observation: string;
  matches: Matcher;
  makePatch: (date: string, sourceUrl: string) => Partial<PlaceFacts>;
}

const l = (ko: string, en: string, zh: string, ja: string): LocalizedText => ({ ko, en, zh, ja });
const exact = (expected: string): Matcher => value => value === expected;
const properties = (expected: Record<string, unknown>): Matcher => value =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
  && Object.entries(expected).every(([key, expectedValue]) => (value as Record<string, unknown>)[key] === expectedValue);

function noteAt(date: string, condition: LocalizedText): LocalizedText {
  return l(
    `${date} 비짓제주 공식 페이지 문구 확인: ${condition.ko} 방문 전 현재 조건을 다시 확인해 주세요.`,
    `Wording checked on VisitJeju's official page on ${date}: ${condition.en} Reconfirm current conditions before visiting.`,
    `${date}在VisitJeju官方页面核对的文字：${condition.zh}到访前请再次确认现行条件。`,
    `${date}にVisitJeju公式ページの記載を確認：${condition.ja}訪問前に現在の条件をご確認ください。`,
  );
}

function rule<K extends keyof PlaceFacts>(target: K, value: PlaceFacts[K]['value'], observation: string, matches: Matcher, condition: LocalizedText): ReviewedRule {
  return {
    target, observation, matches,
    makePatch: (date, sourceUrl) => ({
      [target]: { value, source: 'official', verifiedAt: date, sourceUrl, note: noteAt(date, condition) },
    }) as Partial<PlaceFacts>,
  };
}

const childAllowed = (field = 'childrenAccess') => rule('kidsEntry', 'yes', field, exact('어린이 출입가능'), l(
  '어린이 출입 가능으로 안내됩니다. 구체적인 연령 제한은 확인되지 않았습니다.',
  'Children are admitted. Specific age limits were not confirmed.',
  '页面注明儿童可入内，具体年龄限制未确认。',
  '子どもは入場可能との記載です。具体的な年齢制限は未確認です。',
));
const petDenied = () => rule('petEntry', 'no', 'petPolicyDisplayed', properties({ admission: '동반불가능' }), l(
  '애완동물 동반 불가능으로 안내됩니다.', 'Pets are not admitted.', '页面注明宠物不可同行。', 'ペット同伴不可との記載です。',
));

const somersetCondition = l(
  '펫프렌들리룸에 한해 반려견 10kg 미만, 기본 1마리·최대 2마리이며 추가 비용이 있습니다. 지정 객실 예약 여부를 판정할 수 없어 일반 입장은 미확인입니다.',
  'Pet-friendly rooms only: dogs under 10 kg, one included and up to two with an extra charge. General admission remains unconfirmed because the designated room booking is not checked.',
  '仅限宠物友好客房：狗狗须低于10公斤，默认1只、最多2只并有附加费。无法核对指定客房预订，普通入场仍为未确认。',
  'ペット対応客室のみ。犬は10kg未満、基本1頭・最大2頭で追加料金があります。指定客室の予約を判定できないため、一般の入場可否は未確認です。',
);
const sonocalmCondition = l(
  '펫 동반 스위트·패밀리 객실에서 12kg 이하 반려견 기본 1마리를 안내합니다. 지정 객실과 이용 구역을 예약 전에 확인해야 하므로 일반 입장은 미확인입니다.',
  'Designated pet-friendly suite/family rooms list one dog up to 12 kg. General admission remains unconfirmed; confirm the room and permitted areas before booking.',
  '指定宠物友好套房或家庭房注明可携1只12公斤及以下狗狗。预订前需确认客房及活动区域，普通入场仍为未确认。',
  '犬同伴のスイート・ファミリー客室で12kg以下の犬を基本1頭と案内しています。予約前に指定客室と利用エリアの確認が必要なため、一般の入場可否は未確認です。',
);

/** This allowlist is a manual review, not a keyword/tag classifier. */
const reviewedRules: Readonly<Record<string, readonly ReviewedRule[]>> = {
  CNTS_000000000018301: [childAllowed()], // 우유부단
  CNTS_200000000012547: [childAllowed()], // 커피템플
  CNTS_000000000020649: [childAllowed()], // 바람벽에 흰당나귀
  CNTS_200000000007203: [childAllowed()], // 송당나무
  CNTS_200000000009011: [ // 허니문하우스
    childAllowed(),
    rule('highChair', true, 'infantFacilities', exact('유아의자'), l('유아 의자가 안내되어 있습니다.', 'High chairs are listed.', '页面列有儿童餐椅。', '子ども用の椅子が記載されています。')),
  ],
  CNTS_000000000019945: [ // 풍림다방
    rule('kidsEntry', 'no', 'childrenAccess', exact('어린이 출입불가'), l('어린이 출입 불가로 안내됩니다.', 'Children are not admitted.', '页面注明儿童不可入内。', '子どもは入場不可との記載です。')),
  ],
  CNTS_000000000019940: [childAllowed('노키즈존')], // 어진이네 횟집
  CNTS_000000000018400: [childAllowed('노키즈존')], // 명랑스낵
  CNTS_000000000020621: [childAllowed('노키즈존')], // 중문수두리보말칼국수
  CNTS_000000000020104: [ // 돈사돈: a generic public car park is deliberately insufficient.
    rule('parking', 'onsite', '편의시설', exact('매장 주차장,화장실'), l('매장 주차장이 명시되어 있습니다.', 'An on-site restaurant car park is listed.', '页面明确列有店内停车场。', '店舗の駐車場が明記されています。')),
  ],
  CNTS_200000000007373: [petDenied()], // 제주가좋아서펜션
  CNTS_000000000020590: [petDenied()], // 더포그레이스
  CNTS_200000000007548: [petDenied()], // 에코그린
  CNTS_000000000022768: [ // 서머셋: never broaden a designated-room policy to all indoor areas.
    rule('petEntry', 'unknown', 'petPolicyDisplayed', properties({ room: '펫프렌들리룸', dogMaxWeightKg: 10, weightInclusive: false }), somersetCondition),
    rule('dogMaxWeight', 10, 'petPolicyDisplayed', properties({ room: '펫프렌들리룸', dogMaxWeightKg: 10, weightInclusive: false }), somersetCondition),
    rule('dogWeightInclusive', false, 'petPolicyDisplayed', properties({ room: '펫프렌들리룸', dogMaxWeightKg: 10, weightInclusive: false }), somersetCondition),
  ],
  CNTS_000000000020789: [ // 소노캄
    rule('petEntry', 'unknown', 'petPolicyDisplayed', properties({ room: '펫 동반 스위트·패밀리 객실', dogMaxWeightKg: 12, weightInclusive: true }), sonocalmCondition),
    rule('dogMaxWeight', 12, 'petPolicyDisplayed', properties({ room: '펫 동반 스위트·패밀리 객실', dogMaxWeightKg: 12, weightInclusive: true }), sonocalmCondition),
    rule('dogWeightInclusive', true, 'petPolicyDisplayed', properties({ room: '펫 동반 스위트·패밀리 객실', dogMaxWeightKg: 12, weightInclusive: true }), sonocalmCondition),
  ],
  CNTS_000000000000592: [ // 소노벨: category wording does not prove an exact inclusive boundary.
    rule('petEntry', 'unknown', 'petPolicyDisplayed', properties({ room: '취사형 펫프렌들리 스위트', weightWording: '소형견(-10kg)/중형견(11-15kg)' }), l(
      '취사형 펫프렌들리 스위트에 소형견(-10kg)·중형견(11-15kg), 기본 1마리·최대 2마리와 추가요금이 안내됩니다. 지정 객실 예약과 정확한 체중 경계를 추가 확인해야 합니다.',
      'Self-catering pet-friendly suites list small (-10 kg) and medium (11–15 kg) dogs, one included and up to two with a surcharge. Confirm the designated room booking and exact weight boundaries.',
      '带厨房宠物友好套房列有小型犬(-10kg)、中型犬(11–15kg)，默认1只、最多2只并有附加费。需核对指定客房预订和精确体重界限。',
      '自炊可能なペット対応スイートに小型犬(-10kg)・中型犬(11–15kg)、基本1頭・最大2頭と追加料金の記載があります。指定客室の予約と正確な体重境界は追加確認が必要です。',
    )),
  ],
  CONT_000000000501154: [ // 리치망고: allergy-related restrictions cannot be evaluated by this profile.
    rule('petEntry', 'unknown', 'petPolicy', exact('반려동물 동반 가능. 실내에서는 펫티켓을 지켜야 하며 알레르기 이용객이 있으면 이용이 제한될 수 있다. 체급별 입장 조건은 별도 확인이 필요하다.'), l(
      '반려동물 실내 이용 시 펫티켓과 다른 이용객의 알레르기에 따른 제한이 안내됩니다. 해당 현장 조건과 체급 조건을 판정할 수 없어 입장은 미확인으로 유지합니다.',
      'Indoor pet use is subject to pet etiquette and other guests’ allergies. Admission remains unconfirmed because these on-site conditions and size limits cannot be evaluated.',
      '室内携宠须遵守礼仪，并可能因其他客人的过敏情况受限。现场条件及体型要求无法判定，入场保持未确认。',
      '室内のペット利用にはマナーや他の利用者のアレルギーによる制限があります。現場の条件と体格条件を判定できないため、入場可否は未確認のままです。',
    )),
  ],
  CNTS_000000000019242: [ // 유동커피: no indoor/outdoor scope is stated.
    rule('petEntry', 'unknown', 'petPolicy', exact('반려동물 동반 가능으로 안내되어 있다. 체급과 실내 이용 범위는 표시되지 않았다.'), l(
      '반려동물 동반 가능 문구는 있지만 실내·야외 이용 범위와 체급 조건은 확인되지 않았습니다.',
      'Pets are described as welcome, but indoor/outdoor areas and size limits are unconfirmed.',
      '虽有可携宠物的说明，但室内外区域和体型条件未确认。',
      'ペット同伴可能との記載はありますが、屋内・屋外の範囲と体格条件は未確認です。',
    )),
  ],
};

const sources = new Map((([...cafes, ...restaurants, ...stays] as unknown) as ReviewedSource[]).map(source => [source.sourceId, source]));

function matchesSource(value: string | undefined, sourceId: string): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && ['www.visitjeju.net', 'visitjeju.net'].includes(url.hostname)
      && url.pathname === '/kr/detail/view' && !url.username && !url.password && !url.port
      && url.searchParams.get('contentsid') === sourceId;
  } catch { return false; }
}

function checkedDay(source: ReviewedSource): string | null {
  const date = source.basicSourceCheckedAt ?? source.retrievedAt.slice(0, 10);
  const time = Date.parse(`${date}T00:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === date ? date : null;
}

/** Adds only reviewed source wording. It never declares the whole place verified. */
export function applyCatalogFacts(places: Place[]): Place[] {
  return places.map(place => {
    if (place.dataMode !== 'live' || !place.sourceId || !matchesSource(place.sourceUrl, place.sourceId)) return place;
    const source = sources.get(place.sourceId);
    if (!source || source.type !== place.type || !matchesSource(source.sourceUrl, place.sourceId)) return place;
    const date = checkedDay(source);
    let facts = place.facts;
    if (date) {
      for (const review of reviewedRules[place.sourceId] ?? []) {
        const existing = facts[review.target];
        // Local source review cannot replace later editorial, phone or on-site evidence.
        if (existing.value !== 'unknown' || existing.source !== 'unknown') continue;
        const evidence = source.observations?.find(observation => observation.field === review.observation
          && matchesSource(observation.sourceUrl ?? source.sourceUrl, place.sourceId!)
          && review.matches(observation.valueStructured ?? observation.value));
        if (!evidence) continue;
        facts = { ...facts, ...review.makePatch(date, evidence.sourceUrl ?? source.sourceUrl) };
      }
    }
    // Undated, unspecified booking promotions remain in research JSON only.
    const sourceObservations = place.sourceObservations?.filter(observation => observation.field !== 'nightlyPricePromotionDisplayed');
    return { ...place, facts, ...(sourceObservations ? { sourceObservations } : {}) };
  });
}
