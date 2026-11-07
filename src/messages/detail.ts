import type {
  Locale,
  LocalizedText,
  PlaceFacts,
  PlaceType,
  Verdict,
} from "../lib/types";

const l = (ko: string, en: string, zh: string, ja: string): LocalizedText => ({
  ko,
  en,
  zh,
  ja,
});
const messages = {
  placeDetail: l(
    "우리 일행을 위한 장소 정보",
    "A closer look for your group",
    "为同行伙伴了解场所",
    "同行者のためのスポット情報",
  ),
  demoImage: l(
    "시연용 연출 이미지",
    "Illustrative demo image",
    "演示用合成图片",
    "デモ用イメージ画像",
  ),
  verifiedImage: l(
    "장소 대표 이미지",
    "Place image",
    "场所图片",
    "スポット画像",
  ),
  demoMatch: l(
    "선택한 조건으로 살펴보는 시연 결과예요",
    "A simulated match for your selected needs",
    "根据所选条件显示的演示结果",
    "選んだ条件によるデモ判定です",
  ),
  matchTitle: l(
    "우리 일행과 얼마나 맞을까요?",
    "Does it work for your group?",
    "适合我们的同行伙伴吗？",
    "同行者に合う場所でしょうか？",
  ),
  chooseProfile: l(
    "동행 조건을 선택하면 맞는 이유를 알려드려요.",
    "Choose your companions to see matching reasons.",
    "选择同行伙伴后即可查看匹配原因。",
    "同行者を選ぶと、条件に合う理由を確認できます。",
  ),
  changeProfile: l(
    "동행 조건 바꾸기",
    "Edit companion needs",
    "修改同行条件",
    "同行条件を変更",
  ),
  basePrice: l("기본 이용요금", "Base price", "基本费用", "基本料金"),
  priceUnknown: l(
    "요금 미확인",
    "Price unconfirmed",
    "费用未确认",
    "料金未確認",
  ),
  free: l("무료", "Free", "免费", "無料"),
  perPerson: l("1인 기준", "per person", "每人", "1人あたり"),
  perDrink: l("음료 1잔 기준", "per drink", "每杯饮品", "ドリンク1杯あたり"),
  perNight: l(
    "객실 1박 기준",
    "per room / night",
    "每间客房每晚",
    "1室1泊あたり",
  ),
  priceNote: l(
    "시즌·인원·선택 항목에 따라 달라질 수 있어요. 최종 금액은 이용 전 확인해 주세요.",
    "Prices may vary by season, party size and options. Confirm the final amount before visiting.",
    "费用可能因季节、人数及选项而变化，请在使用前确认最终金额。",
    "季節・人数・選択内容により変わる場合があります。利用前に最終料金をご確認ください。",
  ),
  petExtra: l(
    "반려견 추가요금",
    "Dog surcharge",
    "狗狗附加费用",
    "犬の追加料金",
  ),
  noPetExtra: l("추가요금 없음", "No surcharge", "无附加费用", "追加料金なし"),
  stayTime: l(
    "예상 머무는 시간",
    "Suggested visit length",
    "预计停留时间",
    "滞在時間の目安",
  ),
  minutes: l("분", "min", "分钟", "分"),
  hours: l("시간", "hours", "小时", "時間"),
  timeNote: l(
    "이동·대기 시간을 제외한 참고 시간이에요.",
    "An estimate excluding travel and waiting time.",
    "仅供参考，不含交通和等候时间。",
    "移動・待ち時間を含まない目安です。",
  ),
  factsTitle: l(
    "가기 전에 확인할 것들",
    "Know before you go",
    "出发前需确认的事项",
    "出かける前に確認",
  ),
  factsDescription: l(
    "동행마다 필요한 조건을 하나씩 확인해 보세요.",
    "Check each condition that matters to your companions.",
    "逐项确认同行伙伴所需的条件。",
    "同行者に必要な条件を一つずつ確認しましょう。",
  ),
  unknown: l("미확인", "Unconfirmed", "未确认", "未確認"),
  yes: l("가능", "Available", "可以", "可能"),
  no: l("불가", "Not available", "不可以", "不可"),
  conditional: l(
    "조건 확인 필요",
    "Conditions apply",
    "需要确认条件",
    "条件の確認が必要",
  ),
  has: l("있음", "Available", "有", "あり"),
  hasNot: l("없음", "Not available", "无", "なし"),
  noLimit: l("제한 없음", "No restriction", "无限制", "制限なし"),
  notApplicable: l("해당 없음", "Not applicable", "不适用", "該当なし"),
  noVerification: l(
    "확인 이력 없음",
    "No verification record",
    "无确认记录",
    "確認履歴なし",
  ),
  verifiedOn: l("확인일", "Verified", "确认日期", "確認日"),
  retrievedOn: l("정보 수집일", "Retrieved", "信息获取日期", "情報取得日"),
  stale: l(
    "확인 오래됨",
    "Verification overdue",
    "确认时间较久",
    "確認から期間が経過",
  ),
  dueSoon: l(
    "재확인 예정",
    "Recheck due soon",
    "即将再次确认",
    "まもなく再確認",
  ),
  source: l("정보 출처", "Information source", "信息来源", "情報源"),
  sourceLink: l(
    "공식 출처 보기",
    "View official source",
    "查看官方来源",
    "公式情報を見る",
  ),
  demoFact: l(
    "시연용 가상 조건",
    "Fictional demo condition",
    "演示用虚拟条件",
    "デモ用の架空条件",
  ),
  official: l("공식 정보", "Official information", "官方信息", "公式情報"),
  phone: l("전화 확인", "Confirmed by phone", "电话确认", "電話で確認"),
  onsite: l("현장 확인", "Confirmed on site", "现场确认", "現地で確認"),
  directions: l(
    "지도에서 길찾기",
    "Get directions",
    "查看路线",
    "地図でルート検索",
  ),
  demoDirections: l(
    "가상 장소에는 길찾기를 제공하지 않아요.",
    "Directions are unavailable for fictional places.",
    "虚拟场所不提供路线指引。",
    "架空の場所にはルート案内を提供しません。",
  ),
  localSave: l(
    "저장한 장소는 이 브라우저에 보관돼요.",
    "Saved places stay in this browser.",
    "收藏的场所保存在此浏览器中。",
    "保存した場所はこのブラウザーに保管されます。",
  ),
  shared: l("공유했어요.", "Shared.", "已分享。", "共有しました。"),
  copied: l(
    "링크를 복사했어요.",
    "Link copied.",
    "链接已复制。",
    "リンクをコピーしました。",
  ),
  shareFailed: l(
    "자동으로 복사하지 못했어요. 아래 링크를 직접 복사해 주세요.",
    "Could not copy automatically. Copy the link below.",
    "无法自动复制，请手动复制下面的链接。",
    "自動コピーできませんでした。以下のリンクをコピーしてください。",
  ),
  shareLink: l("공유할 링크", "Link to share", "分享链接", "共有リンク"),
  storageFailed: l(
    "브라우저 저장을 사용할 수 없어 이번 창에서만 유지돼요.",
    "Browser storage is unavailable; changes last for this session only.",
    "浏览器存储不可用，更改仅在本次会话中保留。",
    "ブラウザーの保存が使えないため、このセッション中のみ保持されます。",
  ),
  savedLimit: l(
    "최대 200곳까지 저장할 수 있어요. 저장 목록을 정리해 주세요.",
    "You can save up to 200 places. Remove a saved place first.",
    "最多可收藏200个场所，请先整理收藏列表。",
    "最大200件まで保存できます。保存リストを整理してください。",
  ),
  reportTitle: l(
    "정보 수정을 알려주세요",
    "Suggest an information correction",
    "反馈信息更正",
    "情報の修正をお知らせください",
  ),
  reportHelp: l(
    "잘못된 시설이나 이용 조건을 5~500자로 알려주세요. 연락처 등 개인정보는 적지 마세요.",
    "Describe an incorrect facility or admission detail in 5–500 characters. Do not include personal contact details.",
    "请用5至500字说明有误的设施或使用条件，不要填写个人联系方式。",
    "誤った設備・利用条件を5〜500文字でお知らせください。連絡先などの個人情報は入力しないでください。",
  ),
  reportLabel: l(
    "수정할 내용",
    "Correction details",
    "需要更正的内容",
    "修正内容",
  ),
  reportSubmit: l(
    "수정 요청 보내기",
    "Send correction request",
    "发送更正请求",
    "修正依頼を送信",
  ),
  reportSending: l("보내는 중…", "Sending…", "正在发送…", "送信中…"),
  reportSent: l(
    "수정 요청을 받았어요. 확인 후 반영할게요.",
    "Your correction was received and will be reviewed.",
    "已收到更正请求，将在确认后更新。",
    "修正依頼を受け付けました。確認後に反映します。",
  ),
  reportFailed: l(
    "수정 요청을 보내지 못했어요. 잠시 후 다시 시도해 주세요.",
    "The correction could not be sent. Please try again later.",
    "更正请求发送失败，请稍后重试。",
    "修正依頼を送信できませんでした。時間をおいて再度お試しください。",
  ),
  reportUnavailable: l(
    "현재 정보 수정 접수가 준비 중이에요.",
    "Correction submissions are not available yet.",
    "信息更正功能暂未开放。",
    "情報修正の受付は準備中です。",
  ),
  reportDemo: l(
    "시연용 장소는 실제 정보 수정 요청을 받지 않아요.",
    "Fictional demo places do not accept correction submissions.",
    "演示用虚拟场所不接受真实的信息更正请求。",
    "デモ用の架空スポットは実際の修正依頼を受け付けません。",
  ),
  alternatives: l(
    "같은 지역에서 함께 가볼 곳",
    "More places in this area",
    "同一区域的其他去处",
    "同じエリアで訪れたい場所",
  ),
  alternativesDescription: l(
    "선택한 동행 조건에 맞는 곳을 모았어요.",
    "These places match your selected companion needs.",
    "这些场所符合所选的同行条件。",
    "選んだ同行条件に合う場所を集めました。",
  ),
  aboutEyebrow: l(
    "모두를 생각하는 여행",
    "Travel with everyone in mind",
    "为每位同行者考虑的旅行",
    "みんなを想う旅",
  ),
  privacyEyebrow: l(
    "내 여행, 내 정보",
    "Your trip, your information",
    "我的旅行，我的信息",
    "自分の旅、自分の情報",
  ),
  aboutIntro: l(
    "좋아 보이는 곳을 찾은 뒤, 우리 일행이 갈 수 있는지 다시 검색하지 않아도 되도록.",
    "Find a lovely place without having to search again to learn whether your group can visit.",
    "找到心仪的场所后，无需再次搜索它是否适合同行伙伴。",
    "気になる場所を見つけた後、同行者が利用できるかを何度も調べずに済むように。",
  ),
  allCompanionsTitle: l(
    "일행 모두의 조건을 함께",
    "Every companion counts",
    "兼顾所有同行者的条件",
    "同行者全員の条件を一緒に",
  ),
  allCompanionsBody: l(
    "아이·반려견·어르신을 함께 선택하고, 실제로 필요한 조건을 더하세요. 입장 불가를 다른 장점으로 상쇄하지 않습니다.",
    "Select children, dogs and older companions together, then add the needs that matter. Other benefits never override an admission restriction.",
    "可同时选择儿童、狗狗和长辈，再添加实际需求。其他优点不会抵消入场限制。",
    "お子さま・犬・ご年配の方を一緒に選び、必要な条件を追加できます。他の長所で入場制限を打ち消すことはありません。",
  ),
  honestTitle: l(
    "모르는 것은 미확인으로",
    "Unknown stays unknown",
    "未知信息明确标注",
    "分からないことは未確認に",
  ),
  honestBody: l(
    "가능·조건부·미확인·부적합을 구분합니다. 출처와 확인 날짜를 살펴보고, 중요한 조건은 방문 전 다시 확인하세요.",
    "We distinguish suitable, conditional, unconfirmed and unsuitable. Review sources and verification dates, and reconfirm important conditions before visiting.",
    "区分符合条件、有条件、未确认及不符合条件。请查看来源和确认日期，并在出发前再次核实重要条件。",
    "適合・条件付き・未確認・不適合を区別します。情報源と確認日を確認し、重要な条件は訪問前に再確認してください。",
  ),
  controlTitle: l(
    "내 속도로 여행을 구성",
    "Plan at your own pace",
    "按自己的节奏安排行程",
    "自分のペースで旅を組み立てる",
  ),
  controlBody: l(
    "마음에 드는 장소를 저장하고 날짜별로 배치하세요. 이동·휴식·날씨에 맞춰 순서를 바꿀 수 있습니다.",
    "Save places you like and arrange them by day. Change the order to suit travel, rest and weather.",
    "收藏喜欢的场所并按日期安排，可根据交通、休息和天气调整顺序。",
    "気に入った場所を保存して日ごとに配置。移動・休憩・天候に合わせて順序を変えられます。",
  ),
  demoAbout: l(
    "현재 공개된 장소와 조건은 사용 흐름을 살펴보기 위한 가상 데이터입니다. 실제 업소 정보나 방문 추천이 아닙니다.",
    "The current places and conditions are fictional data for exploring the experience, not real business information or visit recommendations.",
    "当前场所及条件为展示使用流程的虚拟数据，不是真实商家信息或实际出行推荐。",
    "現在のスポットと条件は操作を体験するための架空データです。実際の店舗情報や訪問推奨ではありません。",
  ),
  privacyIntro: l(
    "현재 시연 버전에서 정보를 저장하고 사용하는 방식을 안내합니다.",
    "How the current demo stores and uses information.",
    "说明当前演示版本如何保存和使用信息。",
    "現在のデモで情報を保存・使用する方法をご案内します。",
  ),
  privacyLocalTitle: l(
    "브라우저에 저장되는 정보",
    "Information stored in your browser",
    "浏览器中保存的信息",
    "ブラウザーに保存する情報",
  ),
  privacyLocalBody: l(
    "동행 조건, 저장한 장소, 날짜별 일정과 화면 테마를 이 기기의 브라우저에 보관합니다. 같은 브라우저에서 다시 열면 이어서 사용할 수 있습니다. 언어는 페이지 주소에 반영됩니다.",
    "Companion preferences, saved places, day plans and display theme stay in this device’s browser, so you can continue in the same browser. The language is reflected in the page URL.",
    "同行条件、收藏场所、每日行程和显示主题保存在此设备的浏览器中，便于再次打开时继续使用。语言反映在页面地址中。",
    "同行条件・保存スポット・日別の予定・画面テーマをこの端末のブラウザーに保存し、同じブラウザーで続きを利用できます。言語はページのURLに反映されます。",
  ),
  privacyCloudTitle: l(
    "계정과 외부 서비스",
    "Accounts and external services",
    "账号和外部服务",
    "アカウントと外部サービス",
  ),
  privacyCloudBody: l(
    "기본 시연 모드에서는 로그인, 클라우드 동기화, 방문 분석을 실행하지 않습니다. 외부 지도나 공식 출처를 열면 해당 서비스의 개인정보 처리방침이 적용됩니다.",
    "Default demo mode does not run sign-in, cloud sync or visitor analytics. Opening external maps or official sources is subject to those services’ privacy policies.",
    "默认演示模式不执行登录、云端同步或访问分析。打开外部地图或官方来源时，适用相应服务的隐私政策。",
    "標準デモモードではログイン・クラウド同期・アクセス分析を実行しません。外部地図や公式情報を開くと、そのサービスのプライバシーポリシーが適用されます。",
  ),
  privacyRemoveTitle: l(
    "저장 정보 지우기",
    "Removing stored information",
    "删除保存的信息",
    "保存情報を削除する",
  ),
  privacyRemoveBody: l(
    "저장 목록에서 장소를 해제할 수 있습니다. 동행 조건과 화면 설정까지 지우려면 브라우저의 이 사이트 데이터 삭제 기능을 사용하세요.",
    "Remove places from your saved list. To remove companion preferences and display settings too, clear this site’s data in your browser.",
    "可以从收藏列表移除场所。如需同时清除同行条件和显示设置，请在浏览器中删除本站数据。",
    "保存リストからスポットを解除できます。同行条件や表示設定も削除する場合は、ブラウザーでこのサイトのデータを削除してください。",
  ),
  privacyReportTitle: l(
    "정보 수정 요청",
    "Correction requests",
    "信息更正请求",
    "情報の修正依頼",
  ),
  privacyReportBody: l(
    "실제 장소의 수정 요청 기능이 활성화되면 장소 ID, 수정 유형, 내용과 언어를 운영자에게 전송합니다. 시연 장소에서는 제출되지 않습니다. 연락처나 민감한 개인정보는 입력하지 마세요.",
    "When corrections for real places are enabled, the place ID, category, message and language are sent to the operator. Demo places cannot submit requests. Do not include contact details or sensitive personal information.",
    "真实场所更正功能启用后，会向运营方发送场所ID、更正类型、内容及语言。演示场所无法提交。请勿填写联系方式或敏感个人信息。",
    "実在スポットの修正受付が有効な場合、スポットID・修正種別・内容・言語を運営者に送信します。デモでは送信されません。連絡先や機微な個人情報は入力しないでください。",
  ),
  startExploring: l(
    "우리 일행에게 맞는 곳 찾기",
    "Find places for your group",
    "寻找适合同伴的场所",
    "同行者に合う場所を探す",
  ),
};

