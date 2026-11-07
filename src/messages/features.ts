import type { LocalizedText, Locale } from "@/lib/types";
import type { FeatureKey, FeatureStatus } from "@/lib/place-features";

const l = (ko: string, en: string, zh: string, ja: string): LocalizedText => ({ ko, en, zh, ja });
const unknown = l("확인된 정보가 없습니다. 방문 전 문의해 주세요.", "No confirmed information. Check before visiting.", "尚无已确认信息，到访前请咨询。", "確認できる情報がありません。訪問前にお問い合わせください。");
export const featureStatusMessages: Record<FeatureStatus, LocalizedText> = {
  yes: l("확인됨", "Confirmed", "已确认", "確認済み"),
  no: l("없음·불가", "Unavailable", "无或不可使用", "なし・利用不可"),
  conditional: l("조건 확인", "Check conditions", "需确认条件", "条件の確認が必要"),
  unknown: l("미확인", "Unconfirmed", "未确认", "未確認"),
};

type FeatureMessage = { label: LocalizedText; yes: LocalizedText; no: LocalizedText; conditional: LocalizedText; unknown: LocalizedText };
export const featureMessages: Record<FeatureKey, FeatureMessage> = {
  kids: {
    label: l("아이 입장", "Children's admission", "儿童入场", "子どもの入場"),
    yes: l("어린이 출입 가능 안내가 확인됐습니다. 연령별 조건과 시설은 따로 확인하세요.", "Children are admitted. Check age-specific conditions and facilities separately.", "已确认儿童可入内，年龄条件及设施请另行确认。", "子どもは入場可能です。年齢ごとの条件や設備は別途ご確認ください。"),
    no: l("어린이 출입 불가로 안내됩니다.", "Children are not admitted.", "页面注明儿童不可入内。", "子どもは入場不可との案内です。"),
    conditional: l("어린이 입장에 별도 조건이 있습니다.", "Conditions apply to children's admission.", "儿童入场有附加条件。", "子どもの入場には条件があります。"), unknown,
  },
  pet: {
    label: l("반려견 동반", "Dog admission", "携犬同行", "犬の同伴"),
    yes: l("실내 동반과 체중·이동장 조건이 확인됐습니다. 방문 전 현재 운영 조건을 확인하세요.", "Indoor admission, weight and carrier rules are confirmed. Reconfirm current rules before visiting.", "已确认室内同行、体重及携带箱条件，到访前请再次确认现行规定。", "屋内同伴・体重・キャリー条件を確認しています。訪問前に現在の条件をご確認ください。"),
    no: l("반려동물 동반 불가로 안내됩니다.", "Pets are not admitted.", "页面注明宠物不可同行。", "ペット同伴不可との案内です。"),
    conditional: l("이용 공간·체중·이동장 조건을 확인해야 합니다.", "Check permitted areas, weight limits and carrier rules.", "请确认可使用区域、体重限制和携带箱规定。", "利用可能エリア・体重・キャリー条件の確認が必要です。"), unknown,
  },
  senior: {
    label: l("어르신 이동 정보", "Senior mobility information", "长者通行信息", "シニアの移動情報"),
    yes: l("계단·턱 없는 출입 동선이 확인됐습니다. 좌석과 보행 시간은 별도로 확인하세요.", "Step-free entry is confirmed. Check seating and walking time separately.", "已确认无台阶入口，座椅及步行时间请另行确认。", "段差のない入場経路を確認しています。座席や歩行時間は別途ご確認ください。"),
    no: l("무단차 출입이 불가합니다. 필요한 이동 지원에 맞춰 판단하세요.", "Entry is not step-free. Consider the mobility support you need.", "入口并非无障碍通行，请按所需协助判断。", "段差のない入場はできません。必要な移動支援に合わせてご判断ください。"),
    conditional: l("무단차 이동에 제한이나 별도 조건이 있습니다.", "Conditions or restrictions apply to step-free access.", "无台阶通行有限制或附加条件。", "段差のない移動には制限や条件があります。"), unknown,
  },
  highChair: {
    label: l("유아 의자", "High chair", "儿童餐椅", "ベビーチェア"),
    yes: l("유아 의자가 안내되어 있습니다. 수량과 사용 가능 여부는 확인해 주세요.", "High chairs are listed. Check quantity and availability.", "有儿童餐椅说明，请确认数量及可用情况。", "ベビーチェアの記載があります。台数と利用状況をご確認ください。"),
    no: l("유아 의자가 없는 것으로 확인됐습니다.", "High chairs are confirmed unavailable.", "已确认不提供儿童餐椅。", "ベビーチェアがないことを確認しています。"),
    conditional: l("유아 의자 이용 조건을 확인해 주세요.", "Check conditions for high-chair use.", "请确认儿童餐椅使用条件。", "ベビーチェアの利用条件をご確認ください。"), unknown,
  },
  stroller: {
    label: l("유모차 출입", "Stroller access", "婴儿车通行", "ベビーカー入場"),
    yes: l("유모차 출입 가능으로 확인됐습니다.", "Stroller access is confirmed.", "已确认婴儿车可通行。", "ベビーカーで入場可能と確認しています。"),
    no: l("유모차 출입 불가로 확인됐습니다.", "Stroller access is not permitted.", "已确认婴儿车不可通行。", "ベビーカーでの入場はできません。"),
    conditional: l("유모차 이용 동선이나 공간에 조건이 있습니다.", "Conditions apply to stroller routes or areas.", "婴儿车通行路线或区域有条件。", "ベビーカーの経路や利用エリアには条件があります。"), unknown,
  },
  stepFree: {
    label: l("무단차 출입", "Step-free entry", "无台阶入口", "段差なしの入場"),
    yes: l("계단·턱 없는 출입 동선이 확인됐습니다.", "A step-free entry route is confirmed.", "已确认无台阶的入场路线。", "段差のない入場経路を確認しています。"),
    no: l("무단차 출입이 불가한 것으로 확인됐습니다.", "Entry is confirmed not to be step-free.", "已确认入口并非无台阶通行。", "段差のない入場はできないことを確認しています。"),
    conditional: l("무단차 출입에 별도 조건이 있습니다.", "Conditions apply to step-free entry.", "无台阶入场有附加条件。", "段差のない入場には条件があります。"), unknown,
  },
  floorSeating: {
    label: l("좌식 좌석", "Floor seating", "地面座席", "座敷席"),
    yes: l("바닥에 앉는 좌식 좌석으로 확인됐습니다. 의자가 필요한 경우 참고하세요.", "Floor seating is confirmed. Consider this if you need a chair.", "已确认席地而坐的座席，需要椅子时请注意。", "床に座る座敷席を確認しています。椅子が必要な場合はご留意ください。"),
    no: l("입식 좌석으로 확인되어 좌식 좌석에 해당하지 않습니다.", "Chair seating is confirmed, rather than floor seating.", "已确认是椅子座席，并非地面座席。", "椅子席と確認されており、座敷席ではありません。"),
    conditional: l("좌식과 입식 좌석이 함께 있습니다. 원하는 좌석을 확인하세요.", "Floor and chair seating are mixed. Confirm the seating you need.", "地面座席与椅子座席混合，请确认所需座位。", "座敷席と椅子席が混在しています。希望の席をご確認ください。"), unknown,
  },
  tableSeating: {
    label: l("의자·입식 좌석", "Chair seating", "椅子座席", "椅子席"),
    yes: l("의자에 앉는 입식 좌석으로 확인됐습니다.", "Chair seating is confirmed.", "已确认有椅子座席。", "椅子に座る席を確認しています。"),
    no: l("좌식 좌석으로 안내됩니다. 의자가 필요하면 추가 확인하세요.", "Floor seating is listed. Check further if you need a chair.", "标注为地面座席，需要椅子时请再确认。", "座敷席との案内です。椅子が必要な場合は追加確認してください。"),
    conditional: l("입식과 좌식이 혼합되어 있어 좌석 확인이 필요합니다.", "Chair and floor seating are mixed; confirm your seat.", "椅子与地面座席混合，需确认座位。", "椅子席と座敷席が混在するため、席の確認が必要です。"), unknown,
  },
  groundFloor: {
    label: l("1층 이용", "Ground-floor venue", "一楼使用", "1階の利用"),
    yes: l("공식 주소 또는 시설 안내에 이용 층이 1층으로 명시되어 있습니다. 무단차 출입 여부는 별도입니다.", "The official address or facility description lists ground-floor use. Step-free entry is a separate condition.", "官方地址或设施说明注明位于一楼，无台阶入口需另行确认。", "公式の住所または設備案内に1階と明記されています。段差のない入場とは別の条件です。"),
    no: l("이용 공간이 1층이 아닌 것으로 명시되어 있습니다.", "The venue explicitly lists a floor other than the ground floor.", "明确注明使用空间不在一楼。", "利用空間が1階以外と明記されています。"),
    conditional: l("층별 이용 공간을 확인해 주세요.", "Check which floors are used.", "请确认各楼层的使用区域。", "利用する階をご確認ください。"), unknown,
  },
  parking: {
    label: l("매장 주차", "On-site parking", "店内停车", "敷地内駐車場"),
    yes: l("매장 주차장이 명시되어 있습니다. 요금과 주차 공간은 확인해 주세요.", "On-site parking is listed. Check charges and available spaces.", "明确列有店内停车场，请确认费用和车位。", "敷地内の駐車場が明記されています。料金と空き状況をご確認ください。"),
    no: l("주차 공간이 없는 것으로 확인됐습니다.", "Parking is confirmed unavailable.", "已确认无停车位。", "駐車スペースがないことを確認しています。"),
    conditional: l("외부·공용 주차장 안내가 있습니다. 위치와 거리는 확인해 주세요.", "External or public parking is listed. Check its location and distance.", "有外部或公共停车场说明，请确认位置及距离。", "外部・公共駐車場の案内があります。場所と距離をご確認ください。"), unknown,
  },
  toilet: {
    label: l("화장실", "Toilet", "卫生间", "トイレ"),
    yes: l("화장실이 안내되어 있습니다. 실내·외 위치와 접근 조건은 확인해 주세요.", "A toilet is listed. Check its location and access conditions.", "有卫生间说明，请确认位置和通行条件。", "トイレの案内があります。場所とアクセス条件をご確認ください。"),
    no: l("화장실이 없는 것으로 확인됐습니다.", "A toilet is confirmed unavailable.", "已确认没有卫生间。", "トイレがないことを確認しています。"),
    conditional: l("외부 화장실로 안내됩니다. 동선을 확인해 주세요.", "An external toilet is listed. Check the route.", "注明为外部卫生间，请确认路线。", "外部のトイレとの案内です。経路をご確認ください。"), unknown,
  },
  shortWalk: {
    label: l("30분 이내 보행", "Walk of up to 30 min", "步行30分钟内", "徒歩30分以内"),
    yes: l("확인된 보행 시간이 30분 이내입니다. 전체 체류 시간과는 다릅니다.", "Confirmed walking time is up to 30 minutes; this is not the total visit duration.", "已确认步行时间在30分钟内，并非总游览时间。", "確認済みの歩行時間が30分以内です。滞在全体の時間とは異なります。"),
    no: l("확인된 보행 시간이 30분을 넘습니다.", "Confirmed walking time exceeds 30 minutes.", "已确认步行时间超过30分钟。", "確認済みの歩行時間が30分を超えます。"),
    conditional: l("보행 동선과 시간을 확인해 주세요.", "Check the walking route and time.", "请确认步行路线及时间。", "歩行経路と時間をご確認ください。"), unknown,
  },
};

