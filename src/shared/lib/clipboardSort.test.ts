import { describe, expect, it } from "vitest";
import { sortClipboardEntries } from "./clipboardSort";
import type { ClipboardEntry } from "../types";

const entry = (patch: Partial<ClipboardEntry>): ClipboardEntry => ({
  id: patch.id ?? 0,
  content_type: "text",
  content: "",
  source_app: "Test",
  timestamp: patch.timestamp ?? 0,
  preview: "",
  is_pinned: patch.is_pinned ?? false,
  tags: [],
  pinned_order: patch.pinned_order,
  ...patch
});

describe("sortClipboardEntries", () => {
  it("keeps pinned items before ordinary items", () => {
    const sorted = sortClipboardEntries([
      entry({ id: 1, is_pinned: false, timestamp: 300 }),
      entry({ id: 2, is_pinned: true, pinned_order: 1, timestamp: 100 })
    ]);

    expect(sorted.map((item) => item.id)).toEqual([2, 1]);
  });

  it("uses pinned_order before timestamp for pinned items", () => {
    const sorted = sortClipboardEntries([
      entry({ id: 1, is_pinned: true, pinned_order: 1, timestamp: 300 }),
      entry({ id: 2, is_pinned: true, pinned_order: 3, timestamp: 100 })
    ]);

    expect(sorted.map((item) => item.id)).toEqual([2, 1]);
  });

  it("uses timestamp and id as deterministic fallbacks", () => {
    const sorted = sortClipboardEntries([
      entry({ id: 1, timestamp: 100 }),
      entry({ id: 3, timestamp: 200 }),
      entry({ id: 2, timestamp: 200 })
    ]);

    expect(sorted.map((item) => item.id)).toEqual([3, 2, 1]);
  });
});
