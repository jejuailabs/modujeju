import type { Locale } from "@/lib/types";

const messages = {
  ko: { source: "사진 출처", observed: "원문 확인", unavailable: "사진을 불러오지 못했어요" },
  en: { source: "Photo source", observed: "Page observed", unavailable: "Photo unavailable" },
  zh: { source: "图片来源", observed: "原文查看日期", unavailable: "无法加载图片" },
  ja: { source: "写真の出典", observed: "原文確認日", unavailable: "写真を読み込めませんでした" },
};

export const photoCopy = (locale: Locale) => messages[locale];