export const featureDetailMessages = {
  conflict: l("출처 정보가 서로 달라 현재 상태는 미확인입니다.", "Sources disagree; the current status is unconfirmed.", "来源信息不一致，目前状态未确认。", "情報源が一致しないため、現在の状態は未確認です。"),
  indoor: l("실내 동반 안내.", "Indoor admission listed.", "注明可室内同行。", "屋内同伴の案内。"),
  outdoor: l("야외 공간만 동반 가능.", "Outdoor areas only.", "仅限户外区域。", "屋外エリアのみ同伴可能。"),
  carrier: l("이동장 사용 필요.", "A carrier is required.", "需要使用携带箱。", "キャリーの使用が必要。"),
  petRulesUnknown: l("체중 또는 이동장 조건은 미확인.", "Weight or carrier rules are unconfirmed.", "体重或携带箱条件未确认。", "体重またはキャリー条件は未確認。"),
};

export const featureSearchAliases: Record<FeatureKey, Record<Locale, readonly string[]>> = {
  kids: { ko: ["아이", "키즈", "아이 동반", "어린이 입장", "예스키즈존"], en: ["kids", "children", "children admitted"], zh: ["儿童", "亲子", "儿童入场"], ja: ["子ども", "子連れ", "子どもの入場"] },
  pet: { ko: ["반려견", "반려동물", "펫", "애견 동반"], en: ["pet", "dog", "dog admission"], zh: ["宠物", "携犬", "携宠"], ja: ["ペット", "犬同伴"] },
  senior: { ko: ["어르신", "시니어", "부모님", "어르신 이동"], en: ["senior", "senior mobility"], zh: ["长者", "老人"], ja: ["シニア", "高齢者"] },
  highChair: { ko: ["유아 의자", "아기 의자", "아이체어", "하이체어", "유아용 의자"], en: ["high chair", "highchair", "baby chair"], zh: ["儿童餐椅", "宝宝椅"], ja: ["ベビーチェア", "子ども椅子"] },
  stroller: { ko: ["유모차", "유모차 출입"], en: ["stroller", "pram", "stroller access"], zh: ["婴儿车", "婴儿车通行"], ja: ["ベビーカー"] },
  stepFree: { ko: ["무단차", "계단 없음", "턱 없음", "무단차 출입"], en: ["step free", "step-free entry", "no steps"], zh: ["无台阶", "无障碍入口"], ja: ["段差なし", "段差のない入口"] },
  floorSeating: { ko: ["좌식", "좌식 좌석", "의자 없음"], en: ["floor seating", "no chairs"], zh: ["地面座席", "席地而坐"], ja: ["座敷", "座敷席"] },
  tableSeating: { ko: ["입식", "의자 좌석", "입식 좌석"], en: ["chair seating", "table seating"], zh: ["椅子座席"], ja: ["椅子席", "テーブル席"] },
  groundFloor: { ko: ["1층", "일층", "1층 이용"], en: ["ground floor", "ground-floor venue"], zh: ["一楼", "1楼"], ja: ["1階", "一階"] },
  parking: { ko: ["주차", "주차장", "매장 주차"], en: ["parking", "on-site parking"], zh: ["停车", "停车场"], ja: ["駐車場", "駐車"] },
  toilet: { ko: ["화장실"], en: ["toilet", "restroom", "bathroom"], zh: ["卫生间", "洗手间"], ja: ["トイレ"] },
  shortWalk: { ko: ["짧은 보행", "30분 이내 보행", "짧은 산책"], en: ["short walk", "walk of up to 30 min"], zh: ["短距离步行", "步行30分钟内"], ja: ["短い徒歩", "徒歩30分以内"] },
};

export const featureLabels: Record<FeatureKey, LocalizedText> = Object.fromEntries(
  Object.entries(featureMessages).map(([key, message]) => [key, message.label]),
) as Record<FeatureKey, LocalizedText>;
