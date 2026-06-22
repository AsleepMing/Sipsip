import { describe, expect, it } from "vitest";
import { buildGetClipboardHistoryParams } from "./historyFetchParams";

describe("buildGetClipboardHistoryParams", () => {
  it("uses Tauri camelCase contentType for backend content_type", () => {
    expect(buildGetClipboardHistoryParams(51, 0, "rich_text")).toEqual({
      limit: 51,
      offset: 0,
      contentType: "rich_text"
    });
  });

  it("omits contentType when all types are requested", () => {
    expect(buildGetClipboardHistoryParams(51, 25, null)).toEqual({
      limit: 51,
      offset: 25,
      contentType: undefined
    });
  });
});

