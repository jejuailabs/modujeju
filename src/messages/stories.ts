import type { Locale } from "@/lib/types";

export const storyTabs = ["reviews", "visits", "videos"] as const;
export type StoryTab = (typeof storyTabs)[number];

type StoryCopy = {
  nav: string;
  eyebrow: string;
  title: string;
  intro: string;
  tabs: Record<StoryTab, string>;
  tabIntro: Record<StoryTab, string>;
  emptyTitle: Record<StoryTab, string>;
  emptyBody: Record<StoryTab, string>;
  checksTitle: string;
  checks: string[];
};

const messages: Record<Locale, StoryCopy> = {
  ko: {
    nav: "현장 기록",
    eyebrow: "직접 다녀온 기록",
    title: "현장 기록",
    intro: "이용자 후기와 운영진이 직접 다녀온 탐방기, 영상을 한곳에서 봅니다. 모든 기록에는 방문 날짜를 함께 적습니다.",
    tabs: { reviews: "이용 후기", visits: "운영진 탐방기", videos: "탐방 영상" },
    tabIntro: {
      reviews: "아이, 반려견, 어르신과 함께 다녀온 분들이 남긴 후기를 업소별로 모읍니다.",
      visits: "운영진이 업소를 직접 방문해 출입구, 좌석, 화장실, 반려견 공간을 점검한 글입니다.",
      videos: "탐방 과정을 영상으로 보여드립니다. 출입 동선과 좌석을 눈으로 확인할 수 있습니다.",
    },
    emptyTitle: { reviews: "아직 등록된 후기가 없어요", visits: "첫 탐방기를 준비하고 있어요", videos: "첫 탐방 영상을 준비하고 있어요" },
    emptyBody: {
      reviews: "후기 작성은 업소 상세 화면에서 열릴 예정입니다.",
      visits: "탐방기가 올라오면 해당 업소 정보에도 연결됩니다.",
      videos: "영상은 유튜브로 재생되며, 해당 업소 정보에도 연결됩니다.",
    },
    checksTitle: "탐방 때 확인하는 것",
    checks: ["출입구 턱과 경사로", "입식·좌식 좌석", "유아 의자와 수유 공간", "반려견 동반 구역과 체중 기준", "화장실 위치와 주차장에서 입구까지 거리"],
  },
  en: {
    nav: "Field notes",
    eyebrow: "Visited in person",
    title: "Field notes",
    intro: "Visitor reviews, staff visit reports and videos in one place. Every record shows its visit date.",
    tabs: { reviews: "Reviews", visits: "Staff visits", videos: "Videos" },
    tabIntro: {
      reviews: "Reviews from people who visited with children, dogs or older family members, grouped by place.",
      visits: "Staff visit places in person and check entrances, seating, restrooms and dog areas.",
      videos: "Visit videos show entry routes and seating so you can see them for yourself.",
    },
    emptyTitle: { reviews: "No reviews yet", visits: "Our first visit report is on the way", videos: "Our first visit video is on the way" },
    emptyBody: {
      reviews: "Writing reviews will open on each place's detail page.",
      visits: "Visit reports will also link to the place's details.",
      videos: "Videos play from YouTube and will link to the place's details.",
    },
    checksTitle: "What we check on a visit",
    checks: ["Entrance steps and ramps", "Chair or floor seating", "High chairs and nursing space", "Dog areas and weight limits", "Restroom location and distance from parking"],
  },
  zh: {
    nav: "实地记录",
    eyebrow: "亲自到访的记录",
    title: "实地记录",
    intro: "在这里集中查看用户评价、运营团队探访记和视频。所有记录都会标注到访日期。",
    tabs: { reviews: "用户评价", visits: "运营团队探访记", videos: "探访视频" },
    tabIntro: {
      reviews: "按店铺汇总带孩子、宠物犬或长辈到访的用户评价。",
      visits: "运营团队亲自到访，检查入口、座位、卫生间和宠物区域。",
      videos: "用视频展示探访过程，可直接查看入口动线和座位。",
    },
    emptyTitle: { reviews: "暂无评价", visits: "第一篇探访记正在准备中", videos: "第一支探访视频正在准备中" },
    emptyBody: {
      reviews: "评价功能将在店铺详情页开放。",
      visits: "探访记发布后也会链接到相应店铺信息。",
      videos: "视频通过 YouTube 播放，并链接到相应店铺信息。",
    },
    checksTitle: "探访时检查的项目",
    checks: ["入口台阶与坡道", "椅子座位或席地座位", "儿童餐椅与哺乳空间", "宠物同行区域与体重标准", "卫生间位置与停车场到入口的距离"],
  },
  ja: {
    nav: "現地レポート",
    eyebrow: "実際に訪れた記録",
    title: "現地レポート",
    intro: "利用者のレビュー、運営スタッフの訪問記、動画をまとめて見られます。すべての記録に訪問日を記載します。",
    tabs: { reviews: "レビュー", visits: "スタッフ訪問記", videos: "訪問動画" },
    tabIntro: {
      reviews: "子ども、犬、高齢の家族と訪れた方のレビューを店舗ごとにまとめます。",
      visits: "運営スタッフが店舗を訪れ、入口、座席、トイレ、犬の同伴エリアを確認した記録です。",
      videos: "訪問の様子を動画で紹介します。入口の動線や座席を目で確かめられます。",
    },
    emptyTitle: { reviews: "まだレビューはありません", visits: "最初の訪問記を準備しています", videos: "最初の訪問動画を準備しています" },
    emptyBody: {
      reviews: "レビューの投稿は各店舗の詳細画面で始まる予定です。",
      visits: "訪問記が公開されると、その店舗の情報にもリンクされます。",
      videos: "動画は YouTube で再生され、その店舗の情報にもリンクされます。",
    },
    checksTitle: "訪問時に確認すること",
    checks: ["入口の段差とスロープ", "椅子席・座敷席", "ベビーチェアと授乳スペース", "犬の同伴エリアと体重基準", "トイレの場所と駐車場から入口までの距離"],
  },
};

export const storyCopy = (locale: Locale) => messages[locale];