export function detailCopy(
  locale: Locale,
): Record<keyof typeof messages, string> {
  return Object.fromEntries(
    Object.entries(messages).map(([key, value]) => [key, value[locale]]),
  ) as Record<keyof typeof messages, string>;
}

export const detailFactLabels: Record<keyof PlaceFacts, LocalizedText> = {
  operating: l("운영 상태", "Operating status", "营业状态", "営業状況"),
  kidsEntry: l("어린이 입장", "Child admission", "儿童入场", "お子さまの入場"),
  minAge: l("최소 입장 나이", "Minimum age", "最低入场年龄", "最低入場年齢"),
  highChair: l("유아 의자", "High chairs", "儿童餐椅", "子ども用椅子"),
  stroller: l(
    "유모차 진입",
    "Stroller access",
    "婴儿车通行",
    "ベビーカーの通行",
  ),
  petEntry: l(
    "반려견 동반 공간",
    "Dog access areas",
    "狗狗可使用区域",
    "犬の同伴エリア",
  ),
  dogMaxWeight: l(
    "반려견 최대 체중",
    "Maximum dog weight",
    "狗狗体重上限",
    "犬の最大体重",
  ),
  dogWeightInclusive: l(
    "체중 상한 적용",
    "Weight-limit boundary",
    "体重上限规则",
    "体重上限の適用",
  ),
  carrierRequired: l(
    "반려견 이동장",
    "Pet carrier",
    "宠物箱",
    "ペットキャリー",
  ),
  stepFree: l(
    "계단 없는 진입",
    "Step-free entrance",
    "无台阶进入",
    "段差なしの入口",
  ),
  seating: l("좌석 형태", "Seating", "座位类型", "座席の形態"),
  walkingMinutes: l(
    "필요한 보행 시간",
    "Required walking time",
    "所需步行时间",
    "必要な歩行時間",
  ),
  parking: l("주차", "Parking", "停车", "駐車場"),
  toilet: l("화장실", "Toilets", "洗手间", "トイレ"),
};

