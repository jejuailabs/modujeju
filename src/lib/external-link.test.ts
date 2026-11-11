import { describe, expect, it } from "vitest";
import { isVisitJejuUrl, visibleSourceLink } from "./external-link";

describe("external source links", () => {
  it("hides VisitJeju hosts and keeps other https sources", () => {
    expect(isVisitJejuUrl("https://www.visitjeju.net/kr/detail/view?contentsid=X")).toBe(true);
    expect(isVisitJejuUrl("https://visitjeju.net.evil.example/")).toBe(false);
    expect(visibleSourceLink("https://www.visitjeju.net/kr/detail/view?contentsid=X")).toBeNull();
    expect(visibleSourceLink("https://example.org/page")).toBe("https://example.org/page");
    expect(visibleSourceLink("http://example.org/")).toBeNull();
    expect(visibleSourceLink(undefined)).toBeNull();
  });
});
