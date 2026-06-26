import type { ClipboardEntry } from "../types";

const pinnedOrder = (item: ClipboardEntry) => item.pinned_order || 0;

export const compareClipboardEntries = (a: ClipboardEntry, b: ClipboardEntry) => {
  if (a.is_pinned !== b.is_pinned) {
    return a.is_pinned ? -1 : 1;
  }

  if (a.is_pinned) {
    const orderDelta = pinnedOrder(b) - pinnedOrder(a);
    if (orderDelta !== 0) return orderDelta;
  }

  const timeDelta = b.timestamp - a.timestamp;
  if (timeDelta !== 0) return timeDelta;

  return b.id - a.id;
};

export const sortClipboardEntries = (items: ClipboardEntry[]) => {
  return [...items].sort(compareClipboardEntries);
};
