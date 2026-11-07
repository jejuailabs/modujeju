import type { Locale } from "../lib/types";

export interface TripMessages {
  localOnly: string;
  storageUnavailable: string;
  recovered: string;
  saved: string;
  save: string;
  unsave: string;
  emptySaved: string;
  emptyDay: string;
  day: string;
  tripDays: string;
  startDate: string;
  noDate: string;
  assign: string;
  remove: string;
  moveUp: string;
  moveDown: string;
  export: string;
  exportHint: string;
  planningHint: string;
  saveLimit: string;
  daysReduced: string;
  unavailablePlaces: string;
  unavailableDay: string;
  noAvailableSaved: string;
}

export const tripMessages: Record<Locale, TripMessages> = {
  ko: {
    localOnly: "저장한 장소와 일정은 이 브라우저에 보관돼요.",
    storageUnavailable:
      "브라우저 저장 공간을 사용할 수 없어 이번 방문 중에만 유지돼요.",
    recovered:
      "이전 저장 정보 일부를 읽지 못해 사용할 수 있는 항목만 복원했어요.",
    saved: "저장됨",
    save: "장소 저장",
    unsave: "저장 해제",
    emptySaved: "마음에 드는 장소를 저장하고 나만의 제주를 모아보세요.",
    emptyDay: "저장한 장소를 이 날에 추가해 보세요.",
    day: "일차",
    tripDays: "여행 일수",
    startDate: "여행 시작일",
    noDate: "날짜 미정",
    assign: "이 날에 추가",
    remove: "일정에서 빼기",
    moveUp: "위로 이동",
    moveDown: "아래로 이동",
    export: "일정 파일 받기",
    exportHint: "선택한 날짜와 장소 순서를 JSON 파일로 저장해요.",
    planningHint:
      "직접 정하는 여행 순서예요. 이동시간과 영업시간은 방문 전에 확인해 주세요.",
    saveLimit: "최대 200곳까지 저장할 수 있어요.",
    daysReduced: "줄인 날짜의 장소는 저장 목록에 그대로 남아요.",
    unavailablePlaces:
      "현재 목록에 없는 저장 장소 {count}곳은 표시하지 않았어요. 저장과 일정 기록은 그대로 남아 있어요.",
    unavailableDay:
      "이 날의 장소 {count}곳은 현재 정보를 표시할 수 없어요. 일정 기록은 유지돼요.",
    noAvailableSaved: "현재 표시할 수 있는 저장 장소가 없어요.",
  },
  en: {
    localOnly: "Saved places and plans stay in this browser.",
    storageUnavailable:
      "Browser storage is unavailable. Your changes will last for this visit only.",
    recovered:
      "Some older saved data could not be read. We restored the usable items.",
    saved: "Saved",
    save: "Save place",
    unsave: "Remove saved place",
    emptySaved: "Save places you like and start collecting your Jeju trip.",
    emptyDay: "Add a saved place to this day.",
    day: "Day",
    tripDays: "Trip length",
    startDate: "Start date",
    noDate: "Dates undecided",
    assign: "Add to this day",
    remove: "Remove from day",
    moveUp: "Move up",
    moveDown: "Move down",
    export: "Download itinerary",
    exportHint: "Save the dates and place order as a JSON file.",
    planningHint:
      "Arrange your own route. Check opening hours and travel times before visiting.",
    saveLimit: "You can save up to 200 places.",
    daysReduced: "Places from removed days remain in your saved list.",
    unavailablePlaces:
      "{count} saved places are missing from the current catalog and are not displayed. Your saved and itinerary records are retained.",
    unavailableDay:
      "Information for {count} places on this day is currently unavailable. Their itinerary records are retained.",
    noAvailableSaved: "No saved places can be displayed right now.",
  },
  zh: {
    localOnly: "收藏的地点和行程保存在当前浏览器中。",
    storageUnavailable: "无法使用浏览器存储，您的修改仅在本次访问期间保留。",
    recovered: "部分旧数据无法读取，已恢复可用内容。",
    saved: "已收藏",
    save: "收藏地点",
    unsave: "取消收藏",
    emptySaved: "收藏喜欢的地点，开始规划您的济州之旅。",
    emptyDay: "将收藏的地点添加到这一天。",
    day: "天",
    tripDays: "旅行天数",
    startDate: "出发日期",
    noDate: "日期待定",
    assign: "添加到这一天",
    remove: "从当天移除",
    moveUp: "上移",
    moveDown: "下移",
    export: "下载行程",
    exportHint: "将日期和地点顺序保存为 JSON 文件。",
    planningHint: "请自行安排路线，并在出发前确认营业时间和交通时间。",
    saveLimit: "最多可收藏 200 个地点。",
    daysReduced: "删减日期中的地点仍保留在收藏列表中。",
    unavailablePlaces:
      "有{count}个收藏地点不在当前目录中，因此未显示。收藏与行程记录仍保留。",
    unavailableDay: "当天有{count}个地点暂时无法显示信息，行程记录仍保留。",
    noAvailableSaved: "目前没有可显示的收藏地点。",
  },
  ja: {
    localOnly: "保存したスポットと旅程は、このブラウザに保管されます。",
    storageUnavailable:
      "ブラウザの保存領域を利用できないため、今回の閲覧中のみ保持されます。",
    recovered:
      "以前の保存情報の一部を読み込めなかったため、利用できる項目のみ復元しました。",
    saved: "保存済み",
    save: "スポットを保存",
    unsave: "保存を解除",
    emptySaved: "気になるスポットを保存して、済州の旅を集めましょう。",
    emptyDay: "保存したスポットをこの日に追加しましょう。",
    day: "日目",
    tripDays: "旅行日数",
    startDate: "出発日",
    noDate: "日付未定",
    assign: "この日に追加",
    remove: "この日から外す",
    moveUp: "上へ移動",
    moveDown: "下へ移動",
    export: "旅程をダウンロード",
    exportHint: "日付とスポットの順序を JSON ファイルに保存します。",
    planningHint:
      "自分で決める訪問順です。出発前に営業時間と移動時間をご確認ください。",
    saveLimit: "最大 200 件まで保存できます。",
    daysReduced: "削除した日のスポットは保存リストに残ります。",
    unavailablePlaces:
      "現在の一覧にない保存スポット{count}件は表示していません。保存と旅程の記録は保持されています。",
    unavailableDay:
      "この日のスポット{count}件は現在情報を表示できません。旅程の記録は保持されています。",
    noAvailableSaved: "現在表示できる保存スポットがありません。",
  },
};
