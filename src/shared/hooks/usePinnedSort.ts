import { useCallback, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { Dispatch, SetStateAction } from "react";
import type { ClipboardEntry } from "../types";
import { sortClipboardEntries } from "../lib/clipboardSort";

interface UsePinnedSortOptions {
  filteredHistory: ClipboardEntry[];
  history: ClipboardEntry[];
  setHistory: Dispatch<SetStateAction<ClipboardEntry[]>>;
}

export const usePinnedSort = ({
  filteredHistory,
  history,
  setHistory
}: UsePinnedSortOptions) => {
  const { pinnedItems, unpinnedItems } = useMemo(() => {
    return {
      pinnedItems: filteredHistory.filter((item) => item.is_pinned),
      unpinnedItems: filteredHistory.filter((item) => !item.is_pinned)
    };
  }, [filteredHistory]);

  const handlePinnedReorder = useCallback(
    async (newOrderIds: number[]) => {
      const orderMap = new Map<number, number>();
      newOrderIds.forEach((id, index) => {
        orderMap.set(id, newOrderIds.length - index);
      });

      const nextHistory = sortClipboardEntries(history.map((item) => {
        const nextOrder = orderMap.get(item.id);
        if (nextOrder !== undefined) {
          return { ...item, pinned_order: nextOrder };
        }
        return item;
      }));

      setHistory(nextHistory);

      const dbOrders = newOrderIds.map((id, index) => [id, newOrderIds.length - index]);
      invoke("update_pinned_order", { orders: dbOrders }).catch(console.error);
    },
    [history, setHistory]
  );

  return {
    pinnedItems,
    unpinnedItems,
    handlePinnedReorder
  };
};

