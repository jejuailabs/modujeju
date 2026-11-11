import type { Locale, LocalizedText } from "@/lib/types";

const l = (ko: string, en: string, zh: string, ja: string): LocalizedText => ({ ko, en, zh, ja });
const messages = {
  source: l("등록된 장소", "Listed places", "已收录场所", "掲載スポット"),
  count: l("곳", "places", "处", "件"),
  showMore: l("더 보기", "Show more", "查看更多", "もっと見る"),
  notice: l("비짓제주, 관광약자접근성안내센터, 식품안전나라 같은 공식 정보와 육아 앱 표기를 모았어요. 항목마다 출처와 확인일을 함께 보여드려요.", "Gathered from official sources such as VisitJeju, the Jeju accessibility center and the Food Safety Korea pet-entry list, plus family travel app listings. Each item shows its source and check date.", "汇集VisitJeju、济州旅游弱势群体无障碍中心、食品安全韩国等官方信息及亲子应用标注。每项均附来源和确认日期。", "VisitJeju、済州観光弱者アクセシビリティ案内センター、食品安全ナラなどの公式情報と子育てアプリの表記をまとめました。項目ごとに出典と確認日を表示します。"),
  placeholder: l("유형 안내 이미지 · 실제 장소 사진 아님", "Category illustration · not a place photo", "分类示意图 · 非实景照片", "種類のイメージ・実際の写真ではありません"),
  sourceTags: l("비짓제주 태그", "VisitJeju tags", "VisitJeju标签", "VisitJejuのタグ"),
  observations: l("동반 이용 안내와 출처", "Companion information and sources", "同行信息与来源", "同伴利用の案内と出典"),
  observationNote: l("수집 당시의 안내입니다. 영업시간·요금·입장 조건은 변경될 수 있어요. 원문에 없는 조건은 미확인으로 표시합니다.", "These details were listed when collected. Hours, prices and admission rules may change. Unstated conditions remain unconfirmed.", "以下为收集时的信息。营业时间、价格及入场规定可能变更，原文未说明的条件标为未确认。", "収集時点の案内です。営業時間・料金・入場条件は変更される場合があります。記載のない条件は未確認と表示します。"),
  sourceRead: l("공식 페이지 수집일", "Official page collected", "官方页面收集日期", "公式ページ収集日"),
  noCoordinates: l("정확한 좌표가 없는 장소는 지도에 임의로 표시하지 않아요. 아래 주소로 위치를 확인할 수 있습니다.", "Places without exact coordinates are not plotted. Use the addresses below to look up their locations.", "没有准确坐标的场所不会在图上随意标记，可通过以下地址查看位置。", "正確な座標がない場所は地図上に表示しません。以下の住所から場所を確認できます。"),
  mapOverview: l("OpenStreetMap에서 실제 위치를 살펴보세요. 좌표 미확인 장소는 권역으로 묶어 표시하며, 길찾기는 외부 지도를 이용하세요.", "Explore actual locations on OpenStreetMap. Places without coordinates are grouped by region. Use an external map for navigation.", "在OpenStreetMap查看实际位置。无坐标地点按区域分组，导航请使用外部地图。", "OpenStreetMapで実際の位置を確認できます。座標未確認の場所はエリア別に表示し、経路案内は外部地図をご利用ください。"),
  addressMap: l("주소로 지도 보기", "Look up address on map", "按地址查看地图", "住所で地図を開く"),
  coordinateSource: l("좌표 출처 · 장소 중심점", "Coordinate source · place centre", "坐标来源 · 地点中心", "座標出典・スポット中心点"),
  originalLanguage: l("출처의 한국어 표기를 사용합니다.", "Source names and notes are shown in Korean.", "名称及来源说明保留韩文。", "名称と出典の案内は韓国語表記です。"),
};
export function catalogCopy(locale: Locale): Record<keyof typeof messages, string> {
  return Object.fromEntries(Object.entries(messages).map(([key, value]) => [key, value[locale]])) as Record<keyof typeof messages, string>;
}

const observationLabels: Record<string, LocalizedText> = {
  visitJejuIntro: l("소개 (비짓제주)", "About (VisitJeju)", "简介（VisitJeju）", "紹介（VisitJeju）"),
  roadAddress: l("도로명 주소", "Street address", "道路名地址", "道路名住所"),
  jibunAddress: l("지번 주소", "Lot-number address", "地番地址", "地番住所"),
  visitJejuPhone: l("문의 전화 (비짓제주)", "Contact number (VisitJeju)", "咨询电话（VisitJeju）", "問い合わせ先（VisitJeju）"),
  district: l("지역", "Area", "区域", "エリア"),
  amenities: l("편의시설", "Amenities", "便利设施", "設備"),
  accessAssistance: l("장애인 활동 보조 필요성", "Accessibility assistance", "无障碍协助", "介助の必要性"),
  accessibilityAssistanceLabel: l("장애인 활동 보조 필요성", "Accessibility assistance", "无障碍协助", "介助の必要性"),
  petPolicy: l("반려동물 동반 안내", "Pet policy", "宠物同行规定", "ペット同伴案内"),
  petPolicyDisplayed: l("반려동물 동반 안내", "Pet policy", "宠物同行规定", "ペット同伴案内"),
  childrenAccess: l("어린이 출입", "Child admission", "儿童入场", "お子さまの入場"),
  childAreaRestriction: l("어린이 이용 공간 제한", "Child area restrictions", "儿童区域限制", "子どもの利用エリア制限"),
  infantFacilities: l("유아 편의시설", "Infant facilities", "婴幼儿设施", "乳幼児設備"),
  listedAccessibilityFacilities: l("안내된 접근 편의시설", "Listed access facilities", "页面列出的无障碍设施", "掲載されたアクセス設備"),
  petFacilitiesDisplayed: l("반려동물 시설", "Pet facilities", "宠物设施", "ペット設備"),
  kidsFacilitiesDisplayed: l("어린이 시설", "Children’s facilities", "儿童设施", "子ども用設備"),
  accessibleRoomDisplayed: l("접근성 객실 안내", "Accessible room information", "无障碍客房信息", "バリアフリー客室案内"),
  facilityPriceDisplayed: l("시설 이용요금 안내", "Facility prices", "设施使用费用", "施設料金案内"),
  petProgramDisplayed: l("반려동물 프로그램", "Pet programme", "宠物项目", "ペット向けプログラム"),
};
export function observationLabel(field: string, locale: Locale): string {
  return observationLabels[field]?.[locale] ?? field;
}