const valueLabels: Record<string, LocalizedText> = {
  open: l("운영 중", "Operating", "营业中", "営業中"),
  suspended: l("휴업", "Temporarily closed", "暂停营业", "休業中"),
  closed: l("폐업", "Closed", "已停业", "閉業"),
  indoor: l("실내 동반 가능", "Allowed indoors", "可进入室内", "室内同伴可"),
  outdoor: l("야외 공간만 가능", "Outdoor areas only", "仅限室外", "屋外のみ"),
  table: l("입식 좌석", "Table seating", "桌椅座位", "テーブル席"),
  mixed: l(
    "입식·좌식 혼합",
    "Tables and floor seating",
    "桌椅及席地座位",
    "テーブル席と座敷",
  ),
  floor: l("좌식 좌석", "Floor seating", "席地座位", "座敷"),
  onsite: l("시설 내 주차", "On-site parking", "场所内停车", "敷地内駐車場"),
  nearby: l("인근 주차", "Nearby parking", "附近停车", "近隣駐車場"),
  none: l("없음", "None", "无", "なし"),
  inside: l("실내", "Inside", "室内", "屋内"),
  outside: l("외부", "Outside", "室外", "屋外"),
};

export function detailFactValue(
  key: keyof PlaceFacts,
  value: unknown,
  locale: Locale,
): string {
  const t = detailCopy(locale);
  if (value === "unknown") return t.unknown;
  if (value === null)
    return key === "minAge" || key === "dogMaxWeight" ? t.noLimit : t.unknown;
  if (key === "dogWeightInclusive" && typeof value === "boolean")
    return l(
      value ? "상한 체중 포함 (이하)" : "상한 체중 제외 (미만)",
      value ? "Inclusive (at most)" : "Exclusive (less than)",
      value ? "包含上限" : "不包含上限",
      value ? "上限を含む（以下）" : "上限を含まない（未満）",
    )[locale];
  if (key === "carrierRequired" && typeof value === "boolean")
    return l(
      value ? "필수" : "필수 아님",
      value ? "Required" : "Not required",
      value ? "必须" : "非必须",
      value ? "必須" : "必須ではない",
    )[locale];
  if (typeof value === "boolean") return value ? t.has : t.hasNot;
  if (typeof value === "number") {
    if (key === "dogMaxWeight") return `${value} kg`;
    if (key === "walkingMinutes") return `${value} ${t.minutes}`;
    if (key === "minAge")
      return l(`${value}세`, `Age ${value}`, `${value}岁`, `${value}歳`)[
        locale
      ];
    return String(value);
  }
  if (value === "yes") return t.yes;
  if (value === "no") return t.no;
  if (value === "conditional") return t.conditional;
  if (value === "notApplicable") return t.notApplicable;
  return valueLabels[String(value)]?.[locale] ?? t.unknown;
}

export const detailVerdicts: Record<Verdict, LocalizedText> = {
  fit: l(
    "선택 조건에 맞아요",
    "Matches your needs",
    "符合所选条件",
    "選んだ条件に合います",
  ),
  conditional: l(
    "조건을 확인해 주세요",
    "Check the conditions",
    "请确认条件",
    "条件をご確認ください",
  ),
  unknown: l(
    "추가 확인이 필요해요",
    "More information needed",
    "需要进一步确认",
    "追加確認が必要です",
  ),
  notFit: l(
    "선택 조건과 맞지 않아요",
    "Does not match your needs",
    "不符合所选条件",
    "選んだ条件に合いません",
  ),
};

export const detailTypeLabels: Record<PlaceType, LocalizedText> = {
  restaurant: l("식당", "Restaurant", "餐厅", "食堂"),
  cafe: l("카페", "Café", "咖啡馆", "カフェ"),
  stay: l("숙소", "Stay", "住宿", "宿泊"),
  attraction: l("관광", "Attraction", "景点", "観光"),
  experience: l("체험", "Experience", "体验", "体験"),
  walk: l("산책", "Walk", "散步", "散歩"),
};
