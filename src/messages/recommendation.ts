import type { Locale } from "@/lib/types";

const words = {
  title: ["저장한 곳으로, 우리만의 제주", "A Jeju trip from your saved places", "用收藏规划济州之旅", "保存した場所から、私たちの済州旅"],
  intro: ["가까운 권역끼리 묶고, 머무를 곳부터 하루를 그려요.", "Group nearby regions and plan each day around your overnight base.", "按相邻区域安排路线与住宿。", "近いエリアをまとめ、宿泊拠点から一日を計画します。"],
  rules: ["권역·동행 조건으로 만든 추천", "Region and companion recommendation", "按区域和同行条件推荐", "エリア・同行条件による提案"],
  ai: ["기기 AI가 권역 순서를 추천했어요", "On-device AI suggested the region order", "设备AI已推荐区域顺序", "端末AIがエリアの順序を提案しました"],
  aiButton: ["기기 AI로 권역 추천", "Suggest regions with on-device AI", "设备AI推荐区域", "端末AIでエリアを提案"],
  aiNotice: ["요청당 AI 이용료 없이 이 기기에서 실행해요. 처음에는 모델 파일 수백 MB를 내려받으며, WebGPU와 약 1GB 이상의 GPU 메모리가 필요해요. Wi-Fi 사용을 권장해요.", "Runs on this device without an AI API charge. First use downloads several hundred MB and requires WebGPU and about 1 GB or more GPU memory. Wi-Fi recommended.", "在本设备运行，无AI接口费用。首次下载数百MB，需WebGPU及约1GB以上GPU内存，建议使用Wi-Fi。", "AI API料金なしで端末内で実行。初回は数百MBをダウンロードし、WebGPUと約1GB以上のGPUメモリが必要です。Wi-Fi推奨。"],
  preference: ["어떤 여행을 원하세요?", "What kind of trip would you like?", "期待怎样的旅行？", "どんな旅にしたいですか？"],
  placeholder: ["예: 이동을 줄이고, 바다를 보며 느긋하게", "For example: less moving, more time by the sea", "例如：减少移动，悠闲看海", "例：移動を少なく、海辺でのんびり"],
  apply: ["이 일정으로 저장", "Save this itinerary", "保存此行程", "この日程を保存"],
  applied: ["나의 여행에 저장했어요", "Saved to My trip", "已保存至我的旅行", "マイ旅に保存しました"],
  replace: ["현재 날짜별 일정이 이 추천으로 바뀝니다.", "This replaces your current day-by-day itinerary.", "将替换目前的每日行程。", "現在の日別日程をこの提案に置き換えます。"],
  cancel: ["중단", "Cancel", "取消", "中止"],
  loading: ["기기 AI 준비 중", "Preparing on-device AI", "正在准备设备AI", "端末AIを準備中"],
  thinking: ["저장한 권역 순서를 살펴보고 있어요", "Considering the order of your saved regions", "正在分析收藏区域的顺序", "保存エリアの順序を検討しています"],
  unsupported: ["이 브라우저에서는 기기 AI를 실행할 수 없어요. 아래 권역 추천은 그대로 사용할 수 있어요.", "On-device AI is unavailable in this browser. You can still use the region recommendation below.", "此浏览器不支持设备AI，仍可使用下方区域推荐。", "このブラウザでは端末AIを実行できません。下のエリア提案は利用できます。"],
  failed: ["기기 AI 추천을 완료하지 못했어요. 모델 다운로드·기기 메모리를 확인해 주세요. 아래 일정은 기본 권역 추천입니다.", "On-device AI could not finish. Check the model download and device memory. The draft below uses the region planner.", "设备AI未完成，请检查下载和内存。下方为基础区域规划。", "端末AIが完了しませんでした。ダウンロードとメモリをご確認ください。下は通常のエリア提案です。"],
  noPlaces: ["마음에 드는 장소를 먼저 저장해 주세요.", "Save some places to start planning.", "请先收藏喜欢的地点。", "まず気になる場所を保存してください。"],
  nightsOnly: ["1박 이상을 선택하면 숙박 권역을 추천해 드려요.", "Choose at least one night for an overnight region plan.", "选择至少一晚以推荐住宿区域。", "1泊以上を選ぶと宿泊エリアを提案します。"],
  noStay: ["이 권역의 숙소를 저장해 주세요", "Save a stay in this region", "请收藏此区域的住宿", "このエリアの宿泊先を保存してください"],
  stay: ["머무르기", "Overnight base", "住宿区域", "宿泊拠点"],
  noStops: ["저장 장소가 부족해요. 이 권역에서 더 찾아보세요.", "More saved places are needed in this region.", "此区域收藏不足，请添加地点。", "保存場所が不足しています。このエリアで追加してください。"],
  browse: ["장소 더 찾기", "Find more places", "查找更多地点", "場所を探す"],
  missing: ["더 저장하면 좋은 유형", "Categories to add", "建议补充类型", "追加したい種類"],
  confirm: ["동행 조건 확인 필요", "Check companion requirements", "需确认同行条件", "同行条件の確認が必要"],
  routeNote: ["좌표가 없는 곳은 권역으로 묶었어요. 영업시간·입장 조건·숙소 예약 가능 여부는 방문 전에 확인해 주세요.", "Places without coordinates are grouped by region. Confirm opening hours, admission and room availability before visiting.", "无坐标地点按区域分组。请确认营业时间、入场条件及住宿空房。", "座標のない場所はエリアでまとめています。営業時間・入場条件・空室は事前にご確認ください。"],
  excluded: ["조건에 맞지 않아 제외", "Excluded by your conditions", "不符合条件已排除", "条件により除外"],
  unassigned: ["다음 일정에 담을 저장 장소", "Saved for another itinerary", "留待下次安排行程", "別の日程に残した保存場所"],
  dayTrip: ["당일", "Day trip", "一日游", "日帰り"],
  nights: ["박", " nights", "晚", "泊"],
  days: ["일", " days", "天", "日"],
  autoTitle: ["찜한 곳으로 자동 일정 만들기", "Build an itinerary from your saved spots", "用收藏自动生成行程", "保存したスポットから自動で日程を作成"],
  autoIntro: ["로그인하면 내 계정에 찜한 장소까지 모아서, 지역·동행 조건에 맞는 일수와 일정을 한 번에 짜 드려요.", "Sign in and we gather the spots saved to your account, then plan the days and route for your region and companion needs in one go.", "登录后将汇总账号中收藏的地点，按区域和同行条件一次性规划天数与行程。", "ログインするとアカウントに保存したスポットも集め、エリアと同行条件に合う日数と日程をまとめて作成します。"],
  autoLogin: ["로그인하고 자동 일정 받기", "Sign in for an automatic itinerary", "登录获取自动行程", "ログインして自動日程を作成"],
  autoButton: ["찜한 곳으로 일정 짜기", "Plan from my saved spots", "用收藏规划行程", "保存したスポットで日程を作る"],
  autoBusy: ["일정을 짜는 중", "Planning", "正在规划", "作成中"],
  autoDone: ["찜한 {count}곳으로 {days}일 일정을 저장했어요. 아래에서 순서를 바꿀 수 있어요.", "Saved a {days}-day itinerary from {count} spots. You can reorder it below.", "已用 {count} 处收藏保存 {days} 天行程，可在下方调整顺序。", "{count}件の保存スポットで{days}日間の日程を保存しました。下で順序を変えられます。"],
  autoEmpty: ["아직 찜한 장소가 없어요. 마음에 드는 곳에 북마크를 눌러 주세요.", "No saved spots yet. Bookmark places you like first.", "还没有收藏的地点，请先点击书签收藏。", "保存したスポットがまだありません。気になる場所をブックマークしてください。"],
  autoFailed: ["일정을 만들지 못했어요. 잠시 후 다시 시도해 주세요.", "The itinerary could not be built. Please try again shortly.", "未能生成行程，请稍后再试。", "日程を作成できませんでした。しばらくしてからお試しください。"],
  autoCloudOff: ["이 환경에서는 로그인을 사용할 수 없어요. 이 기기에 찜한 장소로 아래에서 일정을 짤 수 있어요.", "Sign-in is not available here. You can still plan below from spots saved on this device.", "当前环境无法登录，可使用本机收藏在下方规划行程。", "この環境ではログインできません。この端末の保存スポットで下から日程を作成できます。"],
} as const;

export function recommendationCopy(locale: Locale) {
  const index = ({ ko: 0, en: 1, zh: 2, ja: 3 } as const)[locale];
  return Object.fromEntries(Object.entries(words).map(([key, values]) => [key, values[index]])) as Record<keyof typeof words, string>;
}

export function tripLengthLabel(locale: Locale, days: number) {
  const text = recommendationCopy(locale);
  return days === 1 ? text.dayTrip : `${days - 1}${text.nights} ${days}${text.days}`;
}
