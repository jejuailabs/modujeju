import type { LocalizedText } from "../lib/types";

const text = (
  ko: string,
  en: string,
  zh: string,
  ja: string,
): LocalizedText => ({ ko, en, zh, ja });

export const conditionMessages = {
  operatingClosed: text(
    "현재 운영하지 않는 곳이에요",
    "This place is not operating",
    "该场所目前未营业",
    "現在営業していません",
  ),
  operatingUnknown: text(
    "운영 상태를 확인해야 해요",
    "Operating status needs confirmation",
    "营业状态待确认",
    "営業状況の確認が必要です",
  ),
  kidsAllowed: text(
    "아이와 함께 이용할 수 있어요",
    "Children are welcome",
    "可携儿童同行",
    "お子さま同伴で利用できます",
  ),
  kidsConditional: text(
    "아이 입장 조건을 확인해 주세요",
    "Check the child admission conditions",
    "请确认儿童入场条件",
    "お子さまの入場条件をご確認ください",
  ),
  kidsDenied: text(
    "어린이 입장이 제한된 곳이에요",
    "Children are not admitted",
    "不允许儿童入场",
    "お子さまは入場できません",
  ),
  kidsUnknown: text(
    "어린이 입장 여부 미확인",
    "Child admission is unconfirmed",
    "儿童入场规定未确认",
    "お子さまの入場可否は未確認です",
  ),
  childAgeMissing: text(
    "입장 연령 제한이 있어 나이를 확인해야 해요",
    "A minimum age applies; add the child’s age",
    "有最低年龄限制，请填写儿童年龄",
    "年齢制限があるため、お子さまの年齢をご確認ください",
  ),
  childAgeUnknown: text(
    "어린이 나이 제한 미확인",
    "Child age limits are unconfirmed",
    "儿童年龄限制未确认",
    "お子さまの年齢制限は未確認です",
  ),
  strollerYes: text(
    "유모차로 진입할 수 있어요",
    "Stroller access is available",
    "可使用婴儿车进入",
    "ベビーカーで入れます",
  ),
  strollerConditional: text(
    "유모차 이동에 일부 제한이 있어요",
    "Some stroller access restrictions apply",
    "婴儿车通行有部分限制",
    "ベビーカーの移動に一部制限があります",
  ),
  strollerNo: text(
    "유모차 진입이 어려워요",
    "Stroller access is not available",
    "无法使用婴儿车进入",
    "ベビーカーでの入場はできません",
  ),
  strollerUnknown: text(
    "유모차 진입 여부 미확인",
    "Stroller access is unconfirmed",
    "婴儿车通行情况未确认",
    "ベビーカーの通行可否は未確認です",
  ),
  highChair: text(
    "유아 의자가 있어요",
    "High chairs are available",
    "提供儿童餐椅",
    "子ども用の椅子があります",
  ),
  petIndoor: text(
    "반려견 실내 동반이 가능해요",
    "Dogs are allowed indoors",
    "允许狗狗进入室内",
    "犬を室内に同伴できます",
  ),
  petOutdoor: text(
    "반려견은 야외 공간만 이용해요",
    "Dogs may use outdoor areas only",
    "狗狗仅可使用室外区域",
    "犬は屋外エリアのみ利用できます",
  ),
  petIndoorRequired: text(
    "실내 동반이 필요한 조건과 맞지 않아요",
    "Indoor dog access is required but unavailable",
    "不符合狗狗室内同行要求",
    "犬の室内同伴が必要という条件に合いません",
  ),
  petDenied: text(
    "반려견 동반이 불가해요",
    "Dogs are not allowed",
    "不允许携犬进入",
    "犬の同伴はできません",
  ),
  petUnknown: text(
    "반려견 동반 여부 미확인",
    "Dog admission is unconfirmed",
    "狗狗同行规定未确认",
    "犬の同伴可否は未確認です",
  ),
  weightUnknown: text(
    "반려견 체중 제한 미확인",
    "Dog weight restrictions are unconfirmed",
    "狗狗体重限制未确认",
    "犬の体重制限は未確認です",
  ),
  weightMissing: text(
    "반려견 체중을 입력하면 제한을 확인할 수 있어요",
    "Add your dog’s weight to check the limit",
    "请输入狗狗体重以核对限制",
    "犬の体重を入力すると制限を確認できます",
  ),
  weightBoundaryUnknown: text(
    "체중 상한 포함 여부를 확인해야 해요",
    "Confirm whether the weight limit is inclusive",
    "请确认体重上限是否包含该数值",
    "体重上限を含むか確認が必要です",
  ),
  carrierRequired: text(
    "이동장을 준비해야 해요",
    "A pet carrier is required",
    "需要准备宠物箱",
    "ペットキャリーが必要です",
  ),
  carrierUnknown: text(
    "이동장 필수 여부 미확인",
    "Carrier requirements are unconfirmed",
    "是否必须使用宠物箱尚未确认",
    "キャリーの必要条件は未確認です",
  ),
  stepFreeYes: text(
    "계단 없이 진입할 수 있어요",
    "Step-free entrance is available",
    "可无台阶进入",
    "段差なしで入れます",
  ),
  stepFreeConditional: text(
    "계단 없는 진입에 추가 조건이 있어요",
    "Conditions apply to step-free access",
    "无台阶进入需要满足额外条件",
    "段差なしの入場には条件があります",
  ),
  stepFreeNo: text(
    "계단 없는 진입 조건과 맞지 않아요",
    "The entrance does not meet your step-free requirement",
    "不符合无台阶进入要求",
    "段差なしの入場条件に合いません",
  ),
  stepFreeUnknown: text(
    "출입구 단차 여부 미확인",
    "Entrance step information is unconfirmed",
    "入口台阶情况未确认",
    "入口の段差は未確認です",
  ),
  shortWalkNo: text(
    "30분 이내의 짧은 보행 조건과 맞지 않아요",
    "The walk exceeds your 30-minute limit",
    "步行时间超过30分钟限制",
    "徒歩30分以内の条件に合いません",
  ),
  shortWalkUnknown: text(
    "필요한 보행 시간 미확인",
    "Required walking time is unconfirmed",
    "所需步行时间未确认",
    "必要な歩行時間は未確認です",
  ),
  tableSeating: text(
    "입식 좌석을 이용할 수 있어요",
    "Table seating is available",
    "提供桌椅座位",
    "テーブル席を利用できます",
  ),
  needsOptional: text(
    "필요한 이동 편의 조건을 추가해 보세요",
    "Add any mobility needs for a closer match",
    "可添加所需的行动便利条件",
    "必要な移動条件を追加できます",
  ),
};

export type ConditionCode = keyof typeof conditionMessages;

export function ageLimitMessage(age: number): LocalizedText {
  return text(
    `${age}세 이상 입장할 수 있어요`,
    `Admission is for ages ${age} and over`,
    `仅限${age}岁及以上入场`,
    `${age}歳以上が入場できます`,
  );
}

export function weightLimitMessage(
  weight: number,
  inclusive: boolean | "unknown",
): LocalizedText {
  if (inclusive === "unknown")
    return text(
      `반려견 체중 상한은 ${weight}kg이며, 상한 포함 여부는 미확인이에요`,
      `The dog weight limit is ${weight} kg; whether the boundary is inclusive is unconfirmed`,
      `狗狗体重上限为${weight}公斤，是否包含上限尚未确认`,
      `犬の体重上限は${weight}kgです。上限を含むかは未確認です`,
    );
  return text(
    `반려견 ${weight}kg ${inclusive ? "이하" : "미만"}만 동반 가능해요`,
    `Dogs must weigh ${inclusive ? "at most" : "less than"} ${weight} kg`,
    `狗狗体重须${inclusive ? "不超过" : "低于"}${weight}公斤`,
    `犬は${weight}kg${inclusive ? "以下" : "未満"}のみ同伴できます`,
  );
}

export function walkingMessage(minutes: number): LocalizedText {
  return text(
    `필요한 보행 약 ${minutes}분`,
    `About ${minutes} minutes of walking`,
    `需要步行约${minutes}分钟`,
    `必要な歩行は約${minutes}分`,
  );
}
